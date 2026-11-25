import { Global, Module } from '@nestjs/common';
import { ServerErrorMonitor } from './server-error-monitor.service';
import { StructuredLoggerService } from './structured-logger.service';

@Global()
@Module({
  providers: [StructuredLoggerService, ServerErrorMonitor],
  exports: [StructuredLoggerService, ServerErrorMonitor],
})
export class LoggerModule {}
