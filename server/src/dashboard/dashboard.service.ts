import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    // 1. Total Sales (Count all non-canceled orders for a broader view during development)
    const salesResult = await this.prisma.order.aggregate({
      _sum: { totalPrice: true },
      where: { status: { not: 'CANCELED' } },
    });
    const totalSales = salesResult._sum.totalPrice
      ? Number(salesResult._sum.totalPrice)
      : 0;

    // 2. Active Orders (new or confirmed)
    const activeOrders = await this.prisma.order.count({
      where: { status: { in: ['NEW', 'CONFIRMED'] } },
    });

    // 3. Total Products
    const totalProducts = await this.prisma.product.count();

    // 4. New Customers (users with role USER)
    const newCustomers = await this.prisma.user.count({
      where: { role: 'USER' },
    });

    // 5. Recent Orders (last 5)
    const recentOrders = await this.prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        totalPrice: true,
        status: true,
        createdAt: true,
      },
    });

    // 6. Monthly Sales Data (last 6 months)
    const monthsData = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      monthsData.push({
        month: date.toLocaleString('uk-UA', { month: 'short' }),
        start: new Date(date.getFullYear(), date.getMonth(), 1),
        end: new Date(date.getFullYear(), date.getMonth() + 1, 0),
      });
    }

    const monthlySales = await Promise.all(
      monthsData.map(async (m) => {
        const result = await this.prisma.order.aggregate({
          _sum: { totalPrice: true },
          where: {
            createdAt: { gte: m.start, lte: m.end },
            status: { not: 'CANCELED' },
          },
        });
        return {
          date: m.start.toISOString(),
          total: result._sum.totalPrice ? Number(result._sum.totalPrice) : 0,
        };
      }),
    );

    // 7. Category Stats (Sales by category)
    const categories = await this.prisma.category.findMany({
      include: {
        products: {
          select: {
            orderItems: {
              where: {
                order: { status: { not: 'CANCELED' } },
              },
            },
          },
        },
      },
    });

    const categoryStats = categories
      .map((cat) => {
        const salesCount = cat.products.reduce(
          (acc, prod) => acc + prod.orderItems.length,
          0,
        );
        return {
          name: cat.name,
          value: salesCount,
        };
      })
      .filter((cat) => cat.value > 0);

    // 8. Top 5 Best-Selling Products
    const topProductsRaw = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      where: {
        order: { status: { not: 'CANCELED' } },
      },
      orderBy: {
        _sum: { quantity: 'desc' },
      },
      take: 10,
    });

    const topProducts = (
      await Promise.all(
        topProductsRaw.map(async (item) => {
          const product = await this.prisma.product.findUnique({
            where: { id: item.productId },
            select: {
              id: true,
              name: true,
              price: true,
              variants: {
                take: 1,
                select: { images: true },
              },
            },
          });
          if (!product) return null;
          return {
            id: product.id,
            name: product.name,
            price: Number(product.price),
            salesCount: item._sum.quantity,
            image: product.variants[0]?.images[0] || null,
          };
        }),
      )
    ).filter((p) => p !== null);

    // 9. Average Order Value (AOV)
    const aovResult = await this.prisma.order.aggregate({
      _avg: { totalPrice: true },
      where: { status: { not: 'CANCELED' } },
    });
    const averageOrderValue = aovResult._avg.totalPrice
      ? Number(aovResult._avg.totalPrice)
      : 0;

    // 10. Cancellation Rate & Order Counts
    const totalOrders = await this.prisma.order.count();
    const cancelledOrders = await this.prisma.order.count({
      where: { status: 'CANCELED' },
    });
    const warrantyClaims = await this.prisma.order.count({
      where: { status: 'WARRANTY_CLAIM' },
    });
    const cancellationRate =
      totalOrders > 0 ? Math.round((cancelledOrders / totalOrders) * 100) : 0;
    const cancellationCount = cancelledOrders;
    const warrantyClaimsCount = warrantyClaims;
    const warrantyRate =
      totalOrders > 0 ? Math.round((warrantyClaims / totalOrders) * 100) : 0;
    const totalOrdersCount = totalOrders;

    // Orders placed this calendar month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const ordersThisMonth = await this.prisma.order.count({
      where: { createdAt: { gte: monthStart } },
    });

    // 11. Low Stock Products (stock <= 20)
    const LOW_STOCK_THRESHOLD = 20;
    const totalLowStockCount = await this.prisma.productVariant.count({
      where: { stock: { lte: LOW_STOCK_THRESHOLD } },
    });

    const lowStockVariants = await this.prisma.productVariant.findMany({
      where: { stock: { lte: LOW_STOCK_THRESHOLD } },
      select: {
        id: true,
        colorName: true,
        stock: true,
        images: true,
        product: { select: { id: true, name: true } },
      },
      orderBy: { stock: 'asc' },
      take: 100, // Increased limit to show more in modal
    });
    const lowStockCount = totalLowStockCount;
    const lowStockProducts = lowStockVariants.map((v) => ({
      variantId: v.id,
      productId: v.product.id,
      productName: v.product.name,
      colorName: v.colorName,
      stock: v.stock,
      image: v.images[0] || null,
    }));

    // 12. New Chart Data (Orders by status, funnel, last 7 days)
    const statusGroups = await this.prisma.order.groupBy({
      by: ['status'],
      _count: { id: true },
    });
    const ordersByStatus = statusGroups.map((g) => ({
      name: g.status,
      value: g._count.id,
    }));

    const ordersLast7Days = await Promise.all(
      Array.from({ length: 7 }).map(async (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        date.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setDate(end.getDate() + 1);

        const count = await this.prisma.order.count({
          where: {
            createdAt: { gte: date, lt: end },
          },
        });

        return {
          date: date.toISOString(),
          value: count,
        };
      }),
    );

    return {
      totalSales,
      activeOrders,
      totalProducts,
      newCustomers,
      recentOrders,
      monthlySales,
      categoryStats,
      topProducts,
      averageOrderValue,
      cancellationRate,
      cancellationCount,
      warrantyClaimsCount,
      warrantyRate,
      totalOrdersCount,
      ordersThisMonth,
      lowStockCount,
      lowStockProducts,
      ordersByStatus,
      ordersLast7Days,
    };
  }
}
