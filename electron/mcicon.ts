import * as fs from "fs";
import * as path from "path";
import { nativeImage } from "electron";
import AdmZip from "adm-zip";
import { sharedMcDir } from "./paths";

/**
 * Trouve l'asset index utilisé par une version (suit `inheritsFrom` si nécessaire).
 */
function resolveAssetIndex(versionId: string, depth = 0): string | null {
  if (depth > 5) return null;
  const p = path.join(sharedMcDir(), "versions", versionId, `${versionId}.json`);
  if (!fs.existsSync(p)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(p, "utf-8"));
    if (data.assetIndex?.id) return data.assetIndex.id;
    if (data.assets) return data.assets;
    if (data.inheritsFrom) return resolveAssetIndex(data.inheritsFrom, depth + 1);
  } catch {
    // ignore
  }
  return null;
}

/**
 * Ancien chemin (MC < 1.13) : remplace les icônes dans le store d'assets
 * adressé par hash. On garde la logique pour les vieilles versions.
 */
function replaceAssetIcons(versionId: string, src: Electron.NativeImage, pngBySize: Map<number, Buffer>): number {
  const assetIndexId = resolveAssetIndex(versionId);
  if (!assetIndexId) return 0;
  const indexPath = path.join(sharedMcDir(), "assets", "indexes", `${assetIndexId}.json`);
  if (!fs.existsSync(indexPath)) return 0;

  let index: { objects: Record<string, { hash: string; size: number }> };
  try { index = JSON.parse(fs.readFileSync(indexPath, "utf-8")); } catch { return 0; }

  const getPng = (size: number) => {
    let buf = pngBySize.get(size);
    if (!buf) { buf = src.resize({ width: size, height: size, quality: "best" }).toPNG(); pngBySize.set(size, buf); }
    return buf;
  };

  let count = 0;
  for (const [name, info] of Object.entries(index.objects)) {
    const m = name.match(/icon_(\d+)x\d+\.png$/);
    if (!m) continue;
    const size = parseInt(m[1], 10);
    const target = path.join(sharedMcDir(), "assets", "objects", info.hash.slice(0, 2), info.hash);
    if (!fs.existsSync(target)) continue;
    try { fs.writeFileSync(target, getPng(size)); count++; } catch { /* ignore */ }
  }
  return count;
}

/**
 * Approche moderne (MC >= 1.13) : les icônes sont stockées dans le JAR client
 * à `assets/minecraft/icons/icon_NxN.png`. On ouvre le JAR (qui est un ZIP),
 * on remplace les entrées correspondantes, on réécrit le JAR.
 *
 * Idempotent : si on patche deux fois avec la même image, le résultat est
 * identique. Si MC redownloade le jar (rare), il suffit de relancer pour
 * réappliquer.
 *
 * Pour les profils moddés, le jar contenant les icônes est celui de la
 * version vanilla parente (le loader hérite des resources via `inheritsFrom`).
 */
function patchVanillaJar(vanillaVersion: string, src: Electron.NativeImage, pngBySize: Map<number, Buffer>, errors: string[]): number {
  const jarPath = path.join(sharedMcDir(), "versions", vanillaVersion, `${vanillaVersion}.jar`);
  if (!fs.existsSync(jarPath)) return 0;

  const getPng = (size: number) => {
    let buf = pngBySize.get(size);
    if (!buf) { buf = src.resize({ width: size, height: size, quality: "best" }).toPNG(); pngBySize.set(size, buf); }
    return buf;
  };

  let zip: AdmZip;
  try { zip = new AdmZip(jarPath); } catch (e) { errors.push("ouverture JAR : " + String(e)); return 0; }
  const entries = zip.getEntries();
  let count = 0;

  // Recense tous les PNG dont le nom de fichier contient "icon" pour
  // diagnostiquer une éventuelle réorganisation du JAR.
  const iconCandidates: string[] = [];
  for (const entry of entries) {
    if (entry.isDirectory) continue;
    const name = entry.entryName.toLowerCase();
    if (name.endsWith(".png") && name.includes("icon")) iconCandidates.push(entry.entryName);
  }
  if (iconCandidates.length > 0) {
    errors.push(`PNG candidats trouvés dans le JAR : ${iconCandidates.slice(0, 20).join(", ")}`);
  } else {
    errors.push("aucun PNG contenant 'icon' dans le JAR");
  }

  for (const entry of entries) {
    if (entry.isDirectory) continue;
    // Match plus large : accepte tout chemin se terminant par icon_NxN.png
    // (avec ou sans préfixe "icons/" ou "minecraft/icons/").
    const m = entry.entryName.match(/icon_(\d+)x\d+\.png$/i);
    if (!m) continue;
    const size = parseInt(m[1], 10);
    const png = getPng(size);
    zip.updateFile(entry.entryName, png);
    count++;
  }

  if (count > 0) {
    try { zip.writeZip(jarPath); }
    catch (e) { errors.push("écriture JAR : " + String(e)); return 0; }
  }
  return count;
}

export interface IconReplaceReport {
  sourceLoaded: boolean;
  sourcePath: string;
  jarPath: string;
  jarFound: boolean;
  jarPatchedEntries: number;
  assetEntriesPatched: number;
  errors: string[];
}

/**
 * Remplace les icônes Minecraft (toutes tailles) par une image custom.
 * Patche à la fois le store d'assets (vieilles versions) et le JAR client
 * (versions modernes).
 */
export function replaceMcIcons(versionId: string, vanillaVersion: string, sourceImagePath: string): IconReplaceReport {
  const report: IconReplaceReport = {
    sourceLoaded: false,
    sourcePath: sourceImagePath,
    jarPath: path.join(sharedMcDir(), "versions", vanillaVersion, `${vanillaVersion}.jar`),
    jarFound: false,
    jarPatchedEntries: 0,
    assetEntriesPatched: 0,
    errors: []
  };

  if (!fs.existsSync(sourceImagePath)) {
    report.errors.push("source image inexistante");
    return report;
  }
  const src = nativeImage.createFromPath(sourceImagePath);
  if (src.isEmpty()) {
    report.errors.push("source image illisible");
    return report;
  }
  report.sourceLoaded = true;

  const cache = new Map<number, Buffer>();
  report.assetEntriesPatched += replaceAssetIcons(versionId, src, cache);
  if (vanillaVersion !== versionId) report.assetEntriesPatched += replaceAssetIcons(vanillaVersion, src, cache);

  if (fs.existsSync(report.jarPath)) {
    report.jarFound = true;
    report.jarPatchedEntries = patchVanillaJar(vanillaVersion, src, cache, report.errors);
  } else {
    report.errors.push("JAR vanilla introuvable : " + report.jarPath);
  }

  // Diagnostic supplémentaire : si on a remplacé des entrées du store mais
  // pas le JAR, on liste les entrées de l'asset index qui contenaient "icon"
  // pour vérifier qu'on cible bien les bonnes (icon_X.png natifs MC).
  if (report.assetEntriesPatched > 0 && report.jarPatchedEntries === 0) {
    const idx = resolveAssetIndex(vanillaVersion);
    if (idx) {
      const idxPath = path.join(sharedMcDir(), "assets", "indexes", `${idx}.json`);
      try {
        const data = JSON.parse(fs.readFileSync(idxPath, "utf-8"));
        const names = Object.keys(data.objects).filter(n => /icon_\d+x\d+\.png$/i.test(n));
        report.errors.push(`asset index "${idx}" — entrées icônes : ${names.slice(0, 10).join(", ")}`);
      } catch { /* ignore */ }
    }
  }
  return report;
}
