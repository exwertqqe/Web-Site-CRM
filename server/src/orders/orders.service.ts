import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { PrismaService } from '../prisma/prisma.service';
import { WarehouseService } from '../warehouse/warehouse.service';
import { InventoryAction } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private warehouseService: WarehouseService,
  ) {}

  async create(createOrderDto: CreateOrderDto) {
    const { items, ...orderData } = createOrderDto;

    // рахуємо загальну суму замовлення
    const totalPrice = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    // використовуємо транзакцію, щоб або все збереглося, або нічого (якщо щось піде не так)
    const newOrder = await this.prisma.$transaction(async (tx) => {
      // 1. перевіряємо чи є товар і списуємо його зі складу в базі
      for (const item of items) {
        if (item.variantId) {
          const variant = await tx.productVariant.findUnique({
            where: { id: item.variantId },
            select: { stock: true, colorName: true },
          });

          if (!variant) {
            throw new Error(`Варіант товару не знайдено`);
          }

          if (variant.stock < item.quantity) {
            throw new Error(
              `Недостатньо товару на складі: ${variant.colorName} (в наявності: ${variant.stock})`,
            );
          }

          // віднімаємо кількість від залишку
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { decrement: item.quantity } },
          });
        }
      }

      // 2. створюємо саме замовлення
      return await tx.order.create({
        data: {
          ...orderData,
          totalPrice,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity,
              price: item.price,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: true,
              variant: true,
            },
          },
        },
      });
    });

    // 3. тепер списуємо товар з фізичного складу (логіка складського обліку)
    for (const item of items) {
      if (item.variantId) {
        await this.warehouseService.removeStock(
          item.variantId,
          item.quantity,
          `Продаж (Замовлення #${newOrder.id})`,
          InventoryAction.SALE,
          newOrder.userId || undefined,
        );
      }
    }

    return newOrder;
  }

  async findAll(query?: string) {
    const where: any = {};

    if (query) {
      where.OR = [
        { firstName: { contains: query, mode: 'insensitive' } },
        { lastName: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        {
          items: {
            some: {
              serialNumber: { contains: query, mode: 'insensitive' },
            },
          },
        },
      ];

      // якщо запит — це число, то пробуємо шукати за ID замовлення
      if (!isNaN(Number(query))) {
        where.OR.push({ id: Number(query) });
      }
    }

    return this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });
  }

  async findAllByUser(userId: number) {
    console.log(
      `[OrdersService] Fetching orders for userId: ${userId} (type: ${typeof userId})`,
    );
    const orders = await this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });
    console.log(
      `[OrdersService] Found ${orders.length} orders for user ${userId}`,
    );
    return orders;
  }

  async findOne(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  async update(id: number, updateOrderDto: UpdateOrderDto) {
    // поки що дозволяємо міняти тільки статус замовлення
    if (updateOrderDto.status) {
      return this.prisma.order.update({
        where: { id },
        data: { status: updateOrderDto.status },
        include: { items: true },
      });
    }
    return this.findOne(id);
  }

  async remove(id: number) {
    // 1. спочатку знаходимо замовлення з усіма товарами
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) throw new NotFoundException('Замовлення не знайдено');

    // 2. повертаємо товар на склад
    for (const item of order.items) {
      if (item.variantId) {
        // повертаємо в базу (ProductVariant)
        await this.prisma.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } },
        });

        // повертаємо фізично на склад
        await this.warehouseService.distributeStock(
          item.variantId,
          item.quantity,
          `Скасування замовлення #${id}`,
          order.userId || undefined,
        );
      }
    }

    // 3. видаляємо всі товари з замовлення (Prisma зазвичай сама це робить при Cascade, але ми перестрахуємось)
    await this.prisma.orderItem.deleteMany({
      where: { orderId: id },
    });

    // 4. видаляємо саме замовлення
    return this.prisma.order.delete({
      where: { id },
    });
  }

  async updateItemWarranty(
    itemId: number,
    dto: { serialNumber: string; warrantyMonths: number },
  ) {
    const item = await this.prisma.orderItem.findUnique({
      where: { id: itemId },
      include: { order: true },
    });

    if (!item) {
      throw new NotFoundException(`Item with ID ${itemId} not found`);
    }

    const warrantyEndDate = new Date();
    warrantyEndDate.setMonth(warrantyEndDate.getMonth() + dto.warrantyMonths);

    return this.prisma.orderItem.update({
      where: { id: itemId },
      data: {
        serialNumber: dto.serialNumber,
        warrantyMonths: dto.warrantyMonths,
        warrantyEndDate: warrantyEndDate,
      },
    });
  }
}
