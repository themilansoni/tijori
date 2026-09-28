"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/field";
import { getSmsCaptureConfig, setSmsCaptureConfig } from "@/lib/actions/sms-capture";
import { isSmsCaptureSupported, requestSmsPermission, scanAndCaptureSms } from "@/lib/sms-inbox";
import type { Category, SmsCaptureConfig } from "@/lib/types";

export function SmsCaptureSection({
  expenseCategories,
  incomeCategories,
}: {
  expenseCategories: Category[];
  incomeCategories: Category[];
}) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [config, setConfig] = useState<SmsCaptureConfig | null>(null);
  const [expenseCategoryId, setExpenseCategoryId] = useState("");
  const [incomeCategoryId, setIncomeCategoryId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();

  useEffect(() => {
    setSupported(isSmsCaptureSupported());
    getSmsCaptureConfig().then((c) => {
      setConfig(c);
      if (c) {
        setExpenseCategoryId(c.expense_category_id ?? "");
        setIncomeCategoryId(c.income_category_id ?? "");
      }
    });
  }, []);

  if (supported === null) return null;
  if (!supported) {
    return (
      <section className="mt-8">
        <h2 className="text-sm font-semibold text-muted">SMS auto-capture</h2>
        <p className="mt-1.5 text-[13px] text-muted">
          Available in the Android app — auto-logs UPI/card debit and credit alerts as
          transactions by reading bank SMS on your device.
        </p>
      </section>
    );
  }

  async function handleEnable() {
    setError(undefined);
    setPending(true);
    const granted = await requestSmsPermission();
    if (!granted) {
      setPending(false);
      setError("SMS permission was denied. You can grant it from Android Settings > Apps > Tijori > Permissions and try again.");
      return;
    }
    const result = await setSmsCaptureConfig({
      enabled: true,
      expense_category_id: expenseCategoryId || null,
      income_category_id: incomeCategoryId || null,
    });
    if (result && "error" in result) {
      setPending(false);
      setError(result.error);
      return;
    }
    const scan = await scanAndCaptureSms({
      sinceDate: null,
      backfillDays: 30,
      expenseCategoryId: expenseCategoryId || null,
      incomeCategoryId: incomeCategoryId || null,
    });
    setPending(false);
    if ("error" in scan) {
      setError(scan.error);
    } else {
      setStatus(`Enabled. Scanned ${scan.scanned} recent messages and imported ${scan.imported} transaction${scan.imported === 1 ? "" : "s"} from the last 30 days.`);
    }
    setConfig((c) => ({
      enabled: true,
      expense_category_id: expenseCategoryId || null,
      income_category_id: incomeCategoryId || null,
      last_processed_date: c?.last_processed_date ?? Date.now(),
      updated_at: new Date().toISOString(),
    }));
  }

  async function handleSaveCategories() {
    setError(undefined);
    setPending(true);
    const result = await setSmsCaptureConfig({
      expense_category_id: expenseCategoryId || null,
      income_category_id: incomeCategoryId || null,
    });
    setPending(false);
    if (result && "error" in result) {
      setError(result.error);
      return;
    }
    setStatus("Saved.");
    setConfig((c) => (c ? { ...c, expense_category_id: expenseCategoryId || null, income_category_id: incomeCategoryId || null } : c));
  }

  async function handleScanNow() {
    if (!config) return;
    setError(undefined);
    setStatus(undefined);
    setPending(true);
    const scan = await scanAndCaptureSms({
      sinceDate: config.last_processed_date,
      expenseCategoryId: config.expense_category_id,
      incomeCategoryId: config.income_category_id,
    });
    setPending(false);
    if ("error" in scan) {
      setError(scan.error);
    } else {
      setStatus(`Scanned ${scan.scanned} new messages, imported ${scan.imported} transaction${scan.imported === 1 ? "" : "s"}.`);
      setConfig((c) => (c ? { ...c, last_processed_date: Date.now() } : c));
    }
  }

  async function handleDisable() {
    setPending(true);
    await setSmsCaptureConfig({ enabled: false });
    setPending(false);
    setConfig((c) => (c ? { ...c, enabled: false } : c));
    setStatus("SMS auto-capture turned off.");
  }

  const enabled = config?.enabled ?? false;

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted">SMS auto-capture</h2>
        {enabled && (
          <span className="rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success">On</span>
        )}
      </div>
      <p className="mt-1.5 text-[13px] text-muted">
        Reads UPI/card debit and credit alerts from your SMS inbox and logs them as transactions
        automatically. Only messages that clearly look like a bank transaction are used — nothing
        else is read or stored. Runs while the Tijori app is open; it doesn't work in the
        background when the app is fully closed.
      </p>

      <div className="mt-3 rounded-xl border border-border bg-surface p-4">
        <SelectField
          label="Default category for auto-captured expenses"
          name="sms_expense_category"
          value={expenseCategoryId}
          onChange={(e) => setExpenseCategoryId(e.target.value)}
        >
          <option value="">Not set — expense messages will be skipped</option>
          {expenseCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Default category for auto-captured income"
          name="sms_income_category"
          value={incomeCategoryId}
          onChange={(e) => setIncomeCategoryId(e.target.value)}
        >
          <option value="">Not set — income messages will be skipped</option>
          {incomeCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectField>
        <p className="mt-1.5 text-[12px] text-muted">
          Auto-captured transactions land in this one category — re-categorize individual ones
          afterwards from Expenses/Income like any other transaction.
        </p>

        {error && <p className="mt-3 text-[12.5px] text-danger">{error}</p>}
        {status && <p className="mt-3 text-[12.5px] text-success">{status}</p>}

        <div className="mt-3 flex flex-wrap gap-2">
          {!enabled ? (
            <Button size="sm" onClick={handleEnable} disabled={pending}>
              {pending ? "Enabling…" : "Enable SMS auto-capture"}
            </Button>
          ) : (
            <>
              <Button size="sm" variant="ghost" onClick={handleSaveCategories} disabled={pending}>
                Save categories
              </Button>
              <Button size="sm" variant="ghost" onClick={handleScanNow} disabled={pending}>
                {pending ? "Scanning…" : "Scan now"}
              </Button>
              <Button size="sm" variant="danger" onClick={handleDisable} disabled={pending}>
                Disable
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
