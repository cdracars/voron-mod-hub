import { promises as fs } from "fs";
import path from "path";

import type { Compatibility, Mod, ModsData } from "@/lib/types";

const README_URL =
  process.env.VORON_USERS_README_URL ??
  "https://raw.githubusercontent.com/VoronDesign/VoronUsers/master/printer_mods/README.md";

const MOD_BASE_URL = "https://github.com/VoronDesign/VoronUsers/tree/master/printer_mods";

const PRINTER_SYNONYMS: Record<keyof Compatibility, string[]> = {
  v0: ["V0", "V0.0", "V0.1", "V0.2", "V0.2r1"],
  v0_1: ["V0.1"],
  v1_8: ["V1.8", "V1"],
  v2_4: ["V2.4", "V2.4r2"],
  trident: ["VT", "Trident", "Voron Trident"],
};

const DEFAULT_COMPATIBILITY: Compatibility = {
  v0: "✗",
  v0_1: "✗",
  v1_8: "✗",
  v2_4: "✗",
  trident: "✗",
};

async function fetchReadme() {
  const response = await fetch(README_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch README: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

function sanitizeDescription(text: string) {
  return text.replace(/\\n/g, " ").replace(/\s+/g, " ").trim();
}

function buildCompatibility(cell: string): Compatibility {
  const normalized = cell
    .split(/[,/]/)
    .map((token) => token.trim())
    .filter(Boolean);

  const compatibility: Compatibility = { ...DEFAULT_COMPATIBILITY };

  for (const [key, synonyms] of Object.entries(PRINTER_SYNONYMS) as [keyof Compatibility, string[]][]) {
    if (normalized.some((token) => synonyms.includes(token))) {
      compatibility[key] = "✓";
    }
  }

  return compatibility;
}

function extractLink(cell: string) {
  const linkMatch = cell.match(/\[([^\]]+)\]\(([^)]+)\)/);
  if (!linkMatch) return { title: cell, link: MOD_BASE_URL };
  const [, title, rawLink] = linkMatch;
  const link = rawLink.startsWith("http") ? rawLink : `${MOD_BASE_URL}/${rawLink}`;
  return { title: title.trim(), link };
}

function parseMods(markdown: string): Mod[] {
  const lines = markdown.split(/\r?\n/);
  const mods: Mod[] = [];
  let inTable = false;
  let lastCreator = "";

  for (const line of lines) {
    if (!inTable && line.trim().startsWith("| Creator")) {
      inTable = true;
      continue;
    }

    if (!inTable) continue;

    if (line.trim().startsWith("| ---")) {
      continue;
    }

    if (!line.trim().startsWith("|")) {
      if (inTable) break;
      continue;
    }

    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());

    if (cells.length < 5) continue;

    const [initialCreator, ...rest] = cells as [string, string, string, string, string];
    let creator = initialCreator;
    const [titleCell, description, compatibilityCell, lastChanged] = rest;

    if (creator) {
      lastCreator = creator;
    } else {
      creator = lastCreator;
    }

    const { title, link } = extractLink(titleCell);

    mods.push({
      creator,
      title,
      description: sanitizeDescription(description),
      link,
      compatibility: buildCompatibility(compatibilityCell),
      lastChanged: lastChanged || undefined,
    });
  }

  return mods;
}

async function main() {
  console.log(`Fetching VoronUsers README from ${README_URL}`);
  const markdown = await fetchReadme();
  const mods = parseMods(markdown).sort((a, b) => a.title.localeCompare(b.title));
  const payload: ModsData = {
    mods,
    lastUpdated: new Date().toISOString(),
  };

  const outputPath = path.join(process.cwd(), "public", "mods.json");
  await fs.writeFile(outputPath, JSON.stringify(payload, null, 2) + "\n", "utf-8");
  console.log(`Wrote ${mods.length} mods to ${outputPath}`);
}

main().catch((error) => {
  console.error("Failed to parse README", error);
  process.exitCode = 1;
});
