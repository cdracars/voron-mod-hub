import type { Mod } from "@/lib/types";
import type { PrinterKey } from "./FilterPanel";

const COMPATIBILITY_ORDER: { key: PrinterKey; label: string }[] = [
  { key: "v0", label: "V0" },
  { key: "v0_1", label: "V0.1" },
  { key: "v1_8", label: "V1.8" },
  { key: "v2_4", label: "V2.4" },
  { key: "trident", label: "Trident" },
];

const STATUS_STYLES: Record<string, string> = {
  "✓": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100",
  "✗": "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  "?": "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-100",
};

interface ModCardProps {
  mod: Mod;
}

export function ModCard({ mod }: ModCardProps) {
  const lastChanged = mod.lastChanged
    ? new Date(mod.lastChanged).toLocaleDateString(undefined, { dateStyle: "medium" })
    : undefined;

  return (
    <article className="flex h-full flex-col justify-between rounded-3xl border border-white/10 bg-white/90 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:bg-zinc-900/70">
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {mod.creator}
          </p>
          <h3 className="mt-1 text-xl font-semibold text-zinc-900 dark:text-white">
            {mod.title}
          </h3>
          {lastChanged ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Updated {lastChanged}</p>
          ) : null}
        </div>
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          {mod.description}
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {COMPATIBILITY_ORDER.map(({ key, label }) => {
            const status = mod.compatibility[key];
            const badgeStyle = STATUS_STYLES[status] ?? STATUS_STYLES["?"];
            return (
              <span
                key={key}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${badgeStyle}`}
              >
                <span aria-hidden>{status}</span>
                {label}
              </span>
            );
          })}
        </div>

        <a
          href={mod.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 dark:bg-emerald-600"
        >
          View on GitHub
          <span aria-hidden>→</span>
        </a>
      </div>
    </article>
  );
}
