"use client";

import { useEffect, useRef } from "react";
import {
  isNotificationCaptureSupported,
  getCapturedNotifications,
  markNotificationsProcessedUpTo,
} from "@/lib/notification-capture";
import { getNotificationCaptureConfig, markNotificationCaptureProcessedUpTo } from "@/lib/actions/notification-capture";
import { bulkCreateTransactions, type BulkImportRow } from "@/lib/actions/transactions";
import { parseTransactionSms } from "@/lib/sms-parser";

const POLL_MS = 90_000;

/** Mounted once in the app layout. Polls the native notification buffer while the app is open
 *  (foreground or backgrounded but alive) and turns matching entries into transactions — the
 *  buffer itself is filled in the background by NotificationCaptureListenerService even while
 *  this component isn't mounted, so nothing is missed between app sessions. */
export function NotificationCaptureEngine() {
  const running = useRef(false);

  useEffect(() => {
    if (!isNotificationCaptureSupported()) return;

    async function tick() {
      if (running.current) return;
      running.current = true;
      try {
        const config = await getNotificationCaptureConfig();
        if (!config?.enabled) return;

        const items = await getCapturedNotifications(config.last_processed_at);
        if (items.length === 0) return;

        const rows: BulkImportRow[] = [];
        let maxTs = config.last_processed_at;
        for (const item of items) {
          maxTs = Math.max(maxTs, item.ts);
          const parsed = parseTransactionSms(item.text);
          if (!parsed) continue;
          rows.push({
            type: parsed.type,
            category_id: parsed.type === "income" ? config.income_category_id : config.expense_category_id,
            amount: parsed.amount,
            transaction_date: new Date(item.ts).toISOString().slice(0, 10),
            description: parsed.merchant,
            account_id: null,
          });
        }

        if (rows.length > 0) await bulkCreateTransactions(rows);
        await markNotificationsProcessedUpTo(maxTs);
        await markNotificationCaptureProcessedUpTo(maxTs);
      } finally {
        running.current = false;
      }
    }

    tick();
    const interval = setInterval(tick, POLL_MS);
    function onVisible() {
      if (document.visibilityState === "visible") tick();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
