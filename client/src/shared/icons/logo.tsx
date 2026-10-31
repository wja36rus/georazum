import type { SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement> & { size?: number };

/** Логотип «Гео Разум»: метка-дом на градиенте голубой→зелёный. */
export function LogoMark({ size = 32, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" {...props}>
      <defs>
        <linearGradient id="lm-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1f9ad6" />
          <stop offset="1" stopColor="#2e9e5b" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="#232f3e" />
      <path d="M18 46V28l9-8 9 8v18h-6V34h-6v12z" fill="url(#lm-g)" />
      <circle cx="38" cy="24" r="6" fill="#ffffff" opacity="0.9" />
    </svg>
  );
}

/** Логотип с текстом (для сайдбара/шапки). invert — для тёмных фонов. */
export function LogoFull({ size = 28, invert = false }: { size?: number; invert?: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        color: invert ? "#fff" : "var(--text)",
        fontWeight: 800,
        fontSize: 19,
        letterSpacing: "0.01em",
        whiteSpace: "nowrap",
      }}
    >
      <LogoMark size={size} />
      <span>
        Гео Разум
        <span style={{ display: "block", fontSize: 11, fontWeight: 600, color: invert ? "var(--sidebar-text)" : "var(--muted)" }}>
          аналитика участков
        </span>
      </span>
    </span>
  );
}
