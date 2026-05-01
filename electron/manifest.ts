import * as fs from "fs";
import { manifestCacheFile } from "./paths";
import type { RemoteManifest } from "../shared/types";

const MANIFEST_URL =
  process.env.SECTVER_MANIFEST_URL ??
  "https://raw.githubusercontent.com/PiikaPops/sectver-launcher/main/manifest.json";

export async function fetchManifest(): Promise<RemoteManifest> {
  try {
    const r = await fetch(MANIFEST_URL, { cache: "no-store" });
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
