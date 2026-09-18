"use client";

import { useCallback, useEffect, useState } from "react";
import { getAppLockConfig, hashPin, type AppLockConfig } from "@/lib/actions/app-lock";
import { LockScreen } from "./lock-screen";

const SESSION_KEY = "tijori_unlocked";

/**
 * Gates the app behind a PIN, if one is configured (Settings → App Lock). Re-locks whenever the
 * tab/app is backgrounded (visibilitychange → hidden) so picking the phone back up always re-
 * prompts — the same pattern banking apps use. Internal navigation within one open session never
 * re-prompts, tracked via sessionStorage rather than component state so it survives re-mounts.
 */
export function AppLockGate({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AppLockConfig | null | undefined>(undefined);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    getAppLockConfig().then(setConfig);
  }, []);

  useEffect(() => {
    try {
      setUnlocked(sessionStorage.getItem(SESSION_KEY) === "1");
    } catch {
      setUnlocked(true); // sessionStorage unavailable (private mode etc.) — don't lock the user out
    }
  }, []);

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "hidden") {
        try {
          sessionStorage.removeItem(SESSION_KEY);
        } catch {
          // ignore
        }
        setUnlocked(false);
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const handleSubmit = useCallback(
    async (pin: string) => {
      if (!config) return false;
      const hash = await hashPin(pin);
      if (hash !== config.pin_hash) return false;
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        // ignore — still unlock for this render even if we can't persist it
      }
      setUnlocked(true);
      return true;
    },
    [config]
  );

  if (config === undefined) return null;
  if (config === null || unlocked) return <>{children}</>;

  return <LockScreen pinLength={config.pin_length} onSubmit={handleSubmit} />;
}
