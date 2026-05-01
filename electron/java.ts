import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import * as zlib from "zlib";
import { sharedMcDir } from "./paths";

const RUNTIME_INDEX_URL =
  "https://launchermeta.mojang.com/v1/products/java-runtime/2ec0cc96c44e5a76b9c8b7c39df7210883d12871/all.json";

function platformKey(): string {
  if (process.platform === "win32") {
    return process.arch === "arm64" ? "windows-arm64" : "windows-x64";
  }
  if (process.platform === "darwin") {
    return process.arch === "arm64" ? "mac-os-arm64" : "mac-os";
  }
  return "linux";
}

export function readRequiredJavaComponent(mcVersion: string): string | null {
  const p = path.join(sharedMcDir(), "versions", mcVersion, `${mcVersion}.json`);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"))?.javaVersion?.component ?? null;
  } catch {
    return null;
  }
}

interface DownloadInfo { sha1: string; size: number; url: string }
interface FileEntry {
  type: "file";
  executable: boolean;
  downloads: { raw: DownloadInfo; lzma?: DownloadInfo };
}
interface DirEntry { type: "directory" }
interface LinkEntry { type: "link"; target: string }
type Entry = FileEntry | DirEntry | LinkEntry;
interface RuntimeManifest { files: Record<string, Entry> }

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`GET ${url} → ${r.status}`);
  return (await r.json()) as T;
}

async function sha1Of(p: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash("sha1");
    fs.createReadStream(p).on("data", c => h.update(c)).on("end", () => resolve(h.digest("hex"))).on("error", reject);
  });
}

async function downloadFile(url: string, dest: string, expectedSha1: string, lzma: boolean) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const r = await fetch(url);
  if (!r.ok) throw new Error(`GET ${url} → ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  const data = lzma ? zlib.unzipSync(buf) : buf; // En pratique on n'utilise pas lzma ici (raw uniquement)
  fs.writeFileSync(dest, data);
  const got = await sha1Of(dest);
  if (got.toLowerCase() !== expectedSha1.toLowerCase()) {
    fs.unlinkSync(dest);
    throw new Error(`SHA1 mismatch ${path.basename(dest)} : attendu ${expectedSha1}, obtenu ${got}`);
  }
}

export async function ensureJavaRuntime(component: string, onMsg: (m: string) => void): Promise<string> {
  const root = sharedMcDir();
  const dest = path.join(root, "runtime", component, platformKey(), component);
  const javaExe = process.platform === "win32"
    ? path.join(dest, "bin", "javaw.exe")
    : path.join(dest, "bin", "java");

  if (fs.existsSync(javaExe)) return javaExe;

  onMsg(`Récupération de l'index des JRE Mojang…`);
  const all = await fetchJson<Record<string, Record<string, Array<{ manifest: { url: string } }>>>>(RUNTIME_INDEX_URL);
  const platformBlock = all[platformKey()];
  if (!platformBlock) throw new Error(`Plateforme non supportée par Mojang : ${platformKey()}`);
  const targets = platformBlock[component];
  if (!targets || targets.length === 0) {
    throw new Error(
      `Composant Java "${component}" indisponible pour ${platformKey()}. ` +
      `Composants connus : ${Object.keys(platformBlock).join(", ")}`
    );
  }
  const manifestUrl = targets[0].manifest.url;

  onMsg(`Téléchargement du manifest JRE ${component}…`);
  const manifest = await fetchJson<RuntimeManifest>(manifestUrl);

  const files = Object.entries(manifest.files);
  const fileEntries = files.filter(([, e]) => e.type === "file") as [string, FileEntry][];
  const total = fileEntries.length;
  let done = 0;

  // Crée les dossiers d'abord
  for (const [rel, e] of files) {
    if (e.type === "directory") fs.mkdirSync(path.join(dest, rel), { recursive: true });
  }

  // Téléchargements en parallèle limité (8 concurrents)
  const queue = [...fileEntries];
  const concurrency = 8;
  const workers = Array.from({ length: concurrency }, async () => {
    while (queue.length) {
      const next = queue.shift();
      if (!next) break;
      const [rel, e] = next;
      const target = path.join(dest, rel);
      const raw = e.downloads.raw;
      let needDownload = true;
      if (fs.existsSync(target)) {
        try { needDownload = (await sha1Of(target)).toLowerCase() !== raw.sha1.toLowerCase(); } catch { needDownload = true; }
      }
      if (needDownload) {
        await downloadFile(raw.url, target, raw.sha1, false);
      }
      done++;
      if (done % 5 === 0 || done === total) {
        onMsg(`JRE ${component} : ${done}/${total} fichiers`);
      }
    }
  });
  await Promise.all(workers);

  // Liens symboliques (rare sur Windows, présents sur Mac/Linux)
  for (const [rel, e] of files) {
    if (e.type === "link") {
      const linkPath = path.join(dest, rel);
      try { fs.unlinkSync(linkPath); } catch {}
      try { fs.symlinkSync((e as LinkEntry).target, linkPath); } catch { /* ignore on Windows si non admin */ }
    }
  }

  if (!fs.existsSync(javaExe)) {
    throw new Error("JRE installé mais exécutable introuvable : " + javaExe);
  }
  return javaExe;
}
