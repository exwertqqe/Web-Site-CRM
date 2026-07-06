import { Injectable, ConflictException } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto) {
    const slug = createCategoryDto.name
      .toLowerCase()
      .replace(/ /g, '-')
      .replace(/[^\w-]/g, '');
    try {
      return await this.prisma.category.create({
        data: {
          ...createCategoryDto,
          slug: createCategoryDto.slug || slug,
        },
        include: {
          children: true,
          parent: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Категорія з такою назвою або slug вже існує',
        );
      }
      throw error;
    }
  }

  findAll() {
    return this.prisma.category.findMany({
      include: {
        children: true,
        parent: true,
        _count: {
          select: { products: true },
        },
      },
    });
  }

  findOne(id: number) {
    return this.prisma.category.findUnique({
      where: { id },
      include: {
        children: true,
        parent: true,
        products: true,
      },
    });
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto) {
    try {
      return await this.prisma.category.update({
        where: { id },
        data: updateCategoryDto,
        include: {
          children: true,
          parent: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Категорія з таким параметром slug вже існує',
        );
      }
      throw error;
    }
  }

  async remove(id: number) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Delete all products in this category
      // Products have onDelete: Cascade for variants, reviews, and orderItems in the schema
      await tx.product.deleteMany({
        where: { categoryId: id },
      });

      // 2. Handle children categories (null out parentId to prevent P2003 or delete them)
      // For now, let's delete children too as a full cascade cleanup
      const children = await tx.category.findMany({ where: { parentId: id } });
      for (const child of children) {
        await tx.product.deleteMany({ where: { categoryId: child.id } });
      }
      await tx.category.deleteMany({ where: { parentId: id } });

      // 3. Finally delete the category itself
      return tx.category.delete({
        where: { id },
      });
    });
  }
}
