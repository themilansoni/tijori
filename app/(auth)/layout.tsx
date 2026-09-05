import { TijoriLogo } from "@/components/ui/tijori-logo";
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

        <TijoriLogo variant="white" height={20} className="relative self-start" />

        <div className="relative mx-auto w-full max-w-[280px] text-white/85">
          <SafeSketch className="w-full" />
        </div>

        <TijoriLogo part="full" variant="white" height={68} className="relative self-start" />
      </div>

      <div className="flex min-h-screen flex-col justify-center px-6 py-14 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-sm">
          <TijoriLogo height={26} className="mb-10 lg:mb-14" />

          {children}
        </div>
      </div>
    </div>
  );
}
