import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { getEnv } from './config/env';
import { buildPinoConfig } from './infra/logger.config';
import { RateLimitGuard, setGlobalRateLimit } from './common/guards/rate-limit.guard';
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

// Global default: requests/phút/IP — nâng qua RATE_LIMIT_PER_MIN khi sale
// (per-endpoint override bằng @SetMetadata(RATE_LIMIT_KEY, {limit})).
setGlobalRateLimit(getEnv().RATE_LIMIT_PER_MIN);

@Module({
  imports: [
    LoggerModule.forRoot(buildPinoConfig()),
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
    // Global guards: rate limit (Redis INCR, fail-open khi Redis chết) →
    // JWT auth (unless @Public) → RBAC
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    // Envelope response + audit logging
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
