import { Controller, Get, Header } from '@nestjs/common';
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

  @Public()
  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4')
  async metrics() {
    if (process.env.METRICS_ENABLED !== 'true' && process.env.METRICS_ENABLED !== '1') {
      return '# metrics disabled — set METRICS_ENABLED=true\n';
    }
    const mem = process.memoryUsage();
    const uptime = process.uptime();
    return [
      `# HELP homemart_uptime_seconds Process uptime`,
      `# TYPE homemart_uptime_seconds gauge`,
      `homemart_uptime_seconds ${uptime.toFixed(0)}`,
      `# HELP homemart_memory_rss_bytes RSS memory`,
      `# TYPE homemart_memory_rss_bytes gauge`,
      `homemart_memory_rss_bytes ${mem.rss}`,
      `homemart_memory_heap_used_bytes ${mem.heapUsed}`,
      `homemart_memory_heap_total_bytes ${mem.heapTotal}`,
      `homemart_memory_external_bytes ${mem.external}`,
    ].join('\n') + '\n';
  }
}
