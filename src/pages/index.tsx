import Head from "next/head";
import type { GetStaticProps } from "next";
import path from "path";
import { promises as fs } from "fs";
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/router";

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
const PAGE_SIZE = 24;
const PRINTER_KEYS: PrinterKey[] = ["v0", "v0_1", "v1_8", "v2_4", "trident"];

export default function Home({ mods, lastUpdated }: HomeProps) {
  const router = useRouter();
  const { isReady, pathname, replace } = router;
  const initialQuery = useMemo(() => {
    if (typeof window === "undefined") {
      return { search: "", printers: [] as PrinterKey[], sortBy: "recent" as SortOption, queryString: "" };
    }
    const params = new URLSearchParams(window.location.search);
    const searchValue = params.get("q") ?? "";
    const sortParam = params.get("sort");
    const sortValue: SortOption =
      sortParam === "title" || sortParam === "creator" || sortParam === "recent" ? (sortParam as SortOption) : "recent";
    const printersParam = params.get("printers");
    const parsedPrinters = printersParam
      ? printersParam
          .split(",")
          .map((value) => value.trim())
          .filter((value): value is PrinterKey => PRINTER_KEYS.includes(value as PrinterKey))
      : [];
    return {
      search: searchValue,
      printers: parsedPrinters,
      sortBy: sortValue,
      queryString: params.toString(),
    };
  }, []);
  const [search, setSearch] = useState(initialQuery.search);
  const [selectedPrinters, setSelectedPrinters] = useState<PrinterKey[]>(initialQuery.printers);
  const [sortBy, setSortBy] = useState<SortOption>(initialQuery.sortBy);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const lastQueryStringRef = useRef(initialQuery.queryString);
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
  const visibleMods = useMemo(
    () => filteredMods.slice(0, visibleCount),
    [filteredMods, visibleCount],
  );
  const hasMore = visibleCount < filteredMods.length;
  const loadMore = useCallback(() => {
    setVisibleCount((count) => Math.min(count + PAGE_SIZE, filteredMods.length));
  }, [filteredMods.length]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setVisibleCount(PAGE_SIZE);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onScroll = () => {
      setShowScrollTop(window.scrollY > 600);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSortChange = (value: SortOption) => {
    setSortBy(value);
    setVisibleCount(PAGE_SIZE);
  };

  useEffect(() => {
    if (!hasMore) return;
    if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "320px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore, visibleMods.length]);

  const handleTogglePrinter = (printer: PrinterKey) => {
    setSelectedPrinters((prev) =>
      prev.includes(printer) ? prev.filter((item) => item !== printer) : [...prev, printer],
    );
    setVisibleCount(PAGE_SIZE);
  };

  useEffect(() => {
    if (!isReady) return;
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (selectedPrinters.length) params.set("printers", selectedPrinters.join(","));
    if (sortBy !== "recent") params.set("sort", sortBy);
    const queryString = params.toString();
    if (queryString === lastQueryStringRef.current) return;
    lastQueryStringRef.current = queryString;

    const queryObject = Object.fromEntries(params.entries());
    replace(
      {
        pathname,
        query: queryObject,
      },
      undefined,
      { shallow: true, scroll: false },
    );
  }, [isReady, pathname, replace, search, selectedPrinters, sortBy]);

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
                Community-built and unofficial, this hub exists to make the official VoronUsers catalog easier to browse.
                We parse VoronUsers every day so you can search, filter, and discover mods without digging through GitHub
                tables. Everything is static, fast, and ready for you to find what you need.
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
            onSearchChange={handleSearchChange}
            activePrinters={selectedPrinters}
            onTogglePrinter={handleTogglePrinter}
            sortBy={sortBy}
            onSortChange={handleSortChange}
            totalMods={mods.length}
            filteredMods={filteredMods.length}
            lastUpdated={lastUpdated}
          />

          <ModGrid mods={visibleMods} />

          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Showing {visibleMods.length} of {filteredMods.length} matching mods
            </p>
            {hasMore ? (
              <>
                <button
                  type="button"
                  onClick={loadMore}
                  className="rounded-full border border-white/30 px-6 py-2 text-sm font-semibold text-white hover:border-emerald-400 hover:text-emerald-200 dark:border-zinc-700 dark:text-zinc-200 dark:hover:border-emerald-400"
                >
                  Load more
                </button>
                <div ref={sentinelRef} className="h-1 w-full" aria-hidden />
              </>
            ) : (
              <div className="h-1 w-full" aria-hidden />
            )}
          </div>
        </div>
      </main>
      {showScrollTop ? (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Scroll back to top"
          className="fixed bottom-6 right-6 flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12l7-7 7 7" />
            <path d="M12 5v14" />
          </svg>
          Top
        </button>
      ) : null}
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
