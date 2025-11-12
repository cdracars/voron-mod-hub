import type { Compatibility } from "@/lib/types";

export type PrinterKey = keyof Compatibility;
export type SortOption = "title" | "creator" | "recent";

const PRINTER_LABELS: Record<PrinterKey, string> = {
  v0: "Voron V0",
  v1_8: "Voron V1.8",
  v2_4: "Voron V2.4",
  trident: "Voron Trident",
  v0_1: "Voron V0.1",
};

interface FilterPanelProps {
  search: string;
  onSearchChange: (value: string) => void;
  activePrinters: PrinterKey[];
  onTogglePrinter: (printer: PrinterKey) => void;
  sortBy: SortOption;
  onSortChange: (value: SortOption) => void;
  totalMods: number;
  filteredMods: number;
  lastUpdated?: string;
}

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "title", label: "Title (A-Z)" },
  { value: "creator", label: "Creator (A-Z)" },
  { value: "recent", label: "Recently Updated" },
];

export function FilterPanel(props: FilterPanelProps) {
  const {
    search,
    onSearchChange,
    activePrinters,
    onTogglePrinter,
    sortBy,
    onSortChange,
    totalMods,
    filteredMods,
    lastUpdated,
  } = props;

  const formattedUpdate = lastUpdated
    ? new Date(lastUpdated).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : undefined;

  return (
    <section className="w-full rounded-3xl border border-white/10 bg-white/80 p-6 shadow-sm backdrop-blur dark:bg-zinc-900/70">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Showing {filteredMods} of {totalMods} mods
        </p>
        {formattedUpdate ? (
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Data refreshed {formattedUpdate}
          </p>
        ) : null}
      </div>

      <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center">
        <label className="flex w-full flex-col text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Search mods
          <input
            type="search"
            placeholder="Search by name, creator, or description"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-zinc-300/70 bg-white/70 px-4 py-2 text-base font-normal text-zinc-900 placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </label>
        <label className="flex w-full max-w-xs flex-col text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Sort by
          <select
            value={sortBy}
            onChange={(event) => onSortChange(event.target.value as SortOption)}
            className="mt-2 w-full rounded-2xl border border-zinc-300/70 bg-white/70 px-4 py-2 text-base font-normal text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Printer compatibility
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(PRINTER_LABELS).map(([key, label]) => {
            const printerKey = key as PrinterKey;
            const isActive = activePrinters.includes(printerKey);

            return (
              <label
                key={printerKey}
                className={`flex cursor-pointer items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:border-emerald-400 dark:bg-emerald-900/30 dark:text-emerald-100"
                    : "border-zinc-200 text-zinc-700 hover:border-emerald-400 hover:text-emerald-700 dark:border-zinc-700 dark:text-zinc-200"
                }`}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                  checked={isActive}
                  onChange={() => onTogglePrinter(printerKey)}
                />
                {label}
              </label>
            );
          })}
        </div>
      </div>
    </section>
  );
}
