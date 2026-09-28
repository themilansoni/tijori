"use client";

import { useEffect, useRef } from "react";
import { getSmsCaptureConfig } from "@/lib/actions/sms-capture";
import { isSmsCaptureSupported, scanAndCaptureSms } from "@/lib/sms-inbox";

const POLL_INTERVAL_MS = 2 * 60 * 1000;

/**
 * Invisible background poller for SMS auto-capture — mounted once in the app shell. No-ops
 * entirely on web (isSmsCaptureSupported is Android-only) and when the feature is off in
 * Settings. Only runs while the tab/app is in the foreground, mirroring the same pattern used
 * for the live price refresh.
 */
export function SmsCaptureEngine() {
  const runningRef = useRef(false);

  useEffect(() => {
    if (!isSmsCaptureSupported()) return;

    async function poll() {
      if (runningRef.current || document.hidden) return;
      runningRef.current = true;
      try {
        const config = await getSmsCaptureConfig();
        if (config?.enabled) {
          await scanAndCaptureSms({
            sinceDate: config.last_processed_date,
            expenseCategoryId: config.expense_category_id,
            incomeCategoryId: config.income_category_id,
          });
        }
      } catch {
        // Best-effort background task — a failed poll just tries again next interval.
      } finally {
        runningRef.current = false;
      }
    }

    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return null;
}
