import { TijoriMark } from "@/components/ui/tijori-mark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-2">
      <div className="flex min-h-screen flex-col justify-center px-6 py-14 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-10 flex items-center gap-2.5 lg:mb-14">
            <TijoriMark size={30} className="rounded-[8px]" />
            <span className="text-[16px] font-semibold tracking-tight text-foreground">Tijori</span>
          </div>

          {children}
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-scrim lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(circle at 30% 20%, rgba(99,102,241,0.28), transparent 55%)" }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
          }}
          aria-hidden="true"
        />

        <div className="relative flex items-center gap-2.5">
          <TijoriMark variant="bare" tone="accent" size={26} />
          <span className="text-[15px] font-semibold tracking-tight text-white">Tijori</span>
        </div>

        <div className="relative mx-auto w-full max-w-[340px]">
          <div className="rounded-[var(--radius-lg)] border border-white/10 bg-white/[0.06] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-sm">
            <div className="text-[11px] font-medium uppercase tracking-[0.5px] text-white/50">
              Current Balance
            </div>
            <div className="mt-1.5 text-[32px] font-semibold tracking-tight text-white">₹8,42,300</div>
            <div className="mt-1 text-[13px] font-medium text-[#86efac]">+12.4% this month</div>

            <div className="mt-5 flex items-end gap-1.5 border-t border-white/10 pt-5">
              {[38, 52, 44, 61, 58, 72, 68, 84].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-[3px] bg-white/20"
                  style={{ height: `${h}px` }}
                  aria-hidden="true"
                />
              ))}
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="text-[22px] font-semibold tracking-tight text-white">
            Your money. Organized. Protected.
          </div>
          <p className="mt-2 max-w-[320px] text-[13.5px] text-white/55">
            Expenses, income, budgets, and investments — one clear picture, kept private to you.
          </p>
        </div>
      </div>
    </div>
  );
}
