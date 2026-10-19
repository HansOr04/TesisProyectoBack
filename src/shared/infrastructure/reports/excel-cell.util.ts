import { withExportSlot } from './export-limiter';
import * as XLSX from 'xlsx';
import * as ExcelJS from 'exceljs';

/** Excel hard limit per cell (inclusive). */
export const EXCEL_CELL_MAX_LENGTH = 32767;

const EXCEL_TRUNCATE_MARKER = '…[truncated]';

const EXCEL_CELL_SAFE_LENGTH =
  EXCEL_CELL_MAX_LENGTH - EXCEL_TRUNCATE_MARKER.length;

const EXCEL_OMITTED_MARKER = '…[omitted — exceeds Excel limit]';

/** Truncate a text string to fit Excel's cell limit (text columns only). */
export function clampExcelText(value: string, columnId?: string): string {
  if (value.length <= EXCEL_CELL_MAX_LENGTH) return value;
  console.warn(
    'clampExcelText: value exceeds Excel cell length limit, truncating',
    columnId,
    value.length,
  );
  return value.slice(0, EXCEL_CELL_SAFE_LENGTH) + EXCEL_TRUNCATE_MARKER;
}

/**
 * Prepare any cell value for Excel write.
 * Truncation applies to text strings only; numbers/booleans pass through unchanged.
 * Non-text values that would exceed the limit are replaced with a short placeholder.
 */
export function sanitizeForExcelCell(
  value: unknown,
  columnId?: string,
): string | number | boolean {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'string') return clampExcelText(value, columnId);

  const str = JSON.stringify(value);
  if (str.length <= EXCEL_CELL_MAX_LENGTH) return str;

  console.warn(
    'sanitizeForExcelCell: non-text value exceeds Excel cell length limit, omitting',
    columnId,
    str.length,
  );
  return EXCEL_OMITTED_MARKER;
}

/** @deprecated Use sanitizeForExcelCell */
export const clampForExcelCell = sanitizeForExcelCell;

export function clampAoAForExcel(rows: unknown[][]): unknown[][] {
  return rows.map((row) => row.map((cell) => sanitizeForExcelCell(cell)));
}

export function clampJsonRowsForExcel<T extends Record<string, unknown>>(
  rows: T[],
): T[] {
  return rows.map((row) => {
    const out = { ...row } as Record<string, unknown>;
    for (const key of Object.keys(out)) {
      out[key] = sanitizeForExcelCell(out[key], key);
    }
    return out as T;
  });
}

export function createExcelWorksheetFromAoA(data: unknown[][]) {
  return XLSX.utils.aoa_to_sheet(clampAoAForExcel(data));
}

export function createExcelWorksheetFromJson(data: Record<string, unknown>[]) {
  return XLSX.utils.json_to_sheet(clampJsonRowsForExcel(data));
}

/** Serializa un libro a buffer respetando el límite de exportes concurrentes. */
export function writeExcelBuffer(workbook: XLSX.WorkBook): Promise<Buffer> {
  return withExportSlot(
    async () =>
      XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }) as Buffer,
  );
}

// ── Hojas con formato (ExcelJS) ──────────────────────────────────────────
// SheetJS Community no escribe estilos; para los reportes que se entregan a
// las organizaciones se usa ExcelJS: título, encabezado con color, anchos de
// columna, texto ajustado, filtros y la fila de encabezado inmovilizada.

export type ExcelColumnKind = 'text' | 'number' | 'score' | 'percent' | 'date';

export interface ExcelColumn {
  header: string;
  key: string;
  /** Ancho en caracteres. */
  width: number;
  kind?: ExcelColumnKind;
}

export interface ExcelSheetSpec {
  name: string;
  title: string;
  /** Línea de contexto bajo el título (organización, fecha…). */
  subtitle?: string;
  columns: ExcelColumn[];
  rows: Record<string, unknown>[];
  emptyText?: string;
}

const EXCEL_BRAND = 'FF2F6B3B';
const EXCEL_BAND = 'FFF4F7F5';
const EXCEL_RULE = 'FFD5DCD7';

function scoreFontColor(score: number): string {
  if (score <= 5) return 'FFC62828';
  if (score < 7) return 'FFB27C00';
  return 'FF2E7D32';
}

