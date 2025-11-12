export type CompatibilityFlag = "✓" | "✗" | "?";

export interface Compatibility {
  v0: CompatibilityFlag;
  v1_8: CompatibilityFlag;
  v2_4: CompatibilityFlag;
  trident: CompatibilityFlag;
  v0_1: CompatibilityFlag;
}

export interface Mod {
  creator: string;
  title: string;
  description: string;
  link: string;
  compatibility: Compatibility;
  lastChanged?: string;
}

export interface ModsData {
  mods: Mod[];
  lastUpdated: string;
}
