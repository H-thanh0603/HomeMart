import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async push(userId: string, type: string, title: string, body: string, data?: Record<string, unknown>) {
    await this.prisma.notification.create({
      data: { userId, type: type as never, title, body, data: data as object | undefined },
    });
    this.logger.log(`Notification [${type}] → user ${userId}: ${title}`);
  }

  /** Fan-out to all active users (promotions). Batched to limit memory. */
  async broadcast(type: string, title: string, body: string) {
    const users = await this.prisma.user.findMany({
      where: { status: 'ACTIVE', deletedAt: null },
      select: { id: true },
    });
    for (const u of users) {
      await this.push(u.id, type, title, body);
    }
    return { sent: users.length };
  }

  listMine(userId: string, page = 1, limit = 20) {
    return this.prisma.$transaction([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]).then(([items, total]) => ({ items, total, page, limit }));
  }

  markRead(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { readAt: new Date() },
    });
  }

  markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }
}
