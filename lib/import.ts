export type ParsedImportRow = {
  date: string; // YYYY-MM-DD, or "" if unparseable
  description: string;
  amount: number; // absolute value
  type: "expense" | "income";
  valid: boolean;
};

/** Minimal RFC4180-ish CSV parser: handles quoted fields, embedded commas/newlines, and "" escapes. */
export function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.some((c) => c.trim() !== "")) rows.push(row);
  }
  return rows;
}

function findColumn(headers: string[], keywords: string[]): number {
  const lower = headers.map((h) => h.toLowerCase());
  return lower.findIndex((h) => keywords.some((k) => h.includes(k)));
}

export function detectColumns(headers: string[]) {
  const dateIdx = findColumn(headers, ["date"]);
  const descIdx = findColumn(headers, ["description", "narration", "particular", "detail", "remark", "memo"]);
  const debitIdx = findColumn(headers, ["debit", "withdrawal"]);
  const creditIdx = findColumn(headers, ["credit", "deposit"]);
  const amountIdx = debitIdx === -1 && creditIdx === -1 ? findColumn(headers, ["amount"]) : -1;
  return { dateIdx, descIdx, debitIdx, creditIdx, amountIdx };
}

function parseDate(raw: string): string | null {
  const s = raw.trim();
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

function parseAmount(raw: string): number | null {
  if (!raw) return null;
  let s = raw.trim().replace(/[₹$,\s]/g, "");
  if (!s) return null;
  let negative = false;
  if (s.startsWith("(") && s.endsWith(")")) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (s.startsWith("-")) {
    negative = true;
    s = s.slice(1);
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

export type ImportMode = "auto" | "expense" | "income";

/**
 * Parses a bank/CSV export into rows ready to import. Supports either a Debit/Credit column pair
 * (most Indian bank exports) or a single signed Amount column, with `mode` overriding how an
 * unsigned single-amount file should be classified.
 */
export function parseImportCsv(text: string, mode: ImportMode = "auto"): { rows: ParsedImportRow[]; hasDebitCredit: boolean; headers: string[] } {
  const table = parseCsvText(text);
  if (table.length < 2) return { rows: [], hasDebitCredit: false, headers: table[0] ?? [] };

  const headers = table[0];
  const { dateIdx, descIdx, debitIdx, creditIdx, amountIdx } = detectColumns(headers);
  const hasDebitCredit = debitIdx !== -1 || creditIdx !== -1;

  const rows: ParsedImportRow[] = table.slice(1).map((raw) => {
    const date = dateIdx !== -1 ? parseDate(raw[dateIdx] ?? "") : null;
    const description = descIdx !== -1 ? (raw[descIdx] ?? "").trim() : "";

    let amount: number | null = null;
    let type: "expense" | "income" = "expense";

    if (hasDebitCredit) {
      const debit = debitIdx !== -1 ? parseAmount(raw[debitIdx] ?? "") : null;
      const credit = creditIdx !== -1 ? parseAmount(raw[creditIdx] ?? "") : null;
      if (debit != null && debit !== 0) {
        amount = Math.abs(debit);
        type = "expense";
      } else if (credit != null && credit !== 0) {
        amount = Math.abs(credit);
        type = "income";
      }
    } else if (amountIdx !== -1) {
      const rawAmount = parseAmount(raw[amountIdx] ?? "");
      if (rawAmount != null && rawAmount !== 0) {
        amount = Math.abs(rawAmount);
        type = mode !== "auto" ? mode : rawAmount < 0 ? "expense" : "income";
      }
    }

    return {
      date: date ?? "",
      description,
      amount: amount ?? 0,
      type,
      valid: date != null && amount != null && amount > 0,
    };
  });

  return { rows, hasDebitCredit, headers };
}
