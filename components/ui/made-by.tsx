export function MadeBy({ className = "" }: { className?: string }) {
  return (
    <p className={`text-[12px] text-muted ${className}`}>
      Made by{" "}
      <a
        href="https://github.com/themilansoni"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium hover:text-accent"
      >
        @themilansoni
      </a>
    </p>
  );
}
