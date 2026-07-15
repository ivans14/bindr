import { Leaf, Flame, Droplet, Zap, Brain, Dumbbell, Moon, Cog, Sparkles, Gem, Star } from "lucide-react";
import { TYPE_COLOR } from "@/lib/card-query";
import { cn } from "@/lib/utils";

// Original, recognizable glyphs per energy type (not the trademarked TCG symbols).
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Grass: Leaf,
  Fire: Flame,
  Water: Droplet,
  Lightning: Zap,
  Psychic: Brain,
  Fighting: Dumbbell,
  Darkness: Moon,
  Metal: Cog,
  Fairy: Sparkles,
  Dragon: Gem,
  Colorless: Star,
};

export function TypeIcon({ type, className }: { type: string; className?: string }) {
  const Icon = ICONS[type] ?? Star;
  return (
    <span style={{ color: TYPE_COLOR[type] }} className="inline-flex">
      <Icon className={cn("shrink-0", className)} />
    </span>
  );
}
