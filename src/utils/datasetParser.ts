import * as XLSX from 'xlsx';
import { TransactionRecord } from '../types/nexora';

export interface ParsedRowValidation {
  rowIndex: number;
  raw: Record<string, unknown>;
  mapped?: Omit<TransactionRecord, 'id' | 'businessId' | 'ownerId' | 'createdBy'>;
  issues: string[];
  isDuplicate: boolean;
}

export interface DatasetParseResult {
  fileName: string;
  headers: string[];
  totalRows: number;
  validRows: ParsedRowValidation[];
  invalidRows: ParsedRowValidation[];
  duplicateCount: number;
  inconsistentCategories: string[];
  summaryText: string;
}

function normalizeDate(value: unknown): string | null {
  if (typeof value === 'number') {
    // Excel serial date
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed && parsed.y && parsed.m && parsed.d) {
      return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
    }
  }
  const str = String(value ?? '').trim();
  if (!str) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const slashMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (slashMatch) {
    const [, d, m, y] = slashMatch;
    const day = Number(d);
    const mon = Number(m);
    if (mon >= 1 && mon <= 12 && day >= 1 && day <= 31) {
      return `${y}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  const dt = new Date(str);
  if (!Number.isNaN(dt.getTime())) {
    return dt.toISOString().slice(0, 10);
  }
  return null;
}

function findField(row: Record<string, unknown>, candidates: string[]): unknown {
  const keys = Object.keys(row);
  for (const candidate of candidates) {
    const match = keys.find((k) => k.toLowerCase().replace(/[^a-z0-9]/g, '') === candidate);
    if (match !== undefined) return row[match];
  }
  return undefined;
}

export async function parseAndValidateSpreadsheet(file: File): Promise<DatasetParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('The uploaded workbook contains no sheets.');
  }
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

  const seenFingerprints = new Set<string>();
  const validRows: ParsedRowValidation[] = [];
  const invalidRows: ParsedRowValidation[] = [];
  const categoryVariants = new Map<string, Set<string>>();
  let duplicateCount = 0;

  rows.forEach((raw, idx) => {
    const issues: string[] = [];
    const rawDate = findField(raw, ['date', 'transactiondate', 'expensedate', 'invoicedate']);
    const parsedDate = normalizeDate(rawDate);
    if (!parsedDate) {
      issues.push('Invalid or missing date format (expected YYYY-MM-DD or DD/MM/YYYY)');
    }

    const rawType = String(findField(raw, ['type', 'transactiontype', 'entrytype']) ?? '').trim().toLowerCase();
    let type: 'Income' | 'Expense' = 'Income';
    if (rawType.includes('exp') || rawType.includes('debit') || rawType.includes('purchase') || rawType.includes('cost')) {
      type = 'Expense';
    } else if (rawType.includes('inc') || rawType.includes('rev') || rawType.includes('sale') || rawType.includes('credit')) {
      type = 'Income';
    } else if (!rawType) {
      issues.push('Missing transaction Type (Income or Expense)');
    }

    const partyName = String(
      findField(raw, ['partyname', 'customername', 'vendorname', 'customer', 'vendor', 'party']) ?? ''
    ).trim();
    if (!partyName) {
      issues.push('Missing Customer/Vendor name');
    }

    const category = String(
      findField(raw, ['category', 'revenuecategory', 'expensecategory']) ?? ''
    ).trim();
    if (!category) {
      issues.push('Missing Category');
    } else {
      const lower = category.toLowerCase();
      const set = categoryVariants.get(lower) ?? new Set<string>();
      set.add(category);
      categoryVariants.set(lower, set);
    }

    const department = String(findField(raw, ['department', 'dept', 'businessunit']) ?? 'Operations').trim();

    const rawAmount = findField(raw, ['amount', 'total', 'value', 'netamount']);
    const numericAmount = typeof rawAmount === 'number' ? rawAmount : Number(String(rawAmount ?? '').replace(/[₹,\s]/g, ''));
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      issues.push('Amount must be a positive number');
    }

    const rawGst = findField(raw, ['gstamount', 'gst', 'tax']);
    const gstAmount =
      rawGst === '' || rawGst === undefined
        ? 0
        : typeof rawGst === 'number'
        ? rawGst
        : Number(String(rawGst).replace(/[₹,\s]/g, ''));
    if (!Number.isFinite(gstAmount) || gstAmount < 0) {
      issues.push('GST Amount must be a valid non-negative number');
    }

    const rawStatus = String(findField(raw, ['paymentstatus', 'status']) ?? 'Paid').trim();
    const paymentStatus: TransactionRecord['paymentStatus'] =
      rawStatus === 'Pending' || rawStatus === 'Overdue' || rawStatus === 'Partial' ? rawStatus : 'Paid';

    const paymentMethod = String(findField(raw, ['paymentmethod', 'method', 'mode']) ?? 'Bank Transfer').trim();
    const invoiceNumber = String(findField(raw, ['invoicenumber', 'invoice', 'ref']) ?? '').trim();
    const productOrService = String(findField(raw, ['productorservice', 'product', 'service', 'item']) ?? category).trim();
    const description = String(findField(raw, ['description', 'notes', 'narration']) ?? '').trim();

    const fingerprint = `${parsedDate ?? ''}|${type}|${partyName.toLowerCase()}|${numericAmount}|${invoiceNumber.toLowerCase()}`;
    const isDuplicate = seenFingerprints.has(fingerprint);
    if (isDuplicate) {
      duplicateCount += 1;
      issues.push('Duplicate transaction detected');
    } else {
      seenFingerprints.add(fingerprint);
    }

    if (issues.length === 0 && parsedDate) {
      validRows.push({
        rowIndex: idx + 1,
        raw,
        issues: [],
        isDuplicate: false,
        mapped: {
          type,
          date: parsedDate,
          partyName,
          category,
          department: department || 'Operations',
          invoiceNumber,
          productOrService,
          description,
          amount: numericAmount,
          gstAmount: Number.isFinite(gstAmount) ? gstAmount : 0,
          paymentStatus,
          paymentMethod,
        },
      });
    } else {
      invalidRows.push({
        rowIndex: idx + 1,
        raw,
        issues,
        isDuplicate,
      });
    }
  });

  const inconsistentCategories: string[] = [];
  categoryVariants.forEach((variants) => {
    if (variants.size > 1) {
      inconsistentCategories.push(Array.from(variants).join(' vs '));
    }
  });

  const summaryText = `Parsed ${rows.length} rows: ${validRows.length} valid, ${invalidRows.length} flagged (${duplicateCount} duplicates).`;

  return {
    fileName: file.name,
    headers,
    totalRows: rows.length,
    validRows,
    invalidRows,
    duplicateCount,
    inconsistentCategories,
    summaryText,
  };
}
