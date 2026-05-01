import * as fs from "fs";
import { safeStorage } from "electron";
import { authFile, settingsFile } from "./paths";
import type { AuthAccount, UserSettings } from "../shared/types";

export function loadSettings(): UserSettings {
  try {
    return JSON.parse(fs.readFileSync(settingsFile(), "utf-8"));
  } catch {
    return { ramByProfile: {} };
  }
}

export function saveSettings(s: UserSettings) {
  fs.writeFileSync(settingsFile(), JSON.stringify(s, null, 2), "utf-8");
}

export function loadAccount(): AuthAccount | null {
  try {
    if (!fs.existsSync(authFile())) return null;
    const buf = fs.readFileSync(authFile());
    if (!safeStorage.isEncryptionAvailable()) return JSON.parse(buf.toString("utf-8"));
    return JSON.parse(safeStorage.decryptString(buf));
  } catch {
    return null;
  }
}

export function saveAccount(a: AuthAccount | null) {
  if (a === null) {
    try { fs.unlinkSync(authFile()); } catch {}
    return;
  }
  const json = JSON.stringify(a);
  if (safeStorage.isEncryptionAvailable()) {
    fs.writeFileSync(authFile(), safeStorage.encryptString(json));
  } else {
    fs.writeFileSync(authFile(), json, "utf-8");
  }
}
