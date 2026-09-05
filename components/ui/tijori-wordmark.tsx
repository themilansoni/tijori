/**
 * The Tijori logo is the name itself — no separate icon glyph. One
 * component, one place to tune weight/tracking, reused everywhere the
 * brand appears (nav, mobile header, auth screens).
 */
export function TijoriWordmark({ className = "" }: { className?: string }) {
  return <span className={`font-bold tracking-tight ${className}`}>Tijori</span>;
}
