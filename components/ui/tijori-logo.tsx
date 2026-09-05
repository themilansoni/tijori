/* eslint-disable @next/next/no-img-element */

/**
 * The real Tijori logo (provided as artwork, not redrawn) — pre-processed
 * into transparent-background black/white PNGs in public/brand/ so it can
 * sit on any surface. "wordmark" is just the name; "full" includes the
 * Hindi tagline ("Apna paisa, apni Tijori" — your money, your safe) baked
 * into the same artwork.
 */
export function TijoriLogo({
  part = "wordmark",
  variant = "auto",
  height = 24,
  className = "",
}: {
  part?: "full" | "wordmark";
  /** "auto" follows the site theme (needs a light/dark-capable background). Use "black"/"white" on a background that doesn't flip with theme. */
  variant?: "auto" | "black" | "white";
  height?: number;
  className?: string;
}) {
  const base = part === "full" ? "tijori-full" : "tijori-wordmark";

  if (variant !== "auto") {
    return (
      <img
        src={`/brand/${base}-${variant}.png`}
        alt="Tijori"
        style={{ height }}
        className={`w-auto ${className}`}
      />
    );
  }

  return (
    <>
      <img
        src={`/brand/${base}-black.png`}
        alt="Tijori"
        style={{ height }}
        className={`w-auto dark:hidden ${className}`}
      />
      <img
        src={`/brand/${base}-white.png`}
        alt="Tijori"
        style={{ height }}
        className={`hidden w-auto dark:block ${className}`}
      />
    </>
  );
}
