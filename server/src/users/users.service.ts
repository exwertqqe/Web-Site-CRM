import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, Role, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findOne(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    // Explicitly set role to USER to prevent privilege escalation during registration
    return this.prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
        role: 'USER',
      },
    });
  }

  async findAllCustomers() {
    const customers = await this.prisma.user.findMany({
      where: {
        role: 'USER',
      },
      include: {
        orders: {
          include: {
            items: {
              include: {
                product: true,
                variant: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return customers.map((customer) => {
      const totalSpent = customer.orders
        .filter((order) => order.status !== 'CANCELED')
        .reduce((sum, order) => sum + Number(order.totalPrice), 0);

      return {
        ...customer,
        totalSpent,
        // Do not expose password
        password: undefined,
      };
    });
  }

  async updateProfile(
    id: number,
    data: { name?: string; email?: string; avatar?: string },
  ) {
    const user = await this.prisma.user.update({
      where: { id },
      data,
    });

    const { password: _, ...result } = user;
    return result;
  }

  async findAllUsers() {
    const users = await this.prisma.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return users.map((user) => {
      const { password: _, ...result } = user;
      return result;
    });
  }

  async updateUserRole(id: number, role: Role) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { role },
    });

    const { password: _, ...result } = user;
    return result;
  }
}
