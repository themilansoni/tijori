"use client";

import { useCallback, useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { mapDocs } from "@/lib/firebase/collection-helpers";
import { useAuth } from "@/lib/auth-context";
import { getFireProfile, saveFireProfile } from "@/lib/actions/fire";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { SliderField } from "@/components/ui/slider-field";
import { FireProfileForm } from "@/components/forms/fire-profile-form";
import { FireChart } from "@/components/charts/fire-chart";
import {
  calculateTotalPortfolioValue,
  calculateFireNumber,
  calculateLoanTotals,
  projectFire,
  accountBalance,
  isCashAccount,
  fmtCurrency,
} from "@/lib/calculations";
import type { Account, FireProfile, InvestmentHolding, Loan, Transaction } from "@/lib/types";

type CorpusMode = "investments" | "netWorth";

type Scenario = {
  currentAge: number;
  retirementAge: number;
  monthlyExpenses: number;
  monthlyInvestment: number;
  expectedReturn: number;
  inflation: number;
  swr: number;
};

function scenarioFromProfile(p: FireProfile): Scenario {
  return {
    currentAge: p.current_age,
    retirementAge: p.retirement_age,
    monthlyExpenses: p.monthly_expenses,
    monthlyInvestment: p.monthly_investment,
    expectedReturn: p.expected_return_percent,
    inflation: p.inflation_percent,
    swr: p.safe_withdrawal_percent,
  };
}

export default function FirePage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<FireProfile | null>(null);
  const [holdings, setHoldings] = useState<InvestmentHolding[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [corpusMode, setCorpusMode] = useState<CorpusMode>("investments");
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const uid = user.uid;
    const [fireProfile, holdingSnap, accSnap, txSnap, loanSnap] = await Promise.all([
      getFireProfile(),
      getDocs(collection(db, "users", uid, "investmentHoldings")),
      getDocs(collection(db, "users", uid, "accounts")),
      getDocs(collection(db, "users", uid, "transactions")),
      getDocs(collection(db, "users", uid, "loans")),
    ]);
    setProfile(fireProfile);
    setHoldings(mapDocs<InvestmentHolding>(holdingSnap));
    setAccounts(mapDocs<Account>(accSnap));
    setTransactions(mapDocs<Transaction>(txSnap));
    setLoans(mapDocs<Loan>(loanSnap));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // Re-sync the interactive sliders whenever the saved plan changes (initial load, or after Save).
  useEffect(() => {
    if (profile) setScenario(scenarioFromProfile(profile));
  }, [profile]);

  if (authLoading || loading) return null;

  const activeHoldings = holdings.filter((h) => h.is_active);
  const investmentsCorpus = calculateTotalPortfolioValue(activeHoldings).currentValue;
  const cashBalance = accounts
    .filter((a) => a.is_active && isCashAccount(a))
    .reduce((sum, a) => sum + accountBalance(a, transactions), 0);
  const netWorthCorpus = investmentsCorpus + cashBalance;
  const grossCorpus = corpusMode === "netWorth" ? netWorthCorpus : investmentsCorpus;
  const loanOutstanding = calculateLoanTotals(loans).totalOutstanding;
  const currentCorpus = grossCorpus - loanOutstanding;

  const dirty =
    profile != null &&
    scenario != null &&
    (scenario.currentAge !== profile.current_age ||
      scenario.retirementAge !== profile.retirement_age ||
      scenario.monthlyExpenses !== profile.monthly_expenses ||
      scenario.monthlyInvestment !== profile.monthly_investment ||
      scenario.expectedReturn !== profile.expected_return_percent ||
      scenario.inflation !== profile.inflation_percent ||
      scenario.swr !== profile.safe_withdrawal_percent);

  function updateScenario(patch: Partial<Scenario>) {
    setScenario((s) => (s ? { ...s, ...patch } : s));
  }

  function handleReset() {
    if (profile) setScenario(scenarioFromProfile(profile));
  }

  async function handleSaveScenario() {
    if (!scenario) return;
    setSaving(true);
    const formData = new FormData();
    formData.set("current_age", String(scenario.currentAge));
    formData.set("retirement_age", String(scenario.retirementAge));
    formData.set("monthly_expenses", String(scenario.monthlyExpenses));
    formData.set("monthly_investment", String(scenario.monthlyInvestment));
    formData.set("expected_return_percent", String(scenario.expectedReturn));
    formData.set("inflation_percent", String(scenario.inflation));
    formData.set("safe_withdrawal_percent", String(scenario.swr));
    await saveFireProfile(formData);
    await load();
    setSaving(false);
  }

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
        estate) and the contributions you're making today. Drag the sliders below to try different
        scenarios live.
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
      ) : scenario ? (
        <>
          <div className="mt-5 inline-flex rounded-[10px] border border-border bg-surface-2 p-1 text-[13px]">
            <button
              type="button"
              onClick={() => setCorpusMode("investments")}
              className={`rounded-[7px] px-3.5 py-1.5 font-medium transition ${
                corpusMode === "investments" ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground"
              }`}
            >
              Investments only
            </button>
            <button
              type="button"
              onClick={() => setCorpusMode("netWorth")}
              className={`rounded-[7px] px-3.5 py-1.5 font-medium transition ${
                corpusMode === "netWorth" ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground"
              }`}
            >
              Fetch Net Worth (+ cash)
            </button>
          </div>
          <p className="mt-1.5 text-[12px] text-muted">
            {corpusMode === "netWorth"
              ? `Using investments + your cash/bank balance: ${fmtCurrency(netWorthCorpus)}.`
              : `Using investments only (today's default): ${fmtCurrency(investmentsCorpus)}.`}
            {loanOutstanding > 0 && ` Minus ${fmtCurrency(loanOutstanding)} in outstanding loans = ${fmtCurrency(currentCorpus)} net.`}
          </p>

          <FireResults scenario={scenario} currentCorpus={currentCorpus} />

          <div className="mt-6 rounded-xl border border-border bg-surface p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm font-semibold text-muted">Try a different scenario</div>
              {dirty && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-[12.5px] text-muted transition hover:text-foreground"
                  >
                    Reset
                  </button>
                  <Button size="sm" onClick={handleSaveScenario} disabled={saving}>
                    {saving ? "Saving…" : "Save as my plan"}
                  </Button>
                </div>
              )}
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <SliderField
                label="Current age"
                value={scenario.currentAge}
                min={18}
                max={70}
                step={1}
                format={(v) => `${v}`}
                onChange={(v) => updateScenario({ currentAge: v })}
              />
              <SliderField
                label="Target retirement age"
                value={scenario.retirementAge}
                min={scenario.currentAge + 1}
                max={80}
                step={1}
                format={(v) => `${v}`}
                onChange={(v) => updateScenario({ retirementAge: v })}
              />
              <SliderField
                label="Monthly expenses"
                value={scenario.monthlyExpenses}
                min={0}
                max={500000}
                step={1000}
                format={fmtCurrency}
                onChange={(v) => updateScenario({ monthlyExpenses: v })}
              />
              <SliderField
                label="Monthly investment"
                value={scenario.monthlyInvestment}
                min={0}
                max={500000}
                step={1000}
                format={fmtCurrency}
                onChange={(v) => updateScenario({ monthlyInvestment: v })}
              />
              <SliderField
                label="Expected annual return"
                value={scenario.expectedReturn}
                min={1}
                max={20}
                step={0.5}
                format={(v) => `${v}%`}
                onChange={(v) => updateScenario({ expectedReturn: v })}
              />
              <SliderField
                label="Inflation"
                value={scenario.inflation}
                min={0}
                max={15}
                step={0.5}
                format={(v) => `${v}%`}
                onChange={(v) => updateScenario({ inflation: v })}
              />
              <SliderField
                label="Safe withdrawal rate"
                value={scenario.swr}
                min={2}
                max={8}
                step={0.1}
                format={(v) => `${v.toFixed(1)}%`}
                onChange={(v) => updateScenario({ swr: v })}
              />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function FireResults({ scenario, currentCorpus }: { scenario: Scenario; currentCorpus: number }) {
  const fireNumberToday = calculateFireNumber(scenario.monthlyExpenses * 12, scenario.swr);
  const progressPercent =
    fireNumberToday > 0 ? Math.max(0, Math.min(100, (currentCorpus / fireNumberToday) * 100)) : 0;

  const { points, fireAge } = projectFire({
    currentAge: scenario.currentAge,
    currentCorpus,
    monthlyExpenses: scenario.monthlyExpenses,
    monthlyInvestment: scenario.monthlyInvestment,
    expectedReturnPercent: scenario.expectedReturn,
    inflationPercent: scenario.inflation,
    swrPercent: scenario.swr,
  });

  const yearsToFire = fireAge != null ? fireAge - scenario.currentAge : null;

  const vsTarget =
    fireAge == null
      ? { text: `Won't reach FI within the projection horizon — target age ${scenario.retirementAge} is out of reach at this rate.`, tone: "danger" as const }
      : fireAge < scenario.retirementAge
      ? { text: `${scenario.retirementAge - fireAge} year${scenario.retirementAge - fireAge === 1 ? "" : "s"} ahead of your target age ${scenario.retirementAge}`, tone: "success" as const }
      : fireAge > scenario.retirementAge
      ? { text: `${fireAge - scenario.retirementAge} year${fireAge - scenario.retirementAge === 1 ? "" : "s"} behind your target age ${scenario.retirementAge}`, tone: "danger" as const }
      : { text: `Right on target for age ${scenario.retirementAge}`, tone: "success" as const };

  return (
    <div>
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="FIRE Number (today)" value={fmtCurrency(fireNumberToday)} />
        <StatCard
          label="Current Corpus"
          value={fmtCurrency(currentCorpus)}
          tone={currentCorpus < 0 ? "danger" : "accent"}
        />
        <StatCard label="Progress" value={`${progressPercent.toFixed(1)}%`} tone={progressPercent >= 100 ? "success" : "default"} />
        <StatCard
          label={fireAge != null ? "Projected FI Age" : "Years to FI"}
          value={fireAge != null ? String(fireAge) : "60+ yrs"}
          sub={yearsToFire != null ? `${yearsToFire} year${yearsToFire === 1 ? "" : "s"} away` : "Beyond projection horizon"}
        />
      </div>

      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-foreground/8">
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${progressPercent >= 100 ? "bg-success" : "bg-accent"}`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div
        className={`mt-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium ${
          vsTarget.tone === "success" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
        }`}
      >
        {vsTarget.text}
      </div>

      <div className="mt-6 rounded-xl border border-border bg-surface p-4">
        <div className="mb-2 text-sm font-semibold text-muted">Corpus vs. FIRE target</div>
        <FireChart data={points} />
      </div>
    </div>
  );
}
