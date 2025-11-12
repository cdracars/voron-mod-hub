import Head from "next/head";
import type { GetStaticProps } from "next";
import path from "path";
import { promises as fs } from "fs";
import { useMemo, useState } from "react";

import type { Mod, ModsData } from "@/lib/types";
import { FilterPanel, type PrinterKey, type SortOption } from "@/components/FilterPanel";
import { ModGrid } from "@/components/ModGrid";

interface HomeProps {
  mods: Mod[];
  lastUpdated: string;
}

const sorters: Record<SortOption, (a: Mod, b: Mod) => number> = {
  title: (a, b) => a.title.localeCompare(b.title),
  creator: (a, b) => a.creator.localeCompare(b.creator),
  recent: (a, b) => {
    const aTime = a.lastChanged ? new Date(a.lastChanged).getTime() : 0;
    const bTime = b.lastChanged ? new Date(b.lastChanged).getTime() : 0;
    return bTime - aTime;
  },
};

export default function Home({ mods, lastUpdated }: HomeProps) {
  const [search, setSearch] = useState("");
  const [selectedPrinters, setSelectedPrinters] = useState<PrinterKey[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("recent");

  const filteredMods = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const scoped = mods
      .filter((mod) => {
        if (!normalizedSearch) return true;
        return [mod.title, mod.description, mod.creator]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);
      })
      .filter((mod) =>
        selectedPrinters.every((printer) => mod.compatibility[printer] === "✓"),
      );

    return scoped.sort(sorters[sortBy]);
  }, [mods, search, selectedPrinters, sortBy]);

  const handleTogglePrinter = (printer: PrinterKey) => {
    setSelectedPrinters((prev) =>
      prev.includes(printer) ? prev.filter((item) => item !== printer) : [...prev, printer],
    );
  };

  return (
    <>
      <Head>
        <title>Voron Mod Hub</title>
        <meta
          name="description"
          content="Browse, search, and filter the VoronUsers mod catalog with instant client-side filtering."
        />
      </Head>
      <main className="min-h-screen bg-gradient-to-b from-zinc-50 via-white to-zinc-100 px-4 py-10 text-zinc-900 dark:from-black dark:via-zinc-900 dark:to-black sm:px-8">
        <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-10">
          <header className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-gradient-to-r from-zinc-900 via-zinc-800 to-emerald-800 p-8 text-white shadow-xl">
            <div className="flex flex-col gap-3">
              <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Voron Mod Hub</p>
              <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
                The fastest way to explore Voron community mods
              </h1>
              <p className="max-w-2xl text-base text-white/80">
                We automatically parse VoronUsers every day so you can search, filter, and discover mods
                without digging through GitHub tables. Everything is static, fast, and ready for you to find what you need.
              </p>
            </div>
            <div className="flex flex-wrap gap-6 text-sm text-white/80">
              <div>
                <p className="text-3xl font-bold text-white">{mods.length.toLocaleString()}</p>
                <p>Total mods tracked</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{filteredMods.length.toLocaleString()}</p>
                <p>Matching current filters</p>
              </div>
            </div>
          </header>

          <FilterPanel
            search={search}
            onSearchChange={setSearch}
            activePrinters={selectedPrinters}
            onTogglePrinter={handleTogglePrinter}
            sortBy={sortBy}
            onSortChange={setSortBy}
            totalMods={mods.length}
            filteredMods={filteredMods.length}
            lastUpdated={lastUpdated}
          />

          <ModGrid mods={filteredMods} />
        </div>
      </main>
    </>
  );
}

export const getStaticProps: GetStaticProps<HomeProps> = async () => {
  const dataPath = path.join(process.cwd(), "public", "mods.json");

  let modsPayload: ModsData = { mods: [], lastUpdated: new Date().toISOString() };

  try {
    const raw = await fs.readFile(dataPath, "utf-8");
    modsPayload = JSON.parse(raw) as ModsData;
  } catch (error) {
    console.warn("Unable to read mods.json. Did you run npm run parse?", error);
  }

  return {
    props: {
      mods: modsPayload.mods,
      lastUpdated: modsPayload.lastUpdated,
    },
  };
};
