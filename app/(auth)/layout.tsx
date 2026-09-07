import { TijoriLogo } from "@/components/ui/tijori-logo";
import { SafeSketch } from "@/components/ui/safe-sketch";

const PARTICLES = [
  { left: "14%", size: 16, delay: "0s", duration: "3.4s", opacity: 0.55 },
  { left: "26%", size: 12, delay: "1s", duration: "4.2s", opacity: 0.35 },
  { left: "40%", size: 15, delay: "0.5s", duration: "3.8s", opacity: 0.5 },
  { left: "55%", size: 12, delay: "1.6s", duration: "3.6s", opacity: 0.3 },
  { left: "68%", size: 17, delay: "1.2s", duration: "4.6s", opacity: 0.45 },
  { left: "80%", size: 12, delay: "2.1s", duration: "3.4s", opacity: 0.35 },
  { left: "90%", size: 15, delay: "0.8s", duration: "4s", opacity: 0.4 },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-scrim lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div
          className="auth-glow pointer-events-none absolute inset-0"
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

        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="auth-particle pointer-events-none absolute bottom-24 font-semibold text-white"
            style={{
              left: p.left,
              fontSize: p.size,
              animationDelay: p.delay,
              animationDuration: p.duration,
              ["--particle-opacity" as string]: p.opacity,
            }}
            aria-hidden="true"
          >
            ₹
          </span>
        ))}

        <div aria-hidden="true" className="relative" />

        <div className="relative mx-auto w-full max-w-[280px] text-white/85">
          <SafeSketch className="w-full" animated />
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
