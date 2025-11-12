import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import type { MouseEvent } from "react";

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
  const { basePath } = useRouter();
  const lastChanged = mod.lastChanged
    ? new Date(mod.lastChanged).toLocaleDateString(undefined, { dateStyle: "medium" })
    : undefined;
  const resolvedImage =
    mod.image && !mod.image.startsWith("http") ? `${basePath}${mod.image}` : mod.image;

  const openExternal = (url?: string) => {
    if (!url || typeof window === "undefined") return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleCreatorClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.preventDefault();
    openExternal(mod.authorSlug ? `https://github.com/${mod.authorSlug}` : undefined);
  };

  const handleReadmeClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.preventDefault();
    openExternal(mod.readmeUrl);
  };

  return (
    <article>
      <Link
        href={mod.link}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-white/90 shadow-sm transition hover:-translate-y-1 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 dark:bg-zinc-900/70"
      >
        <div className="flex flex-col gap-3 p-5">
          <div className="relative -mx-1 -mt-1 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/40">
            {resolvedImage ? (
              <Image
                src={resolvedImage}
                alt={`${mod.title} preview`}
                width={640}
                height={320}
                className="h-40 w-full object-cover transition duration-200 group-hover:scale-[1.02]"
                unoptimized
                loading="lazy"
              />
            ) : (
              <div className="flex h-40 w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-zinc-800 via-zinc-700 to-zinc-900 text-zinc-400">
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  className="h-8 w-8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 7h3l2-3h8l2 3h3v12H3z" />
                  <circle cx="12" cy="13" r="3" />
                </svg>
                <span className="text-xs font-medium uppercase tracking-wide">No preview</span>
              </div>
            )}
          </div>
          <div>
            {mod.authorSlug ? (
              <button
                type="button"
                onClick={handleCreatorClick}
                className="text-xs uppercase tracking-wide text-emerald-600 underline-offset-2 hover:text-emerald-400 hover:underline dark:text-emerald-300"
              >
                {mod.creator}
              </button>
            ) : (
              <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {mod.creator}
              </p>
            )}
            <h3 className="mt-1 text-xl font-semibold text-zinc-900 transition group-hover:text-emerald-700 dark:text-white dark:group-hover:text-emerald-300">
              {mod.title}
            </h3>
            {lastChanged ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Updated {lastChanged}</p>
            ) : null}
          </div>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            {mod.description}
          </p>
          {mod.readmeUrl ? (
            <div>
              <button
                type="button"
                onClick={handleReadmeClick}
                className="inline-flex items-center gap-1 rounded-full border border-zinc-300 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-600 transition hover:border-emerald-400 hover:text-emerald-400 dark:border-zinc-600 dark:text-emerald-300"
              >
                README
                <span aria-hidden>↗</span>
              </button>
            </div>
          ) : null}
        </div>

        <div className="mt-2 flex flex-col gap-4 border-t border-white/10 p-5 pt-4">
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

          <span className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition group-hover:bg-emerald-600 dark:bg-emerald-600">
            View on GitHub
            <span aria-hidden>→</span>
          </span>
        </div>
      </Link>
    </article>
  );
}
