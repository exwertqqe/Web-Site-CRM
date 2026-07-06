import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WarehouseService } from '../warehouse/warehouse.service';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private warehouseService: WarehouseService,
  ) {}

  async create(data: any) {
    try {
      const product = await this.prisma.product.create({
        data: {
          name: data.name,
          slug: data.slug,
          description: data.description,
          price: data.price,
          categoryId: Number(data.categoryId),
          attributes: data.attributes || {},
          variants: data.variants
            ? {
                create: data.variants.map((v: any) => ({
                  colorName: v.colorName,
                  colorCode: v.colorCode,
                  images: v.images,
                  stock: v.stock || 0,
                })),
              }
            : undefined,
        },
        include: {
          category: true,
          variants: true,
        },
      });

      // Розподіляємо по складу
      const allPlacements = [];
      if (product.variants) {
        for (const variant of product.variants) {
          if (variant.stock > 0) {
            const result = await this.warehouseService.distributeStock(
              variant.id,
              variant.stock,
              'Створення товару',
            );
            if (result && result.length > 0) {
              allPlacements.push(...result);
            }
          }
        }
      }

      return { product, placements: allPlacements };
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  }

  findAll() {
    return this.prisma.product.findMany({
      include: {
        category: true,
        variants: true,
      },
    });
  }

  findOne(id: number) {
    return this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        variants: true,
      },
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        variants: true,
        reviews: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async update(id: number, data: any) {
    try {
      // шукаємо старі варіанти, щоб зрозуміти як змінилася кількість на складі
      const oldVariants = await this.prisma.productVariant.findMany({
        where: { productId: id },
      });

      // оновлюємо дані про товар
      const product = await this.prisma.product.update({
        where: { id },
        data: {
          name: data.name,
          slug: data.slug,
          description: data.description,
          price: data.price,
          categoryId: Number(data.categoryId),
          attributes: data.attributes || {},
        },
        include: {
          category: true,
          variants: true,
        },
      });

      // оновлюємо варіанти окремо, щоб не видаляти їх і не ламати замовлення
      const allPlacements = [];
      if (data.variants) {
        for (const v of data.variants) {
          // шукаємо чи є вже такий варіант (за назвою кольору)
          const existingVariant = oldVariants.find(
            (ov) => ov.colorName === v.colorName,
          );

          let updatedVariant;
          if (existingVariant) {
            const oldStock = existingVariant.stock;
            const newStock = v.stock || 0;
            const diff = newStock - oldStock;

            updatedVariant = await this.prisma.productVariant.update({
              where: { id: existingVariant.id },
              data: {
                colorCode: v.colorCode,
                images: v.images,
                stock: newStock,
              },
            });

            // логуємо зміну на складі якщо вона була
            if (diff !== 0) {
              await this.warehouseService.logManualChange(
                updatedVariant.id,
                Math.abs(diff),
                `Оновлення товару: ${oldStock} -> ${newStock}`,
              );

              if (diff > 0) {
                const res = await this.warehouseService.distributeStock(
                  updatedVariant.id,
                  diff,
                  'Оновлення (додавання)',
                );
                if (res) allPlacements.push(...res);
              } else {
                await this.warehouseService.removeStock(
                  updatedVariant.id,
                  Math.abs(diff),
                  'Оновлення (зменшення)',
                );
              }
            }
          } else {
            // якщо це зовсім новий колір — створюємо його
            updatedVariant = await this.prisma.productVariant.create({
              data: {
                productId: id,
                colorName: v.colorName,
                colorCode: v.colorCode,
                images: v.images,
                stock: v.stock || 0,
              },
            });

            if (updatedVariant.stock > 0) {
              const res = await this.warehouseService.distributeStock(
                updatedVariant.id,
                updatedVariant.stock,
                'Новий варіант',
              );
              if (res) allPlacements.push(...res);
            }
          }
        }
      }

      return { product, placements: allPlacements };
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  remove(id: number) {
    return this.prisma.product.delete({
      where: { id },
    });
  }
}