/** Nombre de hoja válido para Excel: máx. 31 caracteres y sin : \ / ? * [ ] */
function safeSheetName(name: string): string {
  return name.replace(/[:\\/?*[\]]/g, ' ').slice(0, 31);
}

export async function buildFormattedWorkbook(
  sheets: ExcelSheetSpec[],
): Promise<Buffer> {
  return withExportSlot(async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Plataforma de evaluación';
    workbook.created = new Date();

    for (const spec of sheets) {
      const sheet = workbook.addWorksheet(safeSheetName(spec.name));
      const lastCol = spec.columns.length;
      sheet.columns = spec.columns.map((c) => ({ key: c.key, width: c.width }));

      sheet.mergeCells(1, 1, 1, lastCol);
      const title = sheet.getCell(1, 1);
      title.value = spec.title;
      title.font = {
        name: 'Arial',
        size: 14,
        bold: true,
        color: { argb: 'FF1E2B24' },
      };
      sheet.getRow(1).height = 24;
      if (spec.subtitle) {
        sheet.mergeCells(2, 1, 2, lastCol);
        const sub = sheet.getCell(2, 1);
        sub.value = spec.subtitle;
        sub.font = { name: 'Arial', size: 10, color: { argb: 'FF6B7770' } };
      }

      const headerRowNumber = 4;
      const header = sheet.getRow(headerRowNumber);
      spec.columns.forEach((c, i) => {
        const cell = header.getCell(i + 1);
        cell.value = c.header;
        cell.font = {
          name: 'Arial',
          size: 10,
          bold: true,
          color: { argb: 'FFFFFFFF' },
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: EXCEL_BRAND },
        };
        cell.alignment = {
          vertical: 'middle',
          horizontal: c.kind && c.kind !== 'text' ? 'center' : 'left',
          wrapText: true,
        };
      });
      header.height = 30;

      spec.rows.forEach((data, r) => {
        const row = sheet.getRow(headerRowNumber + 1 + r);
        spec.columns.forEach((c, i) => {
          const cell = row.getCell(i + 1);
          const raw = data[c.key];
          const kind = c.kind ?? 'text';
          if (kind === 'date' && raw instanceof Date && !isNaN(raw.getTime())) {
            cell.value = raw;
            cell.numFmt = 'dd/mm/yyyy';
          } else if (kind === 'percent' && typeof raw === 'number') {
            cell.value = raw / 100;
            cell.numFmt = '0%';
          } else if (
            (kind === 'number' || kind === 'score') &&
            typeof raw === 'number'
          ) {
            cell.value = raw;
            if (kind === 'score') cell.numFmt = '0.0';
          } else {
            cell.value = sanitizeForExcelCell(raw, c.key);
          }
          cell.font = {
            name: 'Arial',
            size: 10,
            bold: kind === 'score' && typeof raw === 'number',
            color: {
              argb:
                kind === 'score' && typeof raw === 'number'
                  ? scoreFontColor(raw)
                  : 'FF1E2B24',
            },
          };
          cell.alignment = {
            vertical: 'top',
            horizontal: kind === 'text' ? 'left' : 'center',
            wrapText: kind === 'text',
          };
          cell.border = {
            bottom: { style: 'thin', color: { argb: EXCEL_RULE } },
          };
          if (r % 2 === 1) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: EXCEL_BAND },
            };
          }
        });
      });

      if (spec.rows.length === 0 && spec.emptyText) {
        const cell = sheet.getCell(headerRowNumber + 1, 1);
        cell.value = spec.emptyText;
        cell.font = {
          name: 'Arial',
          size: 10,
          italic: true,
          color: { argb: 'FF6B7770' },
        };
      }

      sheet.views = [{ state: 'frozen', ySplit: headerRowNumber }];
      sheet.autoFilter = {
        from: { row: headerRowNumber, column: 1 },
        to: {
          row: headerRowNumber + Math.max(spec.rows.length, 1),
          column: lastCol,
        },
      };
      sheet.pageSetup = {
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        printTitlesRow: `${headerRowNumber}:${headerRowNumber}`,
      };
    }

    const out = await workbook.xlsx.writeBuffer();
    return Buffer.from(out as ArrayBuffer);
  });
}
