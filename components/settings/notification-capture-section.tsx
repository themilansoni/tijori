"use client";

import { useEffect, useState } from "react";
import {
  isNotificationCaptureSupported,
  isListenerEnabled as checkListenerEnabled,
  openListenerSettings,
} from "@/lib/notification-capture";
import { getNotificationCaptureConfig, setNotificationCaptureConfig } from "@/lib/actions/notification-capture";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/field";
import type { Category, NotificationCaptureConfig } from "@/lib/types";

export function NotificationCaptureSection({
  expenseCategories,
  incomeCategories,
}: {
  expenseCategories: Category[];
  incomeCategories: Category[];
}) {
  const supported = isNotificationCaptureSupported();
  const [config, setConfig] = useState<NotificationCaptureConfig | null | undefined>(undefined);
  const [listenerEnabled, setListenerEnabled] = useState(false);
  const [expenseCategoryId, setExpenseCategoryId] = useState("");
  const [incomeCategoryId, setIncomeCategoryId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!supported) return;
    getNotificationCaptureConfig().then((c) => {
      setConfig(c);
      if (c) {
        setExpenseCategoryId(c.expense_category_id);
        setIncomeCategoryId(c.income_category_id);
      }
    });
    checkListenerEnabled().then(setListenerEnabled);
  }, [supported]);

  async function handleToggle(next: boolean) {
    setError(undefined);
    if (next && (!expenseCategoryId || !incomeCategoryId)) {
      setError("Pick a default expense and income category first.");
      return;
    }
    setPending(true);
    const result = await setNotificationCaptureConfig(next, expenseCategoryId, incomeCategoryId);
    setPending(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setConfig(await getNotificationCaptureConfig());
  }

  if (!supported) {
    return (
      <section className="mt-8">
        <h2 className="text-sm font-semibold text-muted">Automatic capture</h2>
        <p className="mt-1.5 text-[13px] text-muted">
          Only available in the Android app — use "Paste SMS" on Expenses here on web.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold text-muted">Automatic capture</h2>
      <p className="mt-1.5 text-[13px] text-muted">
        Reads bank/UPI payment notifications on your phone (GPay, PhonePe, your bank app, SMS) and
        auto-logs matching ones as transactions using the categories below. Requests no
        install-time permission — you grant access from a system settings screen instead, and can
        revoke it there any time. This is a different, untested path from the SMS auto-capture
        removed in 2.0.1; it may still get flagged by Google Play Protect on a sideloaded install.
        If so, "Paste SMS" on Expenses is the fallback.
      </p>

      <div className="mt-3 rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm">Notification access: {listenerEnabled ? "granted" : "not granted"}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
              await openListenerSettings();
              setTimeout(() => checkListenerEnabled().then(setListenerEnabled), 1000);
            }}
          >
            {listenerEnabled ? "Manage" : "Grant access"}
          </Button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Default expense category"
            name="expense_category_id"
            value={expenseCategoryId}
            onChange={(e) => setExpenseCategoryId(e.target.value)}
          >
            <option value="">Select category</option>
            {expenseCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Default income category"
            name="income_category_id"
            value={incomeCategoryId}
            onChange={(e) => setIncomeCategoryId(e.target.value)}
          >
            <option value="">Select category</option>
            {incomeCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </SelectField>
        </div>

        {error && <p className="mt-2 text-[13px] text-danger">{error}</p>}

        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm">{config?.enabled ? "Auto-capture is on" : "Auto-capture is off"}</span>
          {config?.enabled ? (
            <Button size="sm" variant="danger" disabled={pending} onClick={() => handleToggle(false)}>
              Turn off
            </Button>
          ) : (
            <Button size="sm" disabled={pending || !listenerEnabled} onClick={() => handleToggle(true)}>
              Turn on
            </Button>
          )}
        </div>
        {!listenerEnabled && (
          <p className="mt-2 text-[12px] text-muted">Grant notification access above before turning this on.</p>
        )}
      </div>
    </section>
  );
}
