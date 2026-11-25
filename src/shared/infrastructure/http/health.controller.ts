import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Public } from '../../../modules/identity/presentation/decorators/auth.decorators';
import { PrismaService } from '../database/prisma.service';
import { ServerErrorMonitor } from '../logging/server-error-monitor.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly errors: ServerErrorMonitor,
  ) {}

  @Get()
  @Public()
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('La base de datos no responde');
    }
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      serverErrors: this.errors.snapshot(),
    };
  }
}
