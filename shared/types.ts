export type Loader = "vanilla" | "forge" | "neoforge" | "fabric";

export interface ModEntry {
  name: string;
  url: string;
  sha1?: string;
  required?: boolean;
}

export interface ResourceEntry {
  name: string;
  url: string;
  sha1?: string;
}

export interface ProfileManifest {
  id: string;
  displayName: string;
  minecraftVersion: string;
  loader: Loader;
  loaderVersion?: string;
  defaultRamMb: number;
  mods?: ModEntry[];
  shaders?: ResourceEntry[];
  resourcePacks?: ResourceEntry[];
}

export interface RemoteManifest {
  schemaVersion: 1;
  updatedAt: string;
  profiles: ProfileManifest[];
  announcement?: string;
}

export interface UserSettings {
  ramByProfile: Record<string, number>;
  /** Permet à l'utilisateur d'overrider le loader d'un profil (ex: passer "vanilla" en fabric). */
  loaderByProfile?: Record<string, Loader>;
  lastProfileId?: string;
}

export interface AuthAccount {
  uuid: string;
  username: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface LaunchProgress {
  stage: "auth" | "manifest" | "version" | "loader" | "mods" | "assets" | "launching" | "running" | "done" | "error";
  message: string;
  percent?: number;
}
