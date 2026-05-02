import * as fs from "fs";
import { manifestCacheFile } from "./paths";
import type { RemoteManifest } from "../shared/types";

const MANIFEST_URL =
  process.env.SECTVER_MANIFEST_URL ??
  "https://raw.githubusercontent.com/PiikaPops/sectver-launcher/main/manifest.json";

export async function fetchManifest(): Promise<RemoteManifest> {
  // Cache-buster : `raw.githubusercontent.com` est servi via CDN (TTL ~5 min).
  // Un query-param aléatoire force une réponse fraîche.
  const url = `${MANIFEST_URL}?t=${Date.now()}`;
  try {
    const r = await fetch(url, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" }
    });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const json = (await r.json()) as RemoteManifest;
    fs.writeFileSync(manifestCacheFile(), JSON.stringify(json, null, 2));
    return json;
  } catch (e) {
    if (fs.existsSync(manifestCacheFile())) {
      return JSON.parse(fs.readFileSync(manifestCacheFile(), "utf-8"));
    }
    throw e;
  }
}
