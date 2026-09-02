import { TijoriMark } from "@/components/ui/tijori-mark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-6 py-14">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)",
            backgroundSize: "30px 30px",
            WebkitMaskImage:
              "radial-gradient(ellipse 60% 55% at 50% 42%, black 0%, transparent 75%)",
            maskImage:
              "radial-gradient(ellipse 60% 55% at 50% 42%, black 0%, transparent 75%)",
          }}
        />
        <div
          className="absolute left-1/2 top-1/2 h-[640px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[10px] animate-pulse"
          style={{
            background:
              "radial-gradient(circle, rgba(43,255,176,0.16), transparent 68%)",
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="flex items-center gap-2.5">
          <TijoriMark size={26} className="rounded-[8px] shadow-[0_0_14px_rgba(43,255,176,0.35)]" />
          <span className="font-mono text-[13px] font-medium tracking-[3px] text-muted">
            TIJORI<span className="text-accent animate-pulse">_</span>
          </span>
        </div>

        {children}
      </div>
    </div>
  );
}
