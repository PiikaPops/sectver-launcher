import * as fs from "fs";
import { manifestCacheFile } from "./paths";
import type { RemoteManifest } from "../shared/types";

/**
 * URL alternative override possible via env var (SECTVER_MANIFEST_URL pointant
 * directement sur le contenu raw). Sinon on passe par l'API GitHub Contents,
 * qui n'est pas servie via le CDN Fastly de raw.githubusercontent.com et
 * retourne donc TOUJOURS la version la plus récente du fichier sur la branche.
 */
const REPO_OWNER = "PiikaPops";
const REPO_NAME = "sectver-launcher";
const REPO_BRANCH = "main";
const MANIFEST_PATH = "manifest.json";

const MANIFEST_API_URL =
  process.env.SECTVER_MANIFEST_URL ??
  `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${MANIFEST_PATH}?ref=${REPO_BRANCH}`;

export async function fetchManifest(): Promise<RemoteManifest> {
  // Cache-buster supplémentaire dans la query pour neutraliser tout proxy
  // intermédiaire (entreprise, VPN, etc.).
  const url = `${MANIFEST_API_URL}${MANIFEST_API_URL.includes("?") ? "&" : "?"}t=${Date.now()}`;
  try {
    const r = await fetch(url, {
      cache: "no-store",
      headers: {
        // Demande le contenu raw, pas l'enveloppe JSON GitHub.
        "Accept": "application/vnd.github.raw+json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "User-Agent": "sectver-launcher"
      }
    });
    if (!r.ok) throw new Error("HTTP " + r.status + " " + r.statusText);
    const json = (await r.json()) as RemoteManifest;
    fs.writeFileSync(manifestCacheFile(), JSON.stringify(json, null, 2));
    return json;
  } catch (e) {
    // Fallback offline uniquement.
    if (fs.existsSync(manifestCacheFile())) {
      console.warn("manifest: fetch GitHub échoué, fallback cache local :", e);
      return JSON.parse(fs.readFileSync(manifestCacheFile(), "utf-8"));
    }
    throw e;
  }
}
