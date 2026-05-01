import { Client } from "minecraft-launcher-core";
import { BrowserWindow } from "electron";
import { profileDir, sharedMcDir } from "./paths";
import { ensureLoader } from "./modloaders";
import { syncProfileResources } from "./sync";
import { IPC } from "../shared/ipc";
import type { AuthAccount, LaunchProgress, ProfileManifest } from "../shared/types";

function send(win: BrowserWindow | null, p: LaunchProgress) {
  if (win && !win.isDestroyed()) win.webContents.send(IPC.EvtLaunchProgress, p);
}

export async function launchProfile(opts: {
  profile: ProfileManifest;
  account: AuthAccount;
  ramMb: number;
  win: BrowserWindow | null;
}) {
  const { profile, account, ramMb, win } = opts;
  const launcher = new Client();

  send(win, { stage: "loader", message: "Préparation du loader..." });
  const versionId = await ensureLoader(profile);

  send(win, { stage: "mods", message: "Synchronisation des ressources..." });
  await syncProfileResources(profile, m => send(win, { stage: "mods", message: m }));

  send(win, { stage: "version", message: "Vérification des fichiers Minecraft..." });

  const overrides: any = {
    gameDirectory: profileDir(profile.id)
  };

  launcher.on("debug", (e: any) => send(win, { stage: "version", message: String(e) }));
  launcher.on("data", (e: any) => send(win, { stage: "running", message: String(e).slice(0, 200) }));
  launcher.on("progress", (e: any) => {
    if (e?.type) {
      const pct = e.total ? Math.round((e.task / e.total) * 100) : undefined;
      send(win, { stage: "assets", message: `${e.type}…`, percent: pct });
    }
  });
  launcher.on("close", () => send(win, { stage: "done", message: "Jeu fermé" }));

  send(win, { stage: "launching", message: "Lancement..." });

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
    overrides
  });
}
