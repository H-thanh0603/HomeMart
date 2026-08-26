import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/auth.decorators';
import { PrismaService } from '../../infra/prisma.service';
import { RedisService } from '../../infra/redis.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Public()
  @Get()
  async check() {
    const [db, redis] = await Promise.all([
      this.prisma.$queryRaw`SELECT 1`.then(() => 'up').catch(() => 'down'),
      this.redis.client.status === 'ready'
        ? Promise.resolve('up')
        : this.redis.client.status === 'connecting'
          ? Promise.resolve('starting')
          : Promise.resolve('down'),
    ]);
    const healthy = db === 'up';
    return {
      status: healthy ? 'ok' : 'degraded',
      services: { api: 'up', db, redis },
      timestamp: new Date().toISOString(),
    };
  }
}
