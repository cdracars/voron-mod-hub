import { promises as fs } from "fs";
import path from "path";
import { createHash } from "crypto";

import sharp from "sharp";

import type { Compatibility, Mod, ModsData } from "@/lib/types";

const README_URL =
  process.env.VORON_USERS_README_URL ??
  "https://raw.githubusercontent.com/VoronDesign/VoronUsers/master/printer_mods/README.md";

const MOD_BASE_URL = "https://github.com/VoronDesign/VoronUsers/tree/master/printer_mods";
const MOD_BLOB_BASE_URL = "https://github.com/VoronDesign/VoronUsers/blob/master/printer_mods";
const RAW_BASE_URL = "https://raw.githubusercontent.com/VoronDesign/VoronUsers/master/printer_mods";
const README_FILENAME = "README.md";
const IMAGE_FETCH_CONCURRENCY = 8;
const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"];
const MOD_IMAGE_DIR = path.join(process.cwd(), "public", "mod-images");
const IMAGE_CACHE_PATH = path.join(process.cwd(), "data", "imageCache.json");

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

async function ensureImageDir() {
  await fs.mkdir(MOD_IMAGE_DIR, { recursive: true });
}

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function downloadBuffer(url: string) {
  const response = await fetch(url);
  if (!response.ok) return undefined;
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

type ImageCacheEntry = {
  image: string | null;
  lastChanged?: string;
};

type ImageCache = Record<string, ImageCacheEntry>;

async function loadImageCache(): Promise<ImageCache> {
  try {
    const raw = await fs.readFile(IMAGE_CACHE_PATH, "utf-8");
    return JSON.parse(raw) as ImageCache;
  } catch {
    return {};
  }
}

async function saveImageCache(cache: ImageCache) {
  await fs.mkdir(path.dirname(IMAGE_CACHE_PATH), { recursive: true });
  await fs.writeFile(IMAGE_CACHE_PATH, JSON.stringify(cache, null, 2) + "\n", "utf-8");
}

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
  if (!linkMatch) return { title: cell, link: MOD_BASE_URL, sourcePath: undefined };
  const [, title, rawLink] = linkMatch;
  const normalized = rawLink.replace(/^\.\//, "");
  const isExternal = /^https?:\/\//i.test(normalized);
  const link = isExternal ? normalized : `${MOD_BASE_URL}/${normalized}`;
  const sourcePath = isExternal ? undefined : normalized;
  return { title: title.trim(), link, sourcePath };
}

function stripTitle(url: string) {
  return url.trim().split(/\s+/)[0];
}

function isValidImage(url: string) {
  const target = url.toLowerCase().split(/[?#]/)[0];
  return IMAGE_EXTENSIONS.some((ext) => target.endsWith(ext));
}

function resolveImageUrl(url: string, relativePath: string) {
  const cleaned = stripTitle(url);
  if (!isValidImage(cleaned)) return undefined;
  if (/^https?:\/\//i.test(cleaned)) return cleaned;
  if (cleaned.startsWith("//")) return `https:${cleaned}`;
  const relative = cleaned.startsWith("./") ? cleaned.slice(2) : cleaned;
  return new URL(relative, `${RAW_BASE_URL}/${relativePath}/`).href;
}

function extractFirstImage(markdown: string, relativePath: string) {
  const markdownImageRegex = /!\[[^\]]*\]\(([^)]+)\)/g;
  for (const match of markdown.matchAll(markdownImageRegex)) {
    const candidate = resolveImageUrl(match[1], relativePath);
    if (candidate) return candidate;
  }

  const htmlImageRegex = /<img[^>]*src=["']([^"']+)["'][^>]*>/gi;
  for (const match of markdown.matchAll(htmlImageRegex)) {
    const candidate = resolveImageUrl(match[1], relativePath);
    if (candidate) return candidate;
  }

  return undefined;
}

async function maybeMaterializeImage(url: string) {
  const normalized = url.toLowerCase().split(/[?#]/)[0];
  if (!normalized.endsWith(".gif")) return url;

  await ensureImageDir();
  const filename = `${createHash("md5").update(url).digest("hex")}.jpg`;
  const localPath = path.join(MOD_IMAGE_DIR, filename);

  if (!(await fileExists(localPath))) {
    const buffer = await downloadBuffer(url);
    if (!buffer) return url;
    try {
      const frame = await sharp(buffer).jpeg({ quality: 85 }).toBuffer();
      await fs.writeFile(localPath, frame);
    } catch (error) {
      console.warn(`Failed to convert GIF preview ${url}`, error);
      return url;
    }
  }

  return `/mod-images/${filename}`;
}

function isLocalImage(image?: string | null) {
  return !!image && image.startsWith("/mod-images/");
}

function getLocalImagePath(image: string) {
  return path.join(process.cwd(), "public", image.replace(/^\//, ""));
}

type DraftMod = Mod & { sourcePath?: string };

function parseMods(markdown: string): DraftMod[] {
  const lines = markdown.split(/\r?\n/);
  const mods: DraftMod[] = [];
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

    const { title, link, sourcePath } = extractLink(titleCell);

    mods.push({
      creator,
      title,
      description: sanitizeDescription(description),
      link,
      compatibility: buildCompatibility(compatibilityCell),
      lastChanged: lastChanged || undefined,
      sourcePath,
      authorSlug: sourcePath?.split("/")?.[0],
    });
  }

  return mods;
}

async function fetchPreviewImage(relativePath: string) {
  const readmeUrl = `${RAW_BASE_URL}/${relativePath}/${README_FILENAME}`;

  try {
    const response = await fetch(readmeUrl);
    if (!response.ok) return undefined;
    const markdown = await response.text();
    return extractFirstImage(markdown, relativePath);
  } catch (error) {
    console.warn(`Failed to fetch preview image for ${relativePath}`, error);
    return undefined;
  }
}

async function addPreviewImages(mods: DraftMod[], cache: ImageCache) {
  await ensureImageDir();
  const usedLocalImages = new Set<string>();
  let cacheHits = 0;
  let downloads = 0;
  let gifConversions = 0;

  for (let i = 0; i < mods.length; i += IMAGE_FETCH_CONCURRENCY) {
    const batch = mods.slice(i, i + IMAGE_FETCH_CONCURRENCY);
    await Promise.all(
      batch.map(async (mod) => {
        if (!mod.sourcePath) return;
        const cacheEntry = cache[mod.sourcePath];
        if (cacheEntry && cacheEntry.lastChanged === mod.lastChanged) {
          if (cacheEntry.image) {
            if (!isLocalImage(cacheEntry.image) || (await fileExists(getLocalImagePath(cacheEntry.image)))) {
              mod.image = cacheEntry.image;
              if (isLocalImage(cacheEntry.image)) {
                usedLocalImages.add(cacheEntry.image);
              }
              cacheHits += 1;
              return;
            }
          } else {
            return;
          }
        }

        const image = await fetchPreviewImage(mod.sourcePath);
        if (!image) {
          cache[mod.sourcePath] = { image: null, lastChanged: mod.lastChanged };
          return;
        }

        downloads += 1;
        const finalImage = await maybeMaterializeImage(image);
        cache[mod.sourcePath] = { image: finalImage ?? null, lastChanged: mod.lastChanged };
        if (finalImage) {
          mod.image = finalImage;
          if (isLocalImage(finalImage)) {
            usedLocalImages.add(finalImage);
            gifConversions += 1;
          }
        }
      }),
    );
  }

  return { usedLocalImages, stats: { cacheHits, downloads, gifConversions } };
}

async function cleanupUnusedLocalImages(usedImages: Set<string>) {
  try {
    const files = await fs.readdir(MOD_IMAGE_DIR);
    await Promise.all(
      files.map(async (file) => {
        const urlPath = `/mod-images/${file}`;
        if (!usedImages.has(urlPath)) {
          await fs.unlink(path.join(MOD_IMAGE_DIR, file));
        }
      }),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.warn("Unable to cleanup local preview images", error);
    }
  }
}

async function main() {
  console.log(`Fetching VoronUsers README from ${README_URL}`);
  const markdown = await fetchReadme();
  const drafts = parseMods(markdown).sort((a, b) => a.title.localeCompare(b.title));
  const imageCache = await loadImageCache();
  const { usedLocalImages, stats } = await addPreviewImages(drafts, imageCache);
  const mods: Mod[] = drafts.map((draft) => {
    const { sourcePath, ...rest } = draft;
    const repoPath = sourcePath ? `printer_mods/${sourcePath}` : undefined;
    const readmeUrl = sourcePath
      ? `${MOD_BLOB_BASE_URL}/${sourcePath}/${README_FILENAME}`
      : undefined;
    return {
      ...rest,
      repoPath,
      readmeUrl,
    };
  });
  const payload: ModsData = {
    mods,
    lastUpdated: new Date().toISOString(),
  };

  const outputPath = path.join(process.cwd(), "public", "mods.json");
  await fs.writeFile(outputPath, JSON.stringify(payload, null, 2) + "\n", "utf-8");
  console.log(`Wrote ${mods.length} mods to ${outputPath}`);
  console.log(
    `Image cache hits: ${stats.cacheHits}, fetched readmes: ${stats.downloads}, GIFs converted: ${stats.gifConversions}`,
  );
  await saveImageCache(imageCache);
  await cleanupUnusedLocalImages(usedLocalImages ?? new Set());
}

main().catch((error) => {
  console.error("Failed to parse README", error);
  process.exitCode = 1;
});
