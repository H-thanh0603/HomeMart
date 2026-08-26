import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboardStats() {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayRevenue, monthRevenue, totalOrders, pendingOrders, totalCustomers, totalProducts] =
      await this.prisma.$transaction([
        this.prisma.order.aggregate({
          where: { createdAt: { gte: startOfDay }, status: { notIn: ['CANCELLED'] }, deletedAt: null },
          _sum: { totalAmount: true },
        }),
        this.prisma.order.aggregate({
          where: { createdAt: { gte: startOfMonth }, status: { notIn: ['CANCELLED'] }, deletedAt: null },
          _sum: { totalAmount: true },
        }),
        this.prisma.order.count({ where: { deletedAt: null } }),
        this.prisma.order.count({ where: { deletedAt: null, status: 'PENDING' } }),
        this.prisma.user.count({ where: { role: 'CUSTOMER', deletedAt: null } }),
        this.prisma.product.count({ where: { deletedAt: null } }),
      ]);

    const lowStock = await this.prisma.inventory.findMany({
      where: { availableStock: { lte: 5 } },
      take: 20,
      include: {
        product: { select: { id: true, name: true, sku: true, slug: true } },
        variant: { select: { sku: true, attributes: true } },
      },
    });

    const topProducts = await this.prisma.product.findMany({
      where: { deletedAt: null },
      orderBy: { soldCount: 'desc' },
      take: 10,
      select: { id: true, name: true, slug: true, soldCount: true, price: true },
    });

    const recentOrders = await this.prisma.order.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true, orderNumber: true, contactName: true, totalAmount: true,
        status: true, createdAt: true,
      },
    });

    return {
      todayRevenue: todayRevenue._sum.totalAmount ?? 0,
      monthRevenue: monthRevenue._sum.totalAmount ?? 0,
      totalOrders,
      pendingOrders,
      totalCustomers,
      totalProducts,
      lowStockCount: lowStock.length,
      lowStock,
      topProducts,
      recentOrders,
    };
  }

  /** Revenue grouped by day/month for charts. */
  async revenueReport(from: string, to: string, groupBy: 'day' | 'month') {
    const fmt = groupBy === 'month'
      ? `date_trunc('month', "createdAt")`
      : `date_trunc('day', "createdAt")`;
    const rows = await this.prisma.$queryRaw<{ period: Date; revenue: bigint; orders: bigint }[]>`
      SELECT ${fmt} AS period,
             SUM("totalAmount")::bigint AS revenue,
             COUNT(*)::bigint AS orders
      FROM orders
      WHERE "createdAt" BETWEEN ${new Date(from)} AND ${new Date(to)}
        AND status NOT IN ('CANCELLED') AND "deletedAt" IS NULL
      GROUP BY 1 ORDER BY 1`;
    return rows.map((r) => ({
      period: r.period.toISOString().slice(0, groupBy === 'month' ? 7 : 10),
      revenue: Number(r.revenue),
      orders: Number(r.orders),
    }));
  }

  async topCategories(from: string, to: string) {
    const rows = await this.prisma.$queryRaw<{ name: string; revenue: bigint; units: bigint }[]>`
      SELECT c.name, SUM(oi."lineTotal")::bigint AS revenue, SUM(oi.quantity)::bigint AS units
      FROM order_items oi
      JOIN orders o ON o.id = oi."orderId"
      JOIN products p ON p.id = oi."productId"
      JOIN categories c ON c.id = p."categoryId"
      WHERE o."createdAt" BETWEEN ${new Date(from)} AND ${new Date(to)}
        AND o.status NOT IN ('CANCELLED')
      GROUP BY c.name ORDER BY revenue DESC LIMIT 10`;
    return rows.map((r) => ({ name: r.name, revenue: Number(r.revenue), units: Number(r.units) }));
  }

  productInventory(productId: string) {
    return this.prisma.inventory.findMany({
      where: { productId },
      include: { variant: true },
    });
  }

  async getAuditLogs(page = 1, limit = 50) {
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count(),
    ]);
    return { items, total, page, limit };
  }
}
