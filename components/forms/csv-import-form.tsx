"use client";

import { useState } from "react";
import { bulkCreateTransactions } from "@/lib/actions/transactions";
import { parseImportCsv, type ImportMode, type ParsedImportRow } from "@/lib/import";
import { SelectField, FormError } from "@/components/ui/field";
import { fmtCurrency } from "@/lib/calculations";
import { useModal } from "@/components/ui/modal";
import type { Account, Category } from "@/lib/types";

export function CsvImportForm({
  expenseCategories,
  incomeCategories,
  accounts = [],
  onSuccess,
}: {
  expenseCategories: Category[];
  incomeCategories: Category[];
  accounts?: Account[];
  onSuccess?: () => void;
}) {
  const { close } = useModal();
  const [csvText, setCsvText] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [mode, setMode] = useState<ImportMode>("auto");
  const [rows, setRows] = useState<ParsedImportRow[]>([]);
  const [hasDebitCredit, setHasDebitCredit] = useState(false);
  const [expenseCategoryId, setExpenseCategoryId] = useState("");
  const [incomeCategoryId, setIncomeCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [result, setResult] = useState<string | undefined>();

  function reparse(text: string, useMode: ImportMode) {
    const parsed = parseImportCsv(text, useMode);
    setRows(parsed.rows);
    setHasDebitCredit(parsed.hasDebitCredit);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(undefined);
    setResult(undefined);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setCsvText(text);
      reparse(text, mode);
    };
    reader.onerror = () => setError("Couldn't read that file.");
    reader.readAsText(file);
  }

  function handleModeChange(next: ImportMode) {
    setMode(next);
    if (csvText) reparse(csvText, next);
  }

  const validRows = rows.filter((r) => r.valid);
  const invalidCount = rows.length - validRows.length;
  const expenseRows = validRows.filter((r) => r.type === "expense");
  const incomeRows = validRows.filter((r) => r.type === "income");

  async function handleImport() {
    setError(undefined);
    setResult(undefined);

    if (expenseRows.length > 0 && !expenseCategoryId) {
      setError("Pick a category for the expense rows.");
      return;
    }
    if (incomeRows.length > 0 && !incomeCategoryId) {
      setError("Pick a category for the income rows.");
      return;
    }

    setPending(true);
    const payload = validRows.map((r) => ({
      type: r.type,
      category_id: r.type === "expense" ? expenseCategoryId : incomeCategoryId,
      amount: r.amount,
      transaction_date: r.date,
      description: r.description || null,
      account_id: accountId || null,
    }));

    const res = await bulkCreateTransactions(payload);
    setPending(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    setResult(`Imported ${res.count} transaction${res.count === 1 ? "" : "s"}.`);
    onSuccess?.();
  }

  return (
    <div>
      <label className="block">
        <span className="block text-[12.5px] font-medium tracking-[0.2px] text-muted">CSV file</span>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={handleFile}
          className="mt-1.5 w-full cursor-pointer rounded-[10px] border border-border bg-surface-2 px-[14px] py-3 text-[13.5px] text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-accent-foreground"
        />
      </label>
      <p className="mt-1.5 text-[12px] text-muted">
        Works with Date + Amount, or Date + Debit/Credit columns — most bank statement exports.
        Nothing leaves your device; this reads and imports locally.
      </p>

      {csvText && (
        <>
          <SelectField
            label="Unsigned amount column means…"
            name="mode"
            value={mode}
            onChange={(e) => handleModeChange(e.target.value as ImportMode)}
          >
            <option value="auto">Auto (negative = expense, positive = income)</option>
            <option value="expense">Treat every row as an expense</option>
            <option value="income">Treat every row as income</option>
          </SelectField>
          {hasDebitCredit && (
            <p className="mt-1.5 text-[12px] text-muted">
              Found separate Debit/Credit columns — using those directly, the amount-sign setting
              above is ignored.
            </p>
          )}

          <div className="mt-4 rounded-[10px] border border-border bg-surface-2 p-3 text-[12.5px]">
            <div className="font-medium text-foreground">{fileName}</div>
            <div className="mt-1 text-muted">
              {validRows.length} row{validRows.length === 1 ? "" : "s"} ready
              {expenseRows.length > 0 && ` · ${expenseRows.length} expense`}
              {incomeRows.length > 0 && ` · ${incomeRows.length} income`}
              {invalidCount > 0 && ` · ${invalidCount} skipped (unreadable date/amount)`}
            </div>
          </div>

          {validRows.length > 0 && (
            <div className="mt-3 max-h-48 overflow-y-auto rounded-[10px] border border-border">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-border text-left text-muted">
                    <th className="px-2.5 py-1.5 font-medium">Date</th>
                    <th className="px-2.5 py-1.5 font-medium">Description</th>
                    <th className="px-2.5 py-1.5 text-right font-medium">Amount</th>
                    <th className="px-2.5 py-1.5 font-medium">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {validRows.slice(0, 8).map((r, i) => (
                    <tr key={i}>
                      <td className="px-2.5 py-1.5 whitespace-nowrap text-muted">{r.date}</td>
                      <td className="px-2.5 py-1.5">{r.description || "—"}</td>
                      <td className="px-2.5 py-1.5 text-right">{fmtCurrency(r.amount)}</td>
                      <td className="px-2.5 py-1.5 text-muted">{r.type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {validRows.length > 8 && (
                <div className="border-t border-border px-2.5 py-1.5 text-[11px] text-muted">
                  + {validRows.length - 8} more
                </div>
              )}
            </div>
          )}

          {expenseRows.length > 0 && (
            <SelectField
              label="Category for expense rows"
              name="expense_category_id"
              value={expenseCategoryId}
              onChange={(e) => setExpenseCategoryId(e.target.value)}
              required
            >
              <option value="" disabled>
                Select category
              </option>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </SelectField>
          )}

          {incomeRows.length > 0 && (
            <SelectField
              label="Category for income rows"
              name="income_category_id"
              value={incomeCategoryId}
              onChange={(e) => setIncomeCategoryId(e.target.value)}
              required
            >
              <option value="" disabled>
                Select category
              </option>
              {incomeCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </SelectField>
          )}

          <SelectField label="Account (optional)" name="account_id" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">{accounts.length ? "Select account" : "No accounts yet"}</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </SelectField>

          <FormError message={error} />
          {result && <p className="mt-2 text-[13px] text-success">{result}</p>}

          {result ? (
            <button
              type="button"
              onClick={close}
              className="mt-5 w-full rounded-[10px] bg-accent px-4 py-3 text-[14.5px] font-semibold text-accent-foreground transition hover:brightness-105"
            >
              Done
            </button>
          ) : (
            <button
              type="button"
              onClick={handleImport}
              disabled={pending || validRows.length === 0}
              className="mt-5 w-full rounded-[10px] bg-accent px-4 py-[13px] text-[14.5px] font-semibold text-accent-foreground transition hover:brightness-95 active:brightness-90 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {pending ? "Importing…" : `Import ${validRows.length} transaction${validRows.length === 1 ? "" : "s"}`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
