import { TijoriWordmark } from "@/components/ui/tijori-wordmark";
import { SafeSketch } from "@/components/ui/safe-sketch";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-2">
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

        <TijoriWordmark className="relative text-[17px] text-white" />

        <div className="relative mx-auto w-full max-w-[280px] text-white/85">
          <SafeSketch className="w-full" />
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

      <div className="flex min-h-screen flex-col justify-center px-6 py-14 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-sm">
          <TijoriWordmark className="mb-10 block text-[20px] text-foreground lg:mb-14" />

          {children}
        </div>
      </div>
    </div>
  );
}
