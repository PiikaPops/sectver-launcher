import { app } from "electron";
import * as path from "path";
import * as fs from "fs";

export function rootDir() {
  const p = path.join(app.getPath("userData"), "sectver");
  fs.mkdirSync(p, { recursive: true });
  return p;
}

export function profileDir(profileId: string) {
  const p = path.join(rootDir(), "profiles", profileId);
  fs.mkdirSync(path.join(p, "mods"), { recursive: true });
  fs.mkdirSync(path.join(p, "shaderpacks"), { recursive: true });
  fs.mkdirSync(path.join(p, "resourcepacks"), { recursive: true });
  return p;
}

export function sharedMcDir() {
  const p = path.join(rootDir(), "minecraft");
  fs.mkdirSync(p, { recursive: true });
  return p;
}

export function settingsFile() {
  return path.join(rootDir(), "settings.json");
}

export function authFile() {
  return path.join(rootDir(), "auth.bin");
}

export function manifestCacheFile() {
  return path.join(rootDir(), "manifest.cache.json");
}
