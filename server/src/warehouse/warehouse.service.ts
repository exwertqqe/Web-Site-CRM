import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryAction } from '@prisma/client';
import { EventEmitter } from 'events';

@Injectable()
export class WarehouseService {
  private progressEmitter = new EventEmitter();

  constructor(private prisma: PrismaService) {}

  getProgressEmitter() {
    return this.progressEmitter;
  }

  async getSectors() {
    return this.prisma.warehouseSector.findMany({
      include: {
        shelves: {
          include: {
            stocks: {
              include: {
                variant: {
                  include: { product: { include: { category: true } } },
                },
              },
            },
          },
        },
      },
    });
  }

  async createSector(data: { name: string; description?: string }) {
    return this.prisma.warehouseSector.create({ data });
  }

  async deleteSector(id: number) {
    return this.prisma.warehouseSector.delete({ where: { id } });
  }

  async createShelf(data: {
    name: string;
    sectorId: number;
    capacity?: number;
    color?: string;
  }) {
    return this.prisma.warehouseShelf.create({ data });
  }

  async deleteShelf(id: number) {
    return this.prisma.warehouseShelf.delete({ where: { id } });
  }

  async getInventoryLogs() {
    return this.prisma.inventoryLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        variant: { include: { product: true } },
        user: true,
      },
    });
  }

  /**
   * розкидає товари по поличках, враховуючи габарити (великі товари займають більше місця)
   */
  async distributeStock(
    variantId: number,
    quantityToAdd: number,
    reason: string = 'Товар додано',
    userId?: number,
    preloadedShelves?: any[],
  ) {
    if (quantityToAdd <= 0) return [];

    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { product: { include: { category: true } } },
    });

    if (!variant) throw new BadRequestException('Варіант товару не знайдено');

    const isOversized = variant.product.category?.isOversized || false;
    const slotsNeededPerItem = isOversized ? 200 : 1;
    let remainingQuantity = quantityToAdd;

    const placements = [];

    // якщо ми вже завантажили список поличок раніше, використовуємо його, щоб не смикати базу зайвий раз
    const shelves =
      preloadedShelves ||
      (await this.prisma.warehouseShelf.findMany({
        orderBy: [{ sectorId: 'asc' }, { name: 'asc' }],
        include: {
          sector: true,
          stocks: {
            include: {
              variant: {
                include: { product: { include: { category: true } } },
              },
            },
          },
        },
      }));

    for (const shelf of shelves) {
      if (remainingQuantity <= 0) break;

      // рахуємо скільки місця вже зайнято на цій поличці
      let usedSlots = 0;
      for (const st of shelf.stocks) {
        const itemOversized = st.variant.product.category?.isOversized || false;
        usedSlots += st.quantity * (itemOversized ? 200 : 1);
      }

      const availableSlots = shelf.capacity - usedSlots;

      if (availableSlots >= slotsNeededPerItem) {
        const canFitQuantity = Math.floor(availableSlots / slotsNeededPerItem);
        const quantityToPlace = Math.min(canFitQuantity, remainingQuantity);

        if (quantityToPlace > 0) {
          await this.prisma.warehouseStock.upsert({
            where: { shelfId_variantId: { shelfId: shelf.id, variantId } },
            update: { quantity: { increment: quantityToPlace } },
            create: { shelfId: shelf.id, variantId, quantity: quantityToPlace },
          });

          // оновлюємо дані в пам'яті, щоб наступний товар бачив актуальне місце
          shelf.stocks.push({
            quantity: quantityToPlace,
            variant: variant,
          });

          await this.prisma.inventoryLog.create({
            data: {
              action: InventoryAction.ADD,
              quantity: quantityToPlace,
              variantId,
              sectorId: shelf.sectorId,
              shelfId: shelf.id,
              userId: userId,
              notes: reason,
            },
          });

          placements.push({
            shelf: { id: shelf.id, name: shelf.name },
            sector: { id: shelf.sectorId, name: shelf.sector.name },
            quantity: quantityToPlace,
            variant: {
              id: variant.id,
              colorName: variant.colorName,
              colorCode: variant.colorCode,
              image:
                variant.images && variant.images.length > 0
                  ? variant.images[0]
                  : null,
            },
          });

          remainingQuantity -= quantityToPlace;
        }
      }
    }

    if (remainingQuantity > 0) {
      this.logger.warn(
        `Insufficient space for ${remainingQuantity} units of variant ${variantId}`,
      );
    }

    return placements;
  }

  /**
   * забирає товар з поличок (коли хтось купив або списали)
   */
  async removeStock(
    variantId: number,
    quantityToRemove: number,
    reason: string = 'Списання/Продаж',
    action: InventoryAction = InventoryAction.REMOVE,
    userId?: number,
  ) {
    if (quantityToRemove <= 0) return [];

    let remainingQuantity = quantityToRemove;
    const removals = [];

    const stocks = await this.prisma.warehouseStock.findMany({
      where: { variantId, quantity: { gt: 0 } },
      include: { shelf: { include: { sector: true } } },
    });

    for (const stock of stocks) {
      if (remainingQuantity <= 0) break;

      const quantityToTake = Math.min(stock.quantity, remainingQuantity);

      await this.prisma.warehouseStock.update({
        where: { id: stock.id },
        data: { quantity: { decrement: quantityToTake } },
      });

      await this.prisma.inventoryLog.create({
        data: {
          action: action,
          quantity: quantityToTake,
          variantId,
          sectorId: stock.shelf.sectorId,
          shelfId: stock.shelfId,
          userId: userId,
          notes: reason,
        },
      });

      removals.push({
        shelf: stock.shelf,
        sector: stock.shelf.sector,
        quantity: quantityToTake,
      });

      remainingQuantity -= quantityToTake;
    }

    return removals;
  }

  /**
   * силоміць перерозподіляє взагалі всі товари, що є в базі (повна перестановка на складі)
   */
  private readonly logger = new Logger(WarehouseService.name);

  async forceDistribution() {
    this.logger.log('Starting force distribution of all stocks...');

    const variants = await this.prisma.productVariant.findMany({
      where: { stock: { gt: 0 } },
    });

    this.logger.log(`Found ${variants.length} variants to redistribute.`);

    // Очищаємо поточне розміщення
    await this.prisma.warehouseStock.deleteMany();
    this.logger.log('Cleared existing warehouse stock placements.');

    // завантажуємо всі полички одним махом, щоб не гальмувати базу
    const shelves = await this.prisma.warehouseShelf.findMany({
      include: {
        sector: true,
        stocks: {
          include: {
            variant: {
              include: { product: { include: { category: true } } },
            },
          },
        },
      },
    });
    this.logger.log(`Preloaded ${shelves.length} shelves for distribution.`);

    let totalPlaced = 0;
    const logDetails = [];

    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      const percent = Math.floor(((i + 1) / variants.length) * 100);

      this.progressEmitter.emit('progress', {
        percent,
        message: `Розподілення: ${i + 1} з ${variants.length} товарів`,
      });

      this.logger.log(
        `[${i + 1}/${variants.length}] Distributing variant ${v.id} (${v.stock} units)...`,
      );

      const placements = await this.distributeStock(
        v.id,
        v.stock,
        'Первинне авто-розподілення',
        undefined,
        shelves,
      );
      const placedForVariant = placements.reduce(
        (sum, p) => sum + p.quantity,
        0,
      );
      totalPlaced += placedForVariant;

      if (placedForVariant > 0) {
        logDetails.push({ variantId: v.id, placed: placedForVariant });
      }
    }

    this.logger.log(
      `Force distribution complete. Total placed: ${totalPlaced}`,
    );
    this.progressEmitter.emit('progress', {
      percent: 100,
      message: 'Розподілення завершено!',
    });

    return {
      message: `Успішно розподілено ${totalPlaced} товарів по стелажах.`,
      details: logDetails,
    };
  }

  async getOrderPlacements(orderId: number) {
    // шукаємо всі записи про продаж, пов'язані з цим замовленням
    const logs = await this.prisma.inventoryLog.findMany({
      where: {
        action: InventoryAction.SALE,
        notes: {
          contains: `Замовлення #${orderId}`,
        },
      },
      include: {
        variant: {
          include: {
            product: true,
          },
        },
      },
    });

    // дістаємо всі сектори та полички, щоб скласти з них зрозумілу карту
    const sectors = await this.prisma.warehouseSector.findMany();
    const shelves = await this.prisma.warehouseShelf.findMany();

    // групуємо все гарненько для фронтенду
    const grouped = [];
    for (const log of logs) {
      if (!log.sectorId || !log.shelfId) continue;

      const sector = sectors.find((s) => s.id === log.sectorId);
      const shelf = shelves.find((s) => s.id === log.shelfId);

      grouped.push({
        productName: `${log.variant.product.name} (${log.variant.colorName})`,
        shelf: shelf
          ? { id: shelf.id, name: shelf.name }
          : { id: 0, name: '?' },
        sector: sector
          ? { id: sector.id, name: sector.name }
          : { id: 0, name: '?' },
        quantity: log.quantity,
        variant: {
          id: log.variantId,
          colorName: log.variant.colorName,
          colorCode: log.variant.colorCode,
          image:
            log.variant.images && log.variant.images.length > 0
              ? log.variant.images[0]
              : null,
        },
      });
    }

    return grouped;
  }
  async logManualChange(
    variantId: number,
    quantity: number,
    notes: string,
    userId?: number,
  ) {
    await this.prisma.inventoryLog.create({
      data: {
        action: InventoryAction.MANUAL_CHANGE,
        quantity,
        variantId,
        userId,
        notes,
      },
    });
  }
}
