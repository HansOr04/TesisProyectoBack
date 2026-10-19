import { Injectable } from '@nestjs/common';
import {
  buildFormattedWorkbook,
  ExcelColumn,
} from '../../../shared/infrastructure/reports/excel-cell.util';
import {
  AssessmentDashboardRow,
  AssessmentDashboardToolSummary,
} from '../application/assessment-dashboard.service';

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Borrador',
  IN_PROGRESS: 'En progreso',
  COMPLETED: 'Completada',
  ARCHIVED: 'Archivada',
};

const TOOLS = [
  ['organizational', 'Organizativa'],
  ['capacity', 'Capacidades'],
  ['risk', 'Riesgos'],
] as const;

function cell(prefix: string, summary: AssessmentDashboardToolSummary | null) {
  return {
    [`${prefix}Status`]: summary
      ? (STATUS_LABEL[summary.status] ?? summary.status)
      : 'Sin evaluar',
    [`${prefix}Score`]: summary?.globalScore ?? '—',
    [`${prefix}Alerts`]: summary ? summary.criticalAlertCount : '—',
  };
}

// F6-B02: exportable equivalente al informe consolidado del Excel original
// — una fila por organización, con el estado/puntaje/alertas de las 3
// herramientas lado a lado (mismo dato que ve la tabla del dashboard).
@Injectable()
export class AssessmentDashboardExportService {
  async buildWorkbook(rows: AssessmentDashboardRow[]) {
    const sheetRows = [...rows]
      .sort((a, b) => a.profile.name.localeCompare(b.profile.name, 'es'))
      .map((row) => ({
        organization: row.profile.name,
        country: row.profile.country,
        region: row.profile.region ?? '',
        product: row.profile.mainProduct,
        ...cell('organizational', row.organizational),
        ...cell('capacity', row.capacity),
        ...cell('risk', row.risk),
        alerts: row.criticalAlertCount,
      }));

    const toolColumns: ExcelColumn[] = TOOLS.flatMap(([key, label]) => [
      { header: `${label}: estado`, key: `${key}Status`, width: 14 },
      {
        header: `${label}: puntaje`,
        key: `${key}Score`,
        width: 13,
        kind: 'score',
      },
      {
        header: `${label}: alertas`,
        key: `${key}Alerts`,
        width: 12,
        kind: 'number',
      },
    ]);

    const date = new Date().toLocaleDateString('es-EC', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    const data = await buildFormattedWorkbook([
      {
        name: 'Panel consolidado',
        title: 'Panel consolidado de evaluaciones',
        subtitle: `${sheetRows.length} organizaciones · última evaluación de cada herramienta · generado el ${date}`,
        columns: [
          { header: 'Organización', key: 'organization', width: 38 },
          { header: 'País', key: 'country', width: 14 },
          { header: 'Región', key: 'region', width: 18 },
          { header: 'Producto principal', key: 'product', width: 18 },
          ...toolColumns,
          {
            header: 'Alertas críticas (total)',
            key: 'alerts',
            width: 14,
            kind: 'number',
          },
        ],
        rows: sheetRows,
        emptyText: 'No hay organizaciones que coincidan con los filtros.',
      },
    ]);

    return {
      filename: `panel-consolidado-assessment-${Date.now()}.xlsx`,
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      data,
    };
  }
}
