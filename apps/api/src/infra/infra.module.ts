import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { RedisService } from './redis.service';
import { AlertsService } from '../common/observability/alerts.service';

@Global()
@Module({
  providers: [PrismaService, RedisService, AlertsService],
  exports: [PrismaService, RedisService, AlertsService],
})
export class InfraModule {}