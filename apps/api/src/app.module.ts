import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { getEnv } from './config/env';
import { buildPinoConfig } from './infra/logger.config';
import { RedisService } from './infra/redis.service';
import { ResilientThrottlerStorage } from './infra/resilient-throttler.storage';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AuditInterceptor } from './modules/admin/audit.interceptor';
import { AdminController } from './modules/admin/admin.controller';
import { AdminOrdersController } from './modules/admin/admin-orders.controller';
import { AdminInventoryController } from './modules/admin/admin-inventory.controller';
import { AdminService } from './modules/admin/admin.service';
import { InventoryModule } from './modules/inventory/inventory.module';
import { CartModule } from './modules/cart/cart.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { InfraModule } from './infra/infra.module';
import { HealthModule } from './modules/health/health.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PromotionsModule } from './modules/promotions/promotions.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { ShippingModule } from './modules/shipping/shipping.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { UsersModule } from './modules/users/users.module';
import { WishlistModule } from './modules/wishlist/wishlist.module';

@Module({
  imports: [
    LoggerModule.forRoot(buildPinoConfig()),
    ThrottlerModule.forRootAsync({
      inject: [RedisService],
      useFactory: (redis: RedisService) => [
        {
          name: 'default',
          ttl: 60_000,
          limit: getEnv().RATE_LIMIT_PER_MIN, // global — tăng qua RATE_LIMIT_PER_MIN khi sale
          // Redis-backed with in-memory fallback when Redis is down
          storage: new ResilientThrottlerStorage(redis),
        },
      ],
    }),
    InfraModule,
    HealthModule,
    AuthModule,
    UsersModule,
    CatalogModule,
    InventoryModule,
    CartModule,
    WishlistModule,
    OrdersModule,
    PaymentsModule,
    ShippingModule,
    PromotionsModule,
    ReviewsModule,
    NotificationsModule,
    UploadsModule,
  ],
  controllers: [AdminController, AdminOrdersController, AdminInventoryController],
  providers: [
    AdminService,
    // Global guards: throttle (Redis-backed, survives restarts/scale-out),
    // JWT auth on everything (unless @Public), then RBAC
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    // Envelope response + audit logging
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
