import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

fileURLToPath(import.meta.url); // Keep for potential future use

interface MasterCV {
  content: string;
  hash: string;
  loaded_at: Date;
  valid: boolean;
}

let cachedCV: MasterCV | null = null;

export function loadMasterCV(): MasterCV {
  const cvPath = path.join(process.cwd(), "data", "Master_Career_Document.md");

  if (!fs.existsSync(cvPath)) {
    throw new Error(`Master Career Document not found at ${cvPath}`);
  }

  const content = fs.readFileSync(cvPath, "utf-8");
  const hash = crypto.createHash("sha256").update(content).digest("hex");

  cachedCV = {
    content,
    hash,
    loaded_at: new Date(),
    valid: true,
  };

  return cachedCV;
}

export function getMasterCV(): MasterCV | null {
  return cachedCV;
}

export function getMasterCVHealth(): {
  found: boolean;
  loaded: boolean;
  hash: string | null;
  loaded_at: Date | null;
} {
  const cvPath = path.join(process.cwd(), "data", "Master_Career_Document.md");

  return {
    found: fs.existsSync(cvPath),
    loaded: cachedCV !== null,
    hash: cachedCV?.hash || null,
    loaded_at: cachedCV?.loaded_at || null,
  };
}

export function getMasterCVHash(): string | null {
  return cachedCV?.hash || null;
}

export function isMasterCVLoaded(): boolean {
  return cachedCV !== null;
}

export default {
  loadMasterCV,
  getMasterCV,
  getMasterCVHealth,
  getMasterCVHash,
  isMasterCVLoaded,
};
