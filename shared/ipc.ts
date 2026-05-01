export const IPC = {
  AuthLogin: "auth:login",
  AuthLogout: "auth:logout",
  AuthCurrent: "auth:current",

  ManifestFetch: "manifest:fetch",

  ProfileLaunch: "profile:launch",
  ProfileOpenFolder: "profile:openFolder",
  ProfileImportMod: "profile:importMod",
  ProfileImportShader: "profile:importShader",
  ProfileImportResourcePack: "profile:importRP",
  ProfileListLocalMods: "profile:listMods",
  ProfileRemoveLocalMod: "profile:removeMod",

  SettingsGet: "settings:get",
  SettingsSet: "settings:set",

  UpdaterCheck: "updater:check",
  UpdaterInstall: "updater:install",

  EvtLaunchProgress: "evt:launch:progress",
  EvtUpdaterStatus: "evt:updater:status"
} as const;
