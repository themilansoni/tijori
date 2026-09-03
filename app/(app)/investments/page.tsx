import { createClient } from "@/lib/supabase/server";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { InvestmentForm } from "@/components/forms/investment-form";
import { InvestmentRow } from "./investment-row";
import { ContributionRow } from "./contribution-row";
import { TijoriMark } from "@/components/ui/tijori-mark";
import {
  investmentNetInvested,
  investmentPortfolioTotals,
  fmtCurrency,
} from "@/lib/calculations";
import type { Account, Investment, InvestmentTransaction } from "@/lib/types";

export default async function InvestmentsPage() {
  const supabase = await createClient();

  const [{ data: investmentsRaw }, { data: txRaw }, { data: accountsRaw }] = await Promise.all([
    supabase.from("investments").select("*").order("created_at"),
    supabase.from("investment_transactions").select("*").order("transaction_date", { ascending: false }),
    supabase.from("accounts").select("*").eq("is_active", true).order("name"),
  ]);

  const investments = (investmentsRaw ?? []) as Investment[];
  const allContributions = (txRaw ?? []) as InvestmentTransaction[];
  const accounts = (accountsRaw ?? []) as Account[];

  const active = investments.filter((i) => i.is_active);
  const inactive = investments.filter((i) => !i.is_active);
  const investmentById = new Map(investments.map((i) => [i.id, i]));

  const { totalInvested, totalWithdrawn, netInvested } = investmentPortfolioTotals(allContributions);
  const recentContributions = allContributions.slice(0, 8);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Investments</h1>
        <Modal trigger={<Button>+ Add investment</Button>} title="Add investment">
          <InvestmentForm />
        </Modal>
      </div>
      <p className="mt-2 text-muted">
        Track what you&apos;ve put into each investment over time — amounts are logged as contributions,
        never estimated.
      </p>

      {investments.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
          <StatCard label="Total Invested" value={fmtCurrency(totalInvested)} tone="success" />
          <StatCard label="Total Withdrawn" value={fmtCurrency(totalWithdrawn)} />
          <StatCard label="Net Invested" value={fmtCurrency(netInvested)} tone={netInvested < 0 ? "danger" : "accent"} />
        </div>
      )}

      <div className="mt-6">
        {investments.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-border p-12 text-center">
            <TijoriMark variant="bare" tone="ink" size={30} className="mx-auto opacity-40" />
            <p className="mt-4 font-medium text-foreground">No investments yet</p>
            <p className="mt-1 text-[13.5px] text-muted">
              Add a mutual fund, stock, FD, or other investment to start tracking it.
            </p>
            <div className="mt-4">
              <Modal trigger={<Button>+ Add investment</Button>} title="Add investment">
                <InvestmentForm />
              </Modal>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {active.map((inv) => (
              <InvestmentRow
                key={inv.id}
                investment={inv}
                netInvested={investmentNetInvested(inv.id, allContributions)}
                accounts={accounts}
              />
            ))}
            {inactive.map((inv) => (
              <InvestmentRow
                key={inv.id}
                investment={inv}
                netInvested={investmentNetInvested(inv.id, allContributions)}
                accounts={accounts}
              />
            ))}
          </div>
        )}
      </div>

      {recentContributions.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Recent Contributions</h2>
          <div className="mt-3 divide-y divide-border rounded-xl border border-border bg-surface px-4">
            {recentContributions.map((tx) => (
              <ContributionRow
                key={tx.id}
                tx={tx}
                investmentName={investmentById.get(tx.investment_id)?.name ?? "—"}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
