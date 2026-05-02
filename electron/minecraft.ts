import { Client } from "minecraft-launcher-core";
import { BrowserWindow } from "electron";
import * as fs from "fs";
import * as path from "path";
import { profileDir, rootDir, sharedMcDir } from "./paths";
import { ensureLoader } from "./modloaders";
import { ensureJavaRuntime, readRequiredJavaComponent } from "./java";
import { syncProfileResources } from "./sync";
import { replaceMcIcons } from "./mcicon";

const SECTVER_LOGO_PATH = path.join(__dirname, "..", "..", "dist", "logo", "sectver_logo.jpg");

import { IPC } from "../shared/ipc";
import type { AuthAccount, LaunchProgress, ProfileManifest } from "../shared/types";

/**
 * Retire des chaînes les tokens d'auth avant écriture sur disque. Couvre les
 * deux formats que MCLC et ModLauncher utilisent :
 *   --xuid <token>           (ligne de commande générée par MCLC)
 *   --xuid, <token>, --next  (réimpression "args array" de ModLauncher)
 */
function scrub(s: string): string {
  const flags = ["accessToken", "xuid", "clientId"];
  let out = s;
  for (const f of flags) {
    // Capture le séparateur (espace ou virgule + espace) sans manger la virgule
    // suivante du tableau, et remplace la valeur seule.
    out = out.replace(new RegExp(`(--${f})([,\\s]+)([^\\s,]+)`, "g"), "$1$2[REDACTED]");
  }
  return out;
}

/**
 * Lit le version JSON d'un loader (NeoForge/Forge/Fabric) et retourne ses
 * arguments JVM avec les placeholders résolus. MCLC v3.18 ne les applique pas
 * correctement quand on utilise version.custom, donc on les passe via customArgs.
 */
function loaderJvmArgs(loaderVersionId: string, mcRoot: string): string[] {
  const jsonPath = path.join(mcRoot, "versions", loaderVersionId, `${loaderVersionId}.json`);
  if (!fs.existsSync(jsonPath)) return [];
  let data: any;
  try { data = JSON.parse(fs.readFileSync(jsonPath, "utf-8")); } catch { return []; }
  const jvm = data?.arguments?.jvm;
  if (!Array.isArray(jvm)) return [];

  const libDir = path.join(mcRoot, "libraries");
  const sep = process.platform === "win32" ? ";" : ":";
  const subs: Record<string, string> = {
    library_directory: libDir,
    libraries_directory: libDir,
    classpath_separator: sep,
    version_name: loaderVersionId,
    natives_directory: path.join(mcRoot, "natives", loaderVersionId)
  };
  const out: string[] = [];
  for (const item of jvm) {
    if (typeof item !== "string") continue;
    let s = item;
    for (const [k, v] of Object.entries(subs)) {
      s = s.replace(new RegExp("\\$\\{" + k + "\\}", "g"), v);
    }
    out.push(s);
  }
  return out;
}

function send(win: BrowserWindow | null, p: LaunchProgress) {
  if (win && !win.isDestroyed()) win.webContents.send(IPC.EvtLaunchProgress, p);
}

function logFile() {
  const dir = path.join(rootDir(), "logs");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "latest.log");
}

