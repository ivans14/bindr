import { Leaf, Flame, Droplet, Zap, Eye, Dumbbell, Moon, Cog, Sparkles, Gem, Star } from "lucide-react";
import { TYPE_COLOR } from "@/lib/card-query";
import { cn } from "@/lib/utils";

// Original circular energy-style badges (colored disc + white glyph). Not the
// trademarked TCG symbols, but the same visual language: a colored round token.
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Grass: Leaf,
  Fire: Flame,
  Water: Droplet,
  Lightning: Zap,
  Psychic: Eye,
  Fighting: Dumbbell,
  Darkness: Moon,
  Metal: Cog,
  Fairy: Sparkles,
  Dragon: Gem,
  Colorless: Star,
};

/** `className` should set the badge size (e.g. `size-4`, `size-8`). */
export function TypeIcon({ type, className }: { type: string; className?: string }) {
  const Icon = ICONS[type] ?? Star;
  return (
    <span
      title={type}
      className={cn("inline-flex items-center justify-center rounded-full", className)}
      style={{ background: TYPE_COLOR[type] }}
    >
      <Icon className="size-[62%] text-white" />
    </span>
  );
}
