import * as XLSX from 'xlsx';

export function exportSheetToExcel(
  fileName: string,
  sheets: { name: string; rows: Record<string, string | number | boolean | null>[] }[]
): void {
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    const ws = XLSX.utils.json_to_sheet(s.rows.length > 0 ? s.rows : [{ Message: 'No records available' }]);
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
  }
  XLSX.writeFile(wb, fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`);
}
