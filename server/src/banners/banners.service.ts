import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BannersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.banner.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });
  }

  async findAllAdmin() {
    return this.prisma.banner.findMany({
      orderBy: { order: 'asc' },
    });
  }

  async create(data: any) {
    return this.prisma.banner.create({
      data,
    });
  }

  async update(id: number, data: any) {
    return this.prisma.banner.update({
      where: { id },
      data,
    });
  }

  async remove(id: number) {
    return this.prisma.banner.delete({
      where: { id },
    });
  }
}
