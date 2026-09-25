import { withExportSlot } from './export-limiter';
import * as XLSX from 'xlsx';

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
