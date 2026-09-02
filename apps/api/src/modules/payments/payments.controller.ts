import { BadGatewayException, Body, Controller, Get, Param, Post, RawBodyRequest, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { PaymentMethodType } from 'src/generated/prisma/client';
import { CurrentUser, Public } from '../../common/decorators/auth.decorators';
import { getEnv } from '../../config/env';
import { PaymentsService } from './payments.service';
import { VnpayProvider } from './providers/vnpay.provider';
import { MomoProvider } from './providers/momo.provider';
import { StripeProvider } from './providers/stripe.provider';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly momoProvider: MomoProvider,
    private readonly stripeProvider: StripeProvider,
    private readonly vnpayProvider: VnpayProvider,
  ) {}

  @Post('orders/:orderId/create')
  @ApiOperation({ summary: 'Tạo phiên thanh toán cho đơn hàng' })
  createPayment(@CurrentUser('id') userId: string, @Param('orderId') orderId: string, @Req() req: Request) {
    return this.paymentsService.createPayment(userId, orderId, req.ip);
  }

  @Get('orders/:orderId/status')
  status(@CurrentUser('id') userId: string, @Param('orderId') orderId: string) {
    return this.paymentsService.getStatus(userId, orderId);
  }

  // ───────── Webhooks (public — gated by signature verification, not JWT) ─────────

  @Public()
  @Post('webhook/vnpay')
  async vnpayWebhook(@Body() body: Record<string, unknown>) {
    const normalized = await this.vnpayProvider.verifyCallback(body); // signature verified here
    return this.paymentsService.handleWebhook(PaymentMethodType.VNPAY, 'vnpay_ipn', normalized);
  }

  /** MoMo sends JSON — verify HMAC-SHA256 signature before processing. */
  @Public()
  @Post('webhook/momo')
  async momoWebhook(@Body() body: Record<string, unknown>) {
    const normalized = await this.momoProvider.verifyCallback(body); // throws on invalid signature
    return this.paymentsService.handleWebhook(PaymentMethodType.MOMO, 'momo_ipn', normalized);
  }

  /** Stripe requires raw body for signature verification. */
  @Public()
  @Post('webhook/stripe')
  async stripeWebhook(@Req() req: RawBodyRequest<Request>) {
    const signature = req.headers['stripe-signature'] as string | undefined;
    this.verifyStripeSignature(signature, req.rawBody?.toString('utf8') ?? '');
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    return this.stripeProvider.verifyCallback(payload as Record<string, unknown>).then((normalized) =>
      this.paymentsService.handleWebhook(PaymentMethodType.STRIPE, (payload as { type?: string }).type ?? 'stripe_event', normalized),
    );
  }

  private verifyStripeSignature(header: string | undefined, rawBody: string) {
    const secret = getEnv().STRIPE_WEBHOOK_SECRET;
    if (!secret || !header) throw new BadGatewayException('Missing webhook secret or signature');
    const parts = Object.fromEntries(header.split(',').map((kv) => kv.split('=') as [string, string]));
    if (!parts.t || !parts.v1) throw new BadGatewayException('Malformed signature');
    // Replay window: reject events older than 5 minutes
    if (Math.abs(Date.now() / 1000 - Number(parts.t)) > 300) {
      throw new BadGatewayException('Signature timestamp outside tolerance');
    }
    const expected = createHmac('sha256', secret).update(`${parts.t}.${rawBody}`).digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(parts.v1);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new BadGatewayException('Invalid Stripe signature');
  }
}
