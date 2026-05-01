import { autoUpdater } from "electron-updater";
import { BrowserWindow } from "electron";
import { IPC } from "../shared/ipc";

export function initUpdater(getWin: () => BrowserWindow | null) {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  const send = (status: string, payload: any = {}) => {
    const w = getWin();
    if (w && !w.isDestroyed()) w.webContents.send(IPC.EvtUpdaterStatus, { status, ...payload });
  };

  autoUpdater.on("checking-for-update", () => send("checking"));
  autoUpdater.on("update-available", info => send("available", { version: info.version }));
  autoUpdater.on("update-not-available", () => send("none"));
  autoUpdater.on("download-progress", p => send("progress", { percent: p.percent }));
  autoUpdater.on("update-downloaded", info => send("downloaded", { version: info.version }));
  autoUpdater.on("error", err => send("error", { message: String(err) }));
}

export async function checkForUpdates() {
  return autoUpdater.checkForUpdates();
}

export function quitAndInstall() {
  autoUpdater.quitAndInstall();
}
