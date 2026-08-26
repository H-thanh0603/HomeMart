import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import * as nodemailer from 'nodemailer';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationListeners {
  private readonly logger = new Logger(NotificationListeners.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly notifications: NotificationsService) {
    if (process.env.SMTP_HOST) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 1025),
        secure: false,
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
      });
    }
  }

  private async email(to: string, subject: string, text: string) {
    if (!this.transporter) {
      this.logger.log(`[dev-mail] To:${to} Subject:${subject}`);
      return;
    }
    await this.transporter.sendMail({
      from: process.env.MAIL_FROM ?? 'no-reply@homemart.local',
      to,
      subject,
      text,
    }).catch((e: Error) => this.logger.warn(`Mail failed: ${e.message}`));
  }

  private orderUrl(orderId: string) {
    return `${process.env.WEB_URL ?? 'http://localhost:3000'}/account/orders/${orderId}`;
  }

  @OnEvent('order.created')
  async onOrderCreated(p: { orderId: string; userId: string; orderNumber: string; total: number }) {
    await this.notifications.push(
      p.userId, 'ORDER_CREATED', 'Đặt hàng thành công',
      `Đơn hàng ${p.orderNumber} đã được tạo. Tổng: ${p.total.toLocaleString('vi-VN')}₫`,
      { orderId: p.orderId },
    );
  }

  @OnEvent('payment.succeeded')
  async onPaymentSucceeded(p: { orderId: string; userId: string; orderNumber: string }) {
    await this.notifications.push(
      p.userId, 'PAYMENT_SUCCESS', 'Thanh toán thành công',
      `Đơn ${p.orderNumber} đã được xác nhận. Cảm ơn bạn đã mua hàng tại HomeMart!`,
      { orderId: p.orderId },
    );
  }

  @OnEvent('order.shipped')
  async onOrderShipped(p: { orderId: string; userId: string; trackingCode?: string }) {
    await this.notifications.push(
      p.userId, 'ORDER_SHIPPED', 'Đơn hàng đang được giao',
      p.trackingCode ? `Mã vận đơn: ${p.trackingCode}` : 'Đơn hàng của bạn đã được bàn giao đơn vị vận chuyển',
      { orderId: p.orderId },
    );
  }

  @OnEvent('order.delivered')
  async onDelivered(p: { orderId: string; userId: string }) {
    await this.notifications.push(
      p.userId, 'ORDER_DELIVERED', 'Giao hàng thành công',
      'Đừng quên đánh giá sản phẩm để nhận ưu đãi lần sau!',
      { orderId: p.orderId },
    );
  }

  @OnEvent('order.cancelled')
  async onCancelled(p: { orderId: string; userId: string; reason?: string }) {
    await this.notifications.push(
      p.userId, 'ORDER_CANCELLED', 'Đơn hàng đã bị hủy',
      p.reason ? `Lý do: ${p.reason}` : 'Đơn hàng đã hủy theo yêu cầu',
      { orderId: p.orderId },
    );
  }

  @OnEvent('refund.succeeded')
  async onRefund(p: { orderId: string; userId: string }) {
    await this.notifications.push(
      p.userId, 'REFUND_SUCCESS', 'Hoàn tiền thành công',
      'Tiền sẽ được hoàn về tài khoản trong 3-5 ngày làm việc',
      { orderId: p.orderId },
    );
  }

  @OnEvent('promotion.created')
  async onPromotion(p: { title: string; body: string }) {
    await this.notifications.broadcast('PROMOTION', p.title, p.body);
  }
}
