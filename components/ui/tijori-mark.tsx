/**
 * The Tijori mark: an inset square frame (the vault door) around a diamond
 * (the secured wealth at its core). One shape language, reused everywhere —
 * favicon, sidebar, login, loading, empty states — per the brand system.
 */
export function TijoriMark({
  size = 24,
  variant = "badge",
  tone = "gold",
  className = "",
}: {
  size?: number;
  /** "badge": rounded ink square backdrop (favicon/sidebar). "bare": frame + diamond only, no backdrop. */
  variant?: "badge" | "bare";
  /** Color of the frame/diamond when variant="bare". */
  tone?: "gold" | "ink";
  className?: string;
}) {
  const markColor = tone === "gold" ? "#B8954A" : "#171717";

  if (variant === "bare") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true"
      >
        <rect x="3" y="3" width="26" height="26" rx="6" fill="none" stroke={markColor} strokeWidth="1.6" />
        <path d="M16 10.8 L21.2 16 L16 21.2 L10.8 16 Z" fill={markColor} />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="1" y="1" width="30" height="30" rx="8" fill="#171717" />
      <rect x="8.5" y="8.5" width="15" height="15" rx="3.5" fill="none" stroke="#B8954A" strokeWidth="1.6" />
      <path d="M16 11.8 L20.2 16 L16 20.2 L11.8 16 Z" fill="#B8954A" />
    </svg>
  );
}
