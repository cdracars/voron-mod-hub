import Head from "next/head";
import Image from "next/image";
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
        <title>Voron Mod Hub — Search the VoronUsers Catalog</title>
        <meta
          name="description"
          content="Browse the community-maintained VoronUsers catalog. Search mods by name, creator, or description, filter by printer family, and share your results."
        />
        <link rel="canonical" href="https://cdracars.github.io/voron-mod-hub/" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Voron Mod Hub" />
        <meta property="og:title" content="Voron Mod Hub — Search the VoronUsers Catalog" />
        <meta
          property="og:description"
          content="Browse the community-maintained VoronUsers catalog. Search mods by name, creator, or description, filter by printer family, and share your results."
        />
        <meta property="og:url" content="https://cdracars.github.io/voron-mod-hub/" />
        <meta property="og:image" content="https://cdracars.github.io/voron-mod-hub/social-preview.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:alt" content="Voron Mod Hub: search the community VoronUsers catalog and filter by printer family." />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Voron Mod Hub — Search the VoronUsers Catalog" />
        <meta
          name="twitter:description"
          content="Browse the community-maintained VoronUsers catalog by name, creator, description, or printer family."
        />
        <meta name="twitter:image" content="https://cdracars.github.io/voron-mod-hub/social-preview.png" />
        <meta name="twitter:image:alt" content="Voron Mod Hub: search the community VoronUsers catalog and filter by printer family." />
      </Head>
      <a
        className="github-corner"
        href="https://github.com/cdracars/voron-mod-hub"
        target="_blank"
        rel="noreferrer"
        aria-label="View Voron Mod Hub source on GitHub"
      >
        <svg viewBox="0 0 250 250" aria-hidden="true">
          <path d="M0,0 L115,115 L130,115 L142,142 L250,250 L250,0 Z" />
          <path className="octo-arm" d="M128.3,109.0 C113.8,99.7 119.0,89.6 119.0,89.6 C122.0,82.7 120.5,78.6 120.5,78.6 C119.2,72.0 123.4,76.3 123.4,76.3 C127.3,80.9 125.5,87.3 125.5,87.3 C122.9,97.6 130.6,101.9 134.4,103.2" />
          <path className="octo-body" d="M115.0,115.0 C114.9,115.1 118.7,116.5 119.8,115.4 L133.7,101.6 C136.9,99.2 139.9,98.4 142.2,98.6 C133.8,88.0 127.5,74.4 143.8,58.0 C148.5,53.4 154.0,51.2 159.7,51.0 C160.3,49.4 163.2,43.6 171.4,40.6 C171.4,40.6 176.1,42.5 178.8,56.2 C183.8,58.6 187.2,61.8 189.8,65.4 C203.1,64.1 206.7,69.9 206.7,69.9 C203.7,78.2 197.8,81.0 196.1,81.4 C196.4,87.8 194.4,93.4 189.8,98.1 C173.7,114.2 159.5,107.5 149.9,99.4 C150.1,101.8 149.3,104.9 146.9,108.1 L133.0,121.9 C131.9,123.0 133.3,126.8 133.4,126.8 Z" />
        </svg>
      </a>
      <main className="min-h-screen bg-gradient-to-b from-zinc-50 via-white to-zinc-100 px-4 py-10 text-zinc-900 dark:from-black dark:via-zinc-900 dark:to-black sm:px-8">
        <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-10">
          <header className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-gradient-to-r from-zinc-900 via-zinc-800 to-emerald-800 p-8 text-white shadow-xl">
            <div className="flex items-start gap-4 sm:gap-5">
              <Image
                src="favicon.svg"
                alt="Voron Mod Hub mark"
                width={56}
                height={56}
                priority
                className="mt-1 size-12 shrink-0 sm:size-14"
              />
              <div className="flex flex-col gap-3">
                <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Voron Mod Hub</p>
                <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
                  Browse Voron community mods in one searchable catalog
                </h1>
                <p className="max-w-2xl text-base text-white/80">
                  This independent browser makes the community-maintained VoronUsers catalog easier to search and filter.
                  Browse by mod name, creator, description, or supported printer family, then open the original listing for
                  its full details.
                </p>
              </div>
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

          <section
            aria-labelledby="catalog-notes-heading"
            className="mx-auto w-full max-w-3xl border-t border-zinc-300/70 py-8 text-sm leading-6 text-zinc-700 dark:border-zinc-800 dark:text-zinc-300"
          >
            <h2
              id="catalog-notes-heading"
              className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100"
            >
              About the catalog and compatibility
            </h2>
            <p>
              Mod listings come from the community-maintained VoronUsers catalog and are refreshed automatically. Use the
              printer filters to narrow the list, then open a mod’s original page for its requirements, revisions, and
              installation notes.
            </p>
            <p className="mt-3">
              Compatibility labels are a browsing aid, not a fit guarantee for your exact printer build. Check the creator’s
              notes and current source listing before printing or installing a mod. Voron Mod Hub is an independent project,
              not an official Voron Design product.
            </p>
          </section>
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
