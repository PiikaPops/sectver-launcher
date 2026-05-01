import { app, BrowserWindow, ipcMain, dialog, shell } from "electron";
import * as path from "path";
import * as fs from "fs";
import { IPC } from "../shared/ipc";
import { getCurrent, loginInteractive, logout } from "./auth";
import { fetchManifest } from "./manifest";
import { launchProfile } from "./minecraft";
import { loadSettings, saveSettings } from "./store";
import { profileDir } from "./paths";
import { checkForUpdates, initUpdater, quitAndInstall } from "./updater";

let win: BrowserWindow | null = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1180,
    height: 740,
    minWidth: 980,
    minHeight: 620,
    backgroundColor: "#0e0404",
    title: "Sectver Launcher",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  win.on("closed", () => (win = null));
}

app.whenReady().then(() => {
  createWindow();
  initUpdater(() => win);
  if (app.isPackaged) checkForUpdates().catch(() => {});

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ───────── IPC ─────────

ipcMain.handle(IPC.AuthLogin, async () => loginInteractive());
ipcMain.handle(IPC.AuthLogout, async () => { logout(); return true; });
ipcMain.handle(IPC.AuthCurrent, async () => getCurrent());

ipcMain.handle(IPC.ManifestFetch, async () => fetchManifest());

ipcMain.handle(IPC.SettingsGet, async () => loadSettings());
ipcMain.handle(IPC.SettingsSet, async (_e, s) => { saveSettings(s); return true; });

ipcMain.handle(IPC.ProfileLaunch, async (_e, { profileId, ramMb }: { profileId: string; ramMb: number }) => {
  const account = await getCurrent();
  if (!account) throw new Error("Non connecté");
  const manifest = await fetchManifest();
  const profile = manifest.profiles.find(p => p.id === profileId);
  if (!profile) throw new Error("Profil introuvable");
  await launchProfile({ profile, account, ramMb, win });
  return true;
});

ipcMain.handle(IPC.ProfileOpenFolder, async (_e, profileId: string) => {
  shell.openPath(profileDir(profileId));
  return true;
});

async function importInto(profileId: string, sub: string, filters: Electron.FileFilter[]) {
  const r = await dialog.showOpenDialog(win!, {
    properties: ["openFile", "multiSelections"],
    filters
  });
  if (r.canceled) return [];
  const target = path.join(profileDir(profileId), sub);
  fs.mkdirSync(target, { recursive: true });
  const copied: string[] = [];
  for (const src of r.filePaths) {
    const dest = path.join(target, path.basename(src));
    fs.copyFileSync(src, dest);
    copied.push(path.basename(src));
  }
  return copied;
}

ipcMain.handle(IPC.ProfileImportMod, (_e, profileId: string) =>
  importInto(profileId, "mods", [{ name: "Mods", extensions: ["jar"] }]));
ipcMain.handle(IPC.ProfileImportShader, (_e, profileId: string) =>
  importInto(profileId, "shaderpacks", [{ name: "Shaders", extensions: ["zip"] }]));
ipcMain.handle(IPC.ProfileImportResourcePack, (_e, profileId: string) =>
  importInto(profileId, "resourcepacks", [{ name: "Resource Packs", extensions: ["zip"] }]));

ipcMain.handle(IPC.ProfileListLocalMods, (_e, profileId: string) => {
  const dir = path.join(profileDir(profileId), "mods");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith(".jar"));
});

ipcMain.handle(IPC.ProfileRemoveLocalMod, (_e, { profileId, name }: { profileId: string; name: string }) => {
  const p = path.join(profileDir(profileId), "mods", name);
  if (fs.existsSync(p)) fs.unlinkSync(p);
  return true;
});

ipcMain.handle(IPC.UpdaterCheck, () => checkForUpdates());
ipcMain.handle(IPC.UpdaterInstall, () => { quitAndInstall(); return true; });
