import { Capacitor } from "@capacitor/core";
import { SMSInboxReader, MessageType } from "capacitor-sms-inbox";
import { parseTransactionSms } from "./sms-parser";
import { bulkCreateTransactions, type BulkImportRow } from "./actions/transactions";
import { markSmsProcessedUpTo } from "./actions/sms-capture";

/** SMS reading is Android-only — no web equivalent exists, and the plugin's web shim just
 *  rejects, so gate every entry point on this instead of letting calls fail confusingly. */
export function isSmsCaptureSupported(): boolean {
  return Capacitor.getPlatform() === "android";
}

export async function checkSmsPermission(): Promise<boolean> {
  if (!isSmsCaptureSupported()) return false;
  const status = await SMSInboxReader.checkPermissions();
  return status.sms === "granted";
}

export async function requestSmsPermission(): Promise<boolean> {
  if (!isSmsCaptureSupported()) return false;
  const status = await SMSInboxReader.requestPermissions();
  return status.sms === "granted";
}

/** epoch ms -> the device's local calendar date, matching how every other transaction_date in
 *  this app is stored. `toISOString()` would use UTC and can land on the wrong day for messages
 *  received late night in IST. */
function toLocalDateString(epochMs: number): string {
  const d = new Date(epochMs);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type SmsScanResult = { scanned: number; imported: number };

/**
 * Fetches SMS newer than `sinceDate` (or falls back to `backfillDays` of history), parses each
 * for a transaction, and bulk-creates any matches. The parser is deliberately conservative, so
 * most scanned messages are expected to be skipped, not just filtered by sender — that's normal,
 * not a bug. Advances the stored watermark to the newest message's date either way, so a poll
 * with zero matches still doesn't re-scan the same window next time.
 */
export async function scanAndCaptureSms(options: {
  sinceDate: number | null;
  backfillDays?: number;
  expenseCategoryId: string | null;
  incomeCategoryId: string | null;
}): Promise<SmsScanResult | { error: string }> {
  if (!isSmsCaptureSupported()) return { error: "SMS auto-capture is only available in the Android app." };

  const granted = await checkSmsPermission();
  if (!granted) return { error: "SMS permission not granted." };

  const minDate = options.sinceDate != null ? options.sinceDate + 1 : Date.now() - (options.backfillDays ?? 30) * 24 * 60 * 60 * 1000;

  const { smsList } = await SMSInboxReader.getSMSList({
    filter: { type: MessageType.INBOX, minDate },
  });

  const rows: BulkImportRow[] = [];
  let maxDate = options.sinceDate ?? minDate;

  for (const sms of smsList) {
    if (sms.date > maxDate) maxDate = sms.date;

    const parsed = parseTransactionSms(sms.body);
    if (!parsed) continue;

    const category_id = parsed.type === "expense" ? options.expenseCategoryId : options.incomeCategoryId;
    if (!category_id) continue; // no default category configured for this type — skip rather than guess

    rows.push({
      type: parsed.type,
      category_id,
      amount: parsed.amount,
      transaction_date: toLocalDateString(sms.date),
      description: parsed.merchant ? `${parsed.merchant} (SMS auto-capture)` : "SMS auto-capture",
      account_id: null,
    });
  }

  if (rows.length > 0) {
    const result = await bulkCreateTransactions(rows);
    if ("error" in result) return result;
  }

  await markSmsProcessedUpTo(maxDate);
  return { scanned: smsList.length, imported: rows.length };
}
