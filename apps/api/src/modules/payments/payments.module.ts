import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { CodProvider } from './providers/cod.provider';
import { MomoProvider } from './providers/momo.provider';
import { StripeProvider } from './providers/stripe.provider';
import { VnpayProvider } from './providers/vnpay.provider';

@Module({
  imports: [InventoryModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, CodProvider, VnpayProvider, MomoProvider, StripeProvider],
  exports: [PaymentsService],
})
export class PaymentsModule {}
