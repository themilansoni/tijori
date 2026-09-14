"use client";

import { useCallback, useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { mapDocs } from "@/lib/firebase/collection-helpers";
import { useAuth } from "@/lib/auth-context";
import { getFireProfile } from "@/lib/actions/fire";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { FireProfileForm } from "@/components/forms/fire-profile-form";
import { FireChart } from "@/components/charts/fire-chart";
import { calculateTotalPortfolioValue, calculateFireNumber, projectFire, fmtCurrency } from "@/lib/calculations";
import type { FireProfile, InvestmentHolding } from "@/lib/types";

export default function FirePage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<FireProfile | null>(null);
  const [holdings, setHoldings] = useState<InvestmentHolding[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [fireProfile, holdingSnap] = await Promise.all([
      getFireProfile(),
      getDocs(collection(db, "users", user.uid, "investmentHoldings")),
    ]);
    setProfile(fireProfile);
    setHoldings(mapDocs<InvestmentHolding>(holdingSnap));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  if (authLoading || loading) return null;

  const activeHoldings = holdings.filter((h) => h.is_active);
  const currentCorpus = calculateTotalPortfolioValue(activeHoldings).currentValue;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">FIRE Calculator</h1>
        {profile && (
          <Modal trigger={<Button variant="ghost">Edit plan</Button>} title="Edit your FIRE plan">
            <FireProfileForm profile={profile} onSuccess={load} />
          </Modal>
        )}
      </div>
      <p className="mt-2 text-muted">
        Financial Independence, Retire Early — projected from your current investments (including real
        estate) and the contributions you're making today.
      </p>

      {!profile ? (
        <div className="mt-6 max-w-md rounded-[var(--radius-lg)] border border-dashed border-border p-6">
          <p className="font-medium text-foreground">Set up your FIRE plan</p>
          <p className="mt-1 text-[13.5px] text-muted">
            A few numbers about your expenses and goals — you can change these any time.
          </p>
          <div className="mt-4">
            <FireProfileForm onSuccess={load} />
          </div>
        </div>
      ) : (
        <FireResults profile={profile} currentCorpus={currentCorpus} />
      )}
    </div>
  );
}

function FireResults({ profile, currentCorpus }: { profile: FireProfile; currentCorpus: number }) {
  const fireNumberToday = calculateFireNumber(profile.monthly_expenses * 12, profile.safe_withdrawal_percent);
  const progressPercent = fireNumberToday > 0 ? Math.min(100, (currentCorpus / fireNumberToday) * 100) : 0;

  const { points, fireAge } = projectFire({
    currentAge: profile.current_age,
    currentCorpus,
    monthlyExpenses: profile.monthly_expenses,
    monthlyInvestment: profile.monthly_investment,
    expectedReturnPercent: profile.expected_return_percent,
    inflationPercent: profile.inflation_percent,
    swrPercent: profile.safe_withdrawal_percent,
  });

  const yearsToFire = fireAge != null ? fireAge - profile.current_age : null;

  return (
    <div>
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="FIRE Number (today)" value={fmtCurrency(fireNumberToday)} />
        <StatCard label="Current Corpus" value={fmtCurrency(currentCorpus)} tone="accent" />
        <StatCard label="Progress" value={`${progressPercent.toFixed(1)}%`} tone={progressPercent >= 100 ? "success" : "default"} />
        <StatCard
          label={fireAge != null ? "Projected FI Age" : "Years to FI"}
          value={fireAge != null ? String(fireAge) : "60+ yrs"}
          sub={yearsToFire != null ? `${yearsToFire} year${yearsToFire === 1 ? "" : "s"} away` : "Beyond projection horizon"}
        />
      </div>

      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-foreground/8">
        <div
          className={`h-full rounded-full ${progressPercent >= 100 ? "bg-success" : "bg-accent"}`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="mt-6 rounded-xl border border-border bg-surface p-4">
        <div className="mb-2 text-sm font-semibold text-muted">Corpus vs. FIRE target</div>
        <FireChart data={points} />
      </div>
    </div>
  );
}