export async function launchProfile(opts: {
  profile: ProfileManifest;
  account: AuthAccount;
  ramMb: number;
  win: BrowserWindow | null;
}) {
  const { profile, account, ramMb, win } = opts;
  const launcher = new Client();
  const log = fs.createWriteStream(logFile(), { flags: "w" });
  log.write(`=== Sectver Launcher — ${new Date().toISOString()} ===\n`);
  log.write(`Profil: ${profile.id} | MC: ${profile.minecraftVersion} | Loader: ${profile.loader}\n\n`);

  let lastJavaLine = "";

  // On résout/rejette manuellement quand le process Java se termine.
  let resolveExit!: () => void;
  let rejectExit!: (e: Error) => void;
  const exitPromise = new Promise<void>((res, rej) => { resolveExit = res; rejectExit = rej; });

  try {
    send(win, { stage: "loader", message: "Préparation du loader..." });
    const versionId = await ensureLoader(profile);
    log.write(`Version résolue: ${versionId}\n`);

    send(win, { stage: "version", message: "Vérification du JRE..." });
    const javaComponent = readRequiredJavaComponent(profile.minecraftVersion) ?? "java-runtime-delta";
    log.write(`Composant Java requis: ${javaComponent}\n`);
    const javaPath = await ensureJavaRuntime(javaComponent, m => send(win, { stage: "version", message: m }));
    log.write(`Java path: ${javaPath}\n`);

    send(win, { stage: "mods", message: "Synchronisation des ressources..." });
    await syncProfileResources(profile, m => send(win, { stage: "mods", message: m }));

    send(win, { stage: "version", message: "Vérification des fichiers Minecraft..." });

    launcher.on("debug", (e: any) => {
      const s = scrub(String(e));
      log.write("[DEBUG] " + s + "\n");
      // MCLC vient de télécharger les assets — il a probablement écrasé notre
      // patch d'icônes. On le ré-applique tout de suite, avant que Java ne lise
      // les fichiers.
      if (s.includes("Downloaded assets")) {
        try {
          const r = replaceMcIcons(versionId, profile.minecraftVersion, SECTVER_LOGO_PATH);
          log.write(`[icon post-download] jar=${r.jarPatchedEntries} assets=${r.assetEntriesPatched}\n`);
        } catch (e2) {
          log.write(`[icon post-download] erreur : ${String(e2)}\n`);
        }
      }
    });
    launcher.on("data", (e: any) => {
      const s = scrub(String(e));
      log.write(s);
      lastJavaLine = s.split("\n").filter(Boolean).pop() ?? lastJavaLine;
      send(win, { stage: "running", message: lastJavaLine.slice(0, 200) });
    });
    launcher.on("progress", (e: any) => {
      if (e?.type) {
        const pct = e.total ? Math.round((e.task / e.total) * 100) : undefined;
        send(win, { stage: "assets", message: `${e.type}…`, percent: pct });
      }
    });
    launcher.on("close", (code: number) => {
      log.write(`\n=== Process Java terminé (code ${code}) ===\n`);
      log.end();
      if (code !== 0) {
        const msg = `Le jeu a quitté avec le code ${code}. Logs : ${logFile()}\nDernière sortie : ${lastJavaLine.slice(0, 400)}`;
        send(win, { stage: "error", message: msg });
        rejectExit(new Error(msg));
      } else {
        send(win, { stage: "done", message: "Jeu fermé" });
        resolveExit();
      }
    });

    send(win, { stage: "launching", message: "Lancement..." });

    // Patche le JAR vanilla et le store d'assets pour remplacer les icônes
    // Minecraft par le logo Sectver. À ré-exécuter à chaque lancement.
    try {
      const r = replaceMcIcons(versionId, profile.minecraftVersion, SECTVER_LOGO_PATH);
      log.write(
        `\n[icon] source=${r.sourceLoaded ? "OK" : "KO"} (${r.sourcePath})` +
        `\n[icon] JAR ${r.jarFound ? "trouvé" : "absent"} : ${r.jarPath}` +
        `\n[icon] entrées JAR remplacées : ${r.jarPatchedEntries}` +
        `\n[icon] assets remplacés : ${r.assetEntriesPatched}` +
        (r.errors.length ? `\n[icon] erreurs : ${r.errors.join(" | ")}` : "") +
        "\n"
      );
    } catch (e) {
      log.write(`\n[icon] Remplacement des icônes MC ignoré : ${String(e)}\n`);
    }

    const isModded = profile.loader !== "vanilla";
    const customArgs = isModded ? loaderJvmArgs(versionId, sharedMcDir()) : [];
    if (customArgs.length) log.write(`\nJVM args du loader (${customArgs.length}) injectés via customArgs.\n`);

    await launcher.launch({
      authorization: {
        access_token: account.accessToken,
        client_token: account.uuid,
        uuid: account.uuid,
        name: account.username,
        user_properties: "{}",
        meta: { type: "mojang", demo: false }
      } as any,
      root: sharedMcDir(),
      version: {
        number: profile.minecraftVersion,
        type: "release",
        custom: profile.loader === "vanilla" ? undefined : versionId
      },
      memory: {
        max: `${ramMb}M`,
        min: `${Math.max(512, Math.floor(ramMb / 2))}M`
      },
      javaPath,
      customArgs,
      overrides: {
        gameDirectory: profileDir(profile.id)
      }
    });
  } catch (e: any) {
    log.write(`\n=== ERREUR ===\n${e?.stack ?? e}\n`);
    log.end();
    send(win, { stage: "error", message: String(e?.message ?? e) });
    throw e;
  }

  await exitPromise;
}
