import * as XLSX from 'xlsx';
import type { ParsedLead } from '../types/email';
import { validateBusinessEmail } from './email-validator';

export type RejectedEmail = { email: string; reason: string };

export type ParseResult = {
  leads: ParsedLead[];
  rejected: RejectedEmail[];
};

export function parseLeadsFromBuffer(buffer: Buffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('Excel file has no sheets.');

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], { defval: '' });
  if (rows.length === 0) throw new Error('Excel file is empty.');

  const normalize = (row: Record<string, unknown>, ...keys: string[]): string => {
    for (const key of keys) {
      const match = Object.keys(row).find((k) => k.trim().toLowerCase() === key.toLowerCase());
      if (match && typeof row[match] === 'string' && (row[match] as string).trim().length > 0) {
        return (row[match] as string).trim();
      }
    }
    return '';
  };

  const firstRow = rows[0];
  const hasEmail = Object.keys(firstRow).some((k) => k.trim().toLowerCase() === 'email');
  if (!hasEmail) {
    throw new Error('Excel file must have an "email" column.');
  }

  const leads: ParsedLead[] = [];
  const rejected: RejectedEmail[] = [];

  for (const row of rows) {
    const rawEmail = normalize(row, 'email');

    // Skip completely blank rows
    if (!rawEmail) continue;

    const check = validateBusinessEmail(rawEmail);
    if (!check.valid) {
      rejected.push({ email: rawEmail, reason: check.reason });
      continue;
    }

    leads.push({
      email: rawEmail.toLowerCase().trim(),
      name: normalize(row, 'name', 'full name', 'fullname') || undefined,
      company: normalize(row, 'company', 'organization', 'org') || undefined,
      custom_note: normalize(row, 'custom_note', 'custom note', 'note', 'message') || undefined,
    });
  }

  if (leads.length === 0 && rejected.length === 0) {
    throw new Error('No email addresses found in the file.');
  }

  if (leads.length === 0) {
    throw new Error(
      `All ${rejected.length} email(s) were rejected — none are valid business addresses. ` +
      `Personal/free email providers (Gmail, Yahoo, Hotmail, etc.) are not accepted.`,
    );
  }

  return { leads, rejected };
}
