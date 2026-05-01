import * as path from "path";
import { sharedMcDir } from "./paths";
import type { ProfileManifest } from "../shared/types";

/**
 * Installe le loader (Forge/NeoForge/Fabric) au-dessus de la version vanilla
 * et retourne l'ID de version à passer à minecraft-launcher-core.
 *
 * @xmcl/installer expose des installeurs robustes ; on charge dynamiquement
 * pour tolérer l'absence de certains sous-paquets selon la version.
 */
export async function ensureLoader(profile: ProfileManifest): Promise<string> {
  const root = sharedMcDir();
  const mcv = profile.minecraftVersion;

  if (profile.loader === "vanilla") return mcv;

  if (profile.loader === "fabric") {
    const fabric = await import("@xmcl/installer/fabric");
    const versions = await fabric.getFabricLoaderArtifact(mcv, profile.loaderVersion ?? "");
    const versionId = await fabric.installFabric(versions, root);
    return versionId;
  }

  if (profile.loader === "forge") {
    const forge = await import("@xmcl/installer/forge");
    const list = await forge.getForgeVersionList({ mcversion: mcv } as any);
    const target =
      profile.loaderVersion && profile.loaderVersion !== "latest"
        ? list.versions.find((v: any) => v.version === profile.loaderVersion)
        : list.versions[0];
    if (!target) throw new Error("Forge introuvable pour " + mcv);
    return await forge.installForge(target as any, root);
  }

  if (profile.loader === "neoforge") {
    const neo = await import("@xmcl/installer/neoForged");
    const list = await neo.getNeoForgedVersionList(mcv);
    const target =
      profile.loaderVersion && profile.loaderVersion !== "latest"
        ? profile.loaderVersion
        : list.versions[list.versions.length - 1];
    if (!target) throw new Error("NeoForge introuvable pour " + mcv);
    return await neo.installNeoForged("neoforge", target, root);
  }

  return mcv;
}

export function loaderVersionsDir() {
  return path.join(sharedMcDir(), "versions");
}
