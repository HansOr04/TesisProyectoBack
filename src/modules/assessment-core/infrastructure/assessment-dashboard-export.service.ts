import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import {
  createExcelWorksheetFromJson,
  writeExcelBuffer,
} from '../../../shared/infrastructure/reports/excel-cell.util';
import {
  AssessmentDashboardRow,
  AssessmentDashboardToolSummary,
} from '../application/assessment-dashboard.service';

function cell(summary: AssessmentDashboardToolSummary | null) {
  if (!summary) return { estado: '—', puntaje: '—', alertas: 0 };
  return {
    estado: summary.status,
    puntaje: summary.globalScore ?? '—',
    alertas: summary.criticalAlertCount,
  };
}

// F6-B02: exportable equivalente al informe consolidado del Excel original
// — una fila por organización, con el estado/puntaje/alertas de las 3
// herramientas lado a lado (mismo dato que ve la tabla del dashboard).
@Injectable()
export class AssessmentDashboardExportService {
  async buildWorkbook(rows: AssessmentDashboardRow[]) {
    const sheetRows = rows.map((row) => {
      const organizational = cell(row.organizational);
      const capacity = cell(row.capacity);
      const risk = cell(row.risk);
      return {
        organizacion: row.profile.name,
        pais: row.profile.country,
        region: row.profile.region ?? '',
        producto: row.profile.mainProduct,
        organizationalEstado: organizational.estado,
        organizationalPuntaje: organizational.puntaje,
        capacityEstado: capacity.estado,
        capacityPuntaje: capacity.puntaje,
        riskEstado: risk.estado,
        riskPuntaje: risk.puntaje,
        alertasCriticas: row.criticalAlertCount,
      };
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      createExcelWorksheetFromJson(sheetRows),
      'Panel Consolidado',
    );
    const buffer = await writeExcelBuffer(workbook);

    return {
      filename: `panel-consolidado-assessment-${Date.now()}.xlsx`,
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      data: buffer,
    };
  }
}
