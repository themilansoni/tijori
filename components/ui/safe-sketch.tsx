/**
 * Hand-drawn-style line illustration of a classic steel safe — the literal
 * image behind "Tijori" (Hindi/Gujarati for a safe/treasury chest). Pure
 * line art with a subtle pencil wobble via an SVG turbulence filter, no
 * brand marks or text on the safe itself.
 */
export function SafeSketch({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 360 400" className={className} aria-hidden="true">
      <defs>
        <filter id="pencil-wobble" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.018" numOctaves="2" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>

      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#pencil-wobble)"
      >
        {/* ground shadow */}
        <ellipse cx="180" cy="378" rx="92" ry="8" opacity="0.35" />

        {/* feet */}
        <rect x="98" y="360" width="18" height="14" rx="3" />
        <rect x="244" y="360" width="18" height="14" rx="3" />

        {/* outer body */}
        <rect x="64" y="46" width="232" height="322" rx="16" />

        {/* hinges on the left edge */}
        <rect x="56" y="90" width="14" height="26" rx="4" />
        <rect x="56" y="200" width="14" height="26" rx="4" />
        <rect x="56" y="310" width="14" height="26" rx="4" />

        {/* recessed door panel */}
        <rect x="88" y="70" width="184" height="274" rx="10" />

        {/* blank brand plate */}
        <rect x="150" y="90" width="60" height="14" rx="3" opacity="0.6" />

        {/* combination dial */}
        <circle cx="180" cy="176" r="46" />
        <circle cx="180" cy="176" r="6" />
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i / 12) * Math.PI * 2;
          const x1 = 180 + Math.cos(angle) * 38;
          const y1 = 176 + Math.sin(angle) * 38;
          const x2 = 180 + Math.cos(angle) * 46;
          const y2 = 176 + Math.sin(angle) * 46;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
        })}
        <line x1="180" y1="176" x2="180" y2="138" />

        {/* handle / bolt lever */}
        <rect x="130" y="268" width="100" height="20" rx="10" />
        <line x1="150" y1="268" x2="150" y2="250" />
        <line x1="210" y1="268" x2="210" y2="250" />
        <line x1="150" y1="250" x2="210" y2="250" />
      </g>
    </svg>
  );
}
