"use client";

import { useEffect, useState } from "react";
import { getAppLockConfig, hashPin, setAppLockPin, removeAppLockPin, type AppLockConfig } from "@/lib/actions/app-lock";
import { Button } from "@/components/ui/button";

const PIN_INPUT_CLASS =
  "mt-1.5 w-full rounded-[9px] border border-border bg-surface px-[13px] py-2.5 text-[14px] tracking-[0.3em] text-foreground placeholder:tracking-normal placeholder:text-muted/60 transition focus:outline-none focus:border-accent focus:shadow-[0_0_0_3px_rgba(79,70,229,0.16)]";

type Mode = "idle" | "set" | "change" | "remove";

export function AppLockSection() {
  const [config, setConfig] = useState<AppLockConfig | null | undefined>(undefined);
  const [mode, setMode] = useState<Mode>("idle");

  useEffect(() => {
    getAppLockConfig().then(setConfig);
  }, []);

  function handleDone() {
    setMode("idle");
    getAppLockConfig().then(setConfig);
  }

  if (config === undefined) return null;

  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold text-muted">App lock</h2>
      <p className="mt-1.5 text-[13px] text-muted">
        A PIN gate shown whenever the app is reopened or brought back from the background — useful
        since your Tijori sign-in stays logged in on this device otherwise.
      </p>

      {mode === "idle" && (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
          <span className="text-sm">{config ? "PIN lock is on" : "PIN lock is off"}</span>
          <div className="flex gap-2">
            {config ? (
              <>
                <Button size="sm" variant="ghost" onClick={() => setMode("change")}>
                  Change PIN
                </Button>
                <Button size="sm" variant="danger" onClick={() => setMode("remove")}>
                  Remove
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => setMode("set")}>
                Set up PIN
              </Button>
            )}
          </div>
        </div>
      )}

      {mode === "set" && <SetPinForm onDone={handleDone} onCancel={() => setMode("idle")} />}
      {mode === "change" && config && (
        <ChangePinForm currentHash={config.pin_hash} onDone={handleDone} onCancel={() => setMode("idle")} />
      )}
      {mode === "remove" && config && (
        <RemovePinForm currentHash={config.pin_hash} onDone={handleDone} onCancel={() => setMode("idle")} />
      )}
    </section>
  );
}

function PinField({
  label,
  value,
  onChange,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <label className="mt-3 block first:mt-0">
      <span className="block text-[12.5px] font-medium tracking-[0.2px] text-muted">{label}</span>
      <input
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={6}
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
        placeholder="4-6 digits"
        className={PIN_INPUT_CLASS}
      />
    </label>
  );
}

function SetPinForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function handleSubmit() {
    setError(undefined);
    if (pin.length < 4) {
      setError("PIN must be 4 to 6 digits.");
      return;
    }
    if (pin !== confirm) {
      setError("PINs don't match.");
      return;
    }
    setPending(true);
    const result = await setAppLockPin(pin);
    setPending(false);
    if (result && "error" in result) {
      setError(result.error);
      return;
    }
    onDone();
  }

  return (
    <div className="mt-3 rounded-xl border border-accent/35 bg-surface-2 p-4">
      <PinField label="New PIN" value={pin} onChange={setPin} autoFocus />
      <PinField label="Confirm PIN" value={confirm} onChange={setConfirm} />
      {error && <p className="mt-2 text-[12px] text-danger">{error}</p>}
      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSubmit} disabled={pending}>
          {pending ? "Saving…" : "Save PIN"}
        </Button>
      </div>
    </div>
  );
}

function ChangePinForm({
  currentHash,
  onDone,
  onCancel,
}: {
  currentHash: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [current, setCurrent] = useState("");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function handleSubmit() {
    setError(undefined);
    const currentOk = (await hashPin(current)) === currentHash;
    if (!currentOk) {
      setError("Current PIN is incorrect.");
      return;
    }
    if (pin.length < 4) {
      setError("New PIN must be 4 to 6 digits.");
      return;
    }
    if (pin !== confirm) {
      setError("New PINs don't match.");
      return;
    }
    setPending(true);
    const result = await setAppLockPin(pin);
    setPending(false);
    if (result && "error" in result) {
      setError(result.error);
      return;
    }
    onDone();
  }

  return (
    <div className="mt-3 rounded-xl border border-accent/35 bg-surface-2 p-4">
      <PinField label="Current PIN" value={current} onChange={setCurrent} autoFocus />
      <PinField label="New PIN" value={pin} onChange={setPin} />
      <PinField label="Confirm new PIN" value={confirm} onChange={setConfirm} />
      {error && <p className="mt-2 text-[12px] text-danger">{error}</p>}
      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSubmit} disabled={pending}>
          {pending ? "Saving…" : "Save PIN"}
        </Button>
      </div>
    </div>
  );
}

function RemovePinForm({
  currentHash,
  onDone,
  onCancel,
}: {
  currentHash: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [current, setCurrent] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function handleSubmit() {
    setError(undefined);
    const currentOk = (await hashPin(current)) === currentHash;
    if (!currentOk) {
      setError("Current PIN is incorrect.");
      return;
    }
    setPending(true);
    const result = await removeAppLockPin();
    setPending(false);
    if (result && "error" in result) {
      setError(result.error);
      return;
    }
    onDone();
  }

  return (
    <div className="mt-3 rounded-xl border border-danger/35 bg-surface-2 p-4">
      <PinField label="Current PIN" value={current} onChange={setCurrent} autoFocus />
      {error && <p className="mt-2 text-[12px] text-danger">{error}</p>}
      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button size="sm" variant="danger" onClick={handleSubmit} disabled={pending}>
          {pending ? "Removing…" : "Remove PIN lock"}
        </Button>
      </div>
    </div>
  );
}
