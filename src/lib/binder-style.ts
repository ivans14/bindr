// Binder backgrounds + decorative sleeve inserts. Pure CSS presets — no assets,
// no external storage, no third-party IP. Values are CSS `background` strings.

export type BinderTheme = { key: string; label: string; background: string };

export const THEMES: BinderTheme[] = [
  { key: "midnight", label: "Midnight", background: "oklch(0.185 0.022 282 / 0.5)" },
  {
    key: "aurora",
    label: "Aurora",
    background:
      "radial-gradient(circle at 18% 20%, oklch(0.32 0.13 293 / 0.55), transparent 60%), radial-gradient(circle at 82% 28%, oklch(0.34 0.11 200 / 0.5), transparent 55%), oklch(0.16 0.02 282)",
  },
  {
    key: "ember",
    label: "Ember",
    background:
      "radial-gradient(circle at 30% 18%, oklch(0.36 0.14 40 / 0.5), transparent 60%), radial-gradient(circle at 78% 80%, oklch(0.3 0.12 20 / 0.4), transparent 55%), oklch(0.16 0.02 40)",
  },
  { key: "ocean", label: "Ocean", background: "linear-gradient(160deg, oklch(0.22 0.07 240), oklch(0.15 0.03 220))" },
  { key: "forest", label: "Forest", background: "linear-gradient(160deg, oklch(0.24 0.08 150), oklch(0.15 0.03 160))" },
  { key: "rose", label: "Rose", background: "linear-gradient(160deg, oklch(0.28 0.1 350), oklch(0.16 0.04 330))" },
];

export const DEFAULT_THEME = "midnight";

export function themeBackground(key: string | null | undefined): string {
  return (THEMES.find((t) => t.key === key) ?? THEMES[0]).background;
}

export type Sleeve = { key: string; label: string; background: string };

export const SLEEVES: Sleeve[] = [
  {
    key: "holo-violet",
    label: "Holo Violet",
    background:
      "conic-gradient(from 210deg, oklch(0.72 0.2 293), oklch(0.75 0.16 330), oklch(0.78 0.15 200), oklch(0.72 0.2 293))",
  },
  {
    key: "flare",
    label: "Flare",
    background: "radial-gradient(circle at 50% 30%, oklch(0.8 0.18 55), oklch(0.55 0.2 25))",
  },
  {
    key: "wave",
    label: "Wave",
    background: "linear-gradient(135deg, oklch(0.7 0.16 235), oklch(0.55 0.14 260))",
  },
  {
    key: "mint",
    label: "Mint",
    background: "linear-gradient(135deg, oklch(0.82 0.14 165), oklch(0.6 0.13 190))",
  },
  {
    key: "gold",
    label: "Gold",
    background: "linear-gradient(135deg, oklch(0.85 0.14 95), oklch(0.62 0.12 75))",
  },
  {
    key: "carbon",
    label: "Carbon",
    background:
      "repeating-linear-gradient(45deg, oklch(0.28 0.02 284), oklch(0.28 0.02 284) 6px, oklch(0.2 0.02 284) 6px, oklch(0.2 0.02 284) 12px)",
  },
];

export function sleeveBackground(key: string | null | undefined): string | null {
  return SLEEVES.find((s) => s.key === key)?.background ?? null;
}
