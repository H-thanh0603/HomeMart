import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AdminShippingController, ShippingController, WebhookController } from './shipping.controller';
import { ShippingService } from './shipping.service';

@Module({
  imports: [EventEmitterModule],
  controllers: [ShippingController, AdminShippingController, WebhookController],
  providers: [ShippingService],
  exports: [ShippingService],
})
export class ShippingModule {}
