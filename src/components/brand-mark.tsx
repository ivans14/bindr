import { cn } from "@/lib/utils";

/** Original bindr mark — a 9-pocket page abstracted into a holo grid. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden="true">
      <defs>
        <linearGradient id="bindr-holo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="oklch(0.72 0.2 293)" />
          <stop offset="55%" stopColor="oklch(0.75 0.16 330)" />
          <stop offset="100%" stopColor="oklch(0.78 0.15 200)" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width="29" height="29" rx="7" fill="none" stroke="url(#bindr-holo)" strokeWidth="2" />
      <g fill="url(#bindr-holo)">
        <rect x="7" y="7" width="5" height="5" rx="1.4" />
        <rect x="13.5" y="7" width="5" height="5" rx="1.4" opacity="0.55" />
        <rect x="20" y="7" width="5" height="5" rx="1.4" opacity="0.3" />
        <rect x="7" y="13.5" width="5" height="5" rx="1.4" opacity="0.55" />
        <rect x="13.5" y="13.5" width="5" height="5" rx="1.4" />
        <rect x="20" y="13.5" width="5" height="5" rx="1.4" opacity="0.55" />
        <rect x="7" y="20" width="5" height="5" rx="1.4" opacity="0.3" />
        <rect x="13.5" y="20" width="5" height="5" rx="1.4" opacity="0.55" />
        <rect x="20" y="20" width="5" height="5" rx="1.4" />
      </g>
    </svg>
  );
}
