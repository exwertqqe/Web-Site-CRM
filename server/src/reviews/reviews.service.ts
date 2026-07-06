import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async create(
    productId: number,
    data: { rating: number; comment: string; userName: string },
  ) {
    return this.prisma.review.create({
      data: {
        productId,
        rating: data.rating,
        comment: data.comment,
        userName: data.userName,
      },
    });
  }

  async findByProduct(productId: number) {
    return this.prisma.review.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll() {
    return this.prisma.review.findMany({
      include: {
        product: {
          include: {
            variants: {
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(id: number) {
    return this.prisma.review.delete({
      where: { id },
    });
  }
}
