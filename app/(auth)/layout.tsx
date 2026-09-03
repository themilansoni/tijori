import { TijoriMark } from "@/components/ui/tijori-mark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background px-6 py-14">
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[820px] -translate-x-1/2 -translate-y-1/3 rounded-full opacity-60 blur-[90px]"
        style={{ background: "radial-gradient(circle, rgba(79,70,229,0.14), transparent 70%)" }}
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col items-center gap-7">
        <div className="flex flex-col items-center gap-3">
          <TijoriMark variant="bare" tone="ink" size={40} />
          <div className="text-center">
            <div className="text-[22px] font-semibold tracking-tight text-foreground">Tijori</div>
            <div className="mt-0.5 text-[13px] text-muted">Your money. Organized. Protected.</div>
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
