import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { OrganisationManagementService } from '../application/organisation-management.service';
import { RequestContextService } from '../application/request-context.service';
import {
  RequireAuthenticated,
  RequireGlobalSuperAdmin,
} from './decorators/auth.decorators';
import {
  CreateOrganisationDto,
  UpdateOrganisationDto,
} from './dto/organisation.dto';

/**
 * Administración de organizaciones (inquilinos). Son rutas globales, sin
 * `:org`, así que usan el guard de superadministrador en lugar del de
 * permisos por organización.
 */
@ApiTags('Organizaciones')
@ApiBearerAuth()
@Controller('organisations')
@RequireAuthenticated()
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class OrganisationManagementController {
  constructor(
    private readonly organisations: OrganisationManagementService,
    private readonly requestContext: RequestContextService,
  ) {}

  @Get()
  @RequireGlobalSuperAdmin()
  list() {
    return this.organisations.list();
  }

  @Post()
  @RequireGlobalSuperAdmin()
  async create(@Body() dto: CreateOrganisationDto) {
    const actor = await this.requestContext.requireCurrentUser();
    return this.organisations.create(dto, {
      id: actor.id,
      email: actor.email,
    });
  }

  @Patch(':id')
  @RequireGlobalSuperAdmin()
  async update(@Param('id') id: string, @Body() dto: UpdateOrganisationDto) {
    const actor = await this.requestContext.requireCurrentUser();
    return this.organisations.update(id, dto, { id: actor.id });
  }

  /** Reaplica las plantillas base sobre una organización existente. */
  @Post(':id/provision')
  @RequireGlobalSuperAdmin()
  async reprovision(@Param('id') id: string) {
    const actor = await this.requestContext.requireCurrentUser();
    return {
      templates: await this.organisations.reprovision(id, { id: actor.id }),
    };
  }
}
