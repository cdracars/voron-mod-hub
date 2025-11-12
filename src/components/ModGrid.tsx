import type { Mod } from "@/lib/types";
import { ModCard } from "./ModCard";

interface ModGridProps {
  mods: Mod[];
}

export function ModGrid({ mods }: ModGridProps) {
  if (mods.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-zinc-300 bg-white/80 p-8 text-center text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-300">
        No mods match the current filters. Try widening your search.
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {mods.map((mod) => (
        <ModCard key={`${mod.creator}-${mod.title}`} mod={mod} />
      ))}
    </div>
  );
}
