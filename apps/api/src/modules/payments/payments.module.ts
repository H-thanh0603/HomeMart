import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentsReconcileService } from './payments-reconcile.service';
import { CodProvider } from './providers/cod.provider';
import { MomoProvider } from './providers/momo.provider';
import { StripeProvider } from './providers/stripe.provider';
import { VnpayProvider } from './providers/vnpay.provider';

@Module({
  imports: [InventoryModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsReconcileService, CodProvider, VnpayProvider, MomoProvider, StripeProvider],
  exports: [PaymentsService, PaymentsReconcileService],
})
export class PaymentsModule {}
