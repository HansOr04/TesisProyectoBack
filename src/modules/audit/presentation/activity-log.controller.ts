import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequireAuthenticated } from '../../identity/presentation/decorators/auth.decorators';
import {
  AssessmentPermissionGuard,
  RequireAssessmentPermission,
} from '../../assessment-core/presentation/guards/assessment-permission.guard';
import { ActivityLogQueryService } from '../application/activity-log-query.service';
import { ActivityLogQueryDto } from './activity-log.dto';

@ApiTags('Auditoría')
@ApiBearerAuth()
@Controller()
@RequireAuthenticated()
@UseGuards(AssessmentPermissionGuard)
export class ActivityLogController {
  constructor(private readonly logs: ActivityLogQueryService) {}

  // Consulta paginada de la auditoría (administradores de evaluación).
  @Get(':org/activity-logs')
  @RequireAssessmentPermission('assessment-core', 'admin')
  list(@Param('org') org: string, @Query() query: ActivityLogQueryDto) {
    return this.logs.list(org, { ...query, page: query.page ?? 1 });
  }
}
