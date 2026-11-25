import { Injectable, Optional } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { StructuredLoggerService } from '../../../shared/infrastructure/logging/structured-logger.service';
import {
  AssessmentSeedTemplate,
  CAPACITY_TOOL_TEMPLATE,
  ORGANIZATIONAL_TOOL_TEMPLATE,
  RISK_TOOL_TEMPLATE,
} from '../domain/tool-templates';

export interface ProvisionedTemplate {
  tool: string;
  sections: number;
  indicators: number;
}

@Injectable()
export class OrganisationProvisioningService {
  private readonly templates: AssessmentSeedTemplate[] = [
    ORGANIZATIONAL_TOOL_TEMPLATE,
    CAPACITY_TOOL_TEMPLATE,
    RISK_TOOL_TEMPLATE,
  ];

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly logger?: StructuredLoggerService,
  ) {
    this.logger?.setContext({ service: 'OrganisationProvisioningService' });
  }

  async provision(organisation: string): Promise<ProvisionedTemplate[]> {
    const result: ProvisionedTemplate[] = [];
    for (const template of this.templates) {
      result.push(await this.provisionTemplate(organisation, template));
    }
    this.logger?.info('organisation provisioned', {
      organisation,
      templates: result,
    });
    return result;
  }

  private async provisionTemplate(
    organisation: string,
    seed: AssessmentSeedTemplate,
  ): Promise<ProvisionedTemplate> {
    const riskThreshold =
      seed.riskThreshold !== undefined
        ? new Prisma.Decimal(seed.riskThreshold)
        : undefined;
    const common = {
      name: seed.name,
      description: seed.description,
      labels: (seed.labels as Prisma.InputJsonValue) ?? undefined,
      riskThreshold,
    };

    const template = await this.prisma.assessmentTemplate.upsert({
      where: {
        organisation_tool_version: {
          organisation,
          tool: seed.tool,
          version: 1,
        },
      },
      update: common,
      create: { organisation, tool: seed.tool, version: 1, ...common },
    });

    for (const [country, params] of Object.entries(
      seed.countryRiskParams ?? {},
    )) {
      await this.prisma.assessmentRiskCountryParam.upsert({
        where: { organisation_country: { organisation, country } },
        update: {},
        create: {
          organisation,
          country,
          riskThreshold: new Prisma.Decimal(params.riskThreshold),
        },
      });
    }

    let indicators = 0;
    for (const section of seed.sections) {
      const dbSection = await this.prisma.assessmentSection.upsert({
        where: {
          templateId_number: {
            templateId: template.id,
            number: section.number,
          },
        },
        update: {
          name: section.name,
          description: section.description,
          weight: new Prisma.Decimal(section.weight),
        },
        create: {
          templateId: template.id,
          number: section.number,
          name: section.name,
          description: section.description,
          weight: new Prisma.Decimal(section.weight),
          sortOrder: section.number,
        },
      });

      for (const [index, indicator] of section.indicators.entries()) {
        await this.prisma.assessmentIndicator.upsert({
          where: {
            sectionId_code: { sectionId: dbSection.id, code: indicator.code },
          },
          update: {
            name: indicator.name,
            description: indicator.description,
            helpText: indicator.helpText,
            scoringRubric: indicator.scoringRubric,
            weight: new Prisma.Decimal(indicator.weight),
          },
          create: {
            sectionId: dbSection.id,
            code: indicator.code,
            name: indicator.name,
            description: indicator.description,
            helpText: indicator.helpText,
            scoringRubric: indicator.scoringRubric,
            weight: new Prisma.Decimal(indicator.weight),
            sortOrder: index,
          },
        });
        indicators += 1;
      }
    }

    return { tool: seed.tool, sections: seed.sections.length, indicators };
  }
}
