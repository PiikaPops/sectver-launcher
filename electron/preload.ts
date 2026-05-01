import { contextBridge, ipcRenderer } from "electron";
import { IPC } from "../shared/ipc";

const api = {
  auth: {
    login: () => ipcRenderer.invoke(IPC.AuthLogin),
    logout: () => ipcRenderer.invoke(IPC.AuthLogout),
    current: () => ipcRenderer.invoke(IPC.AuthCurrent)
  },
  manifest: {
    fetch: () => ipcRenderer.invoke(IPC.ManifestFetch)
  },
  profile: {
    launch: (profileId: string, ramMb: number) => ipcRenderer.invoke(IPC.ProfileLaunch, { profileId, ramMb }),
    openFolder: (profileId: string) => ipcRenderer.invoke(IPC.ProfileOpenFolder, profileId),
    importMod: (profileId: string) => ipcRenderer.invoke(IPC.ProfileImportMod, profileId),
    importShader: (profileId: string) => ipcRenderer.invoke(IPC.ProfileImportShader, profileId),
    importResourcePack: (profileId: string) => ipcRenderer.invoke(IPC.ProfileImportResourcePack, profileId),
    listMods: (profileId: string) => ipcRenderer.invoke(IPC.ProfileListLocalMods, profileId),
    removeMod: (profileId: string, name: string) => ipcRenderer.invoke(IPC.ProfileRemoveLocalMod, { profileId, name })
  },
  settings: {
    get: () => ipcRenderer.invoke(IPC.SettingsGet),
    set: (s: any) => ipcRenderer.invoke(IPC.SettingsSet, s)
  },
  updater: {
    check: () => ipcRenderer.invoke(IPC.UpdaterCheck),
    install: () => ipcRenderer.invoke(IPC.UpdaterInstall)
  },
  on: {
    launchProgress: (cb: (p: any) => void) => {
      const fn = (_: any, p: any) => cb(p);
      ipcRenderer.on(IPC.EvtLaunchProgress, fn);
      return () => ipcRenderer.removeListener(IPC.EvtLaunchProgress, fn);
    },
    updaterStatus: (cb: (p: any) => void) => {
      const fn = (_: any, p: any) => cb(p);
      ipcRenderer.on(IPC.EvtUpdaterStatus, fn);
      return () => ipcRenderer.removeListener(IPC.EvtUpdaterStatus, fn);
    }
  }
};

contextBridge.exposeInMainWorld("api", api);
export type Api = typeof api;
