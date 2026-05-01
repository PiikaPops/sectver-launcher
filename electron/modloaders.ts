import {
  installFabric,
  installForge,
  installNeoForged,
  getForgeVersionList,
  install as installMinecraft,
  getVersionList
} from "@xmcl/installer";
import { sharedMcDir } from "./paths";
import type { ProfileManifest } from "../shared/types";

/**
 * Installe la version vanilla complète (jar + libs + assets) si absente.
 * NeoForge / Forge / Fabric exigent que le jar vanilla soit présent localement.
 */
export async function ensureVanilla(mcVersion: string): Promise<void> {
  const list = await getVersionList();
  const meta = list.versions.find(v => v.id === mcVersion);
  if (!meta) {
    throw new Error(
      `Version Minecraft "${mcVersion}" introuvable dans le manifest Mojang. ` +
      `Versions récentes : ${list.versions.slice(0, 5).map(v => v.id).join(", ")}`
    );
  }
  await installMinecraft(meta, sharedMcDir());
}

/**
 * Récupère la liste des versions NeoForge depuis le maven officiel
 * (l'API JSON retourne { isSnapshot, versions: string[] }).
 */
async function fetchNeoForgeVersions(mcVersion: string): Promise<string[]> {
  const url = "https://maven.neoforged.net/api/maven/versions/releases/net/neoforged/neoforge";
  const r = await fetch(url);
  if (!r.ok) throw new Error("NeoForge maven HTTP " + r.status);
  const data = (await r.json()) as { versions: string[] };
  // Les versions NeoForge sont préfixées par MC version sans le "1." (ex: 21.1.x pour MC 1.21.1).
  const stripped = mcVersion.startsWith("1.") ? mcVersion.slice(2) : mcVersion;
  return data.versions.filter(v => v.startsWith(stripped + "."));
}

export async function ensureLoader(profile: ProfileManifest): Promise<string> {
  const root = sharedMcDir();
  const mcv = profile.minecraftVersion;

  await ensureVanilla(mcv);

  if (profile.loader === "vanilla") return mcv;

  if (profile.loader === "fabric") {
    const loaderVersion =
      profile.loaderVersion && profile.loaderVersion !== "latest"
        ? profile.loaderVersion
        : ""; // chaîne vide = laisse l'installer choisir la dernière stable
    return await installFabric({
      minecraftVersion: mcv,
      version: loaderVersion,
      minecraft: root,
      side: "client"
    });
  }

  if (profile.loader === "forge") {
    const list = await getForgeVersionList({ minecraft: mcv });
    const versions = list.versions ?? [];
    const target =
      profile.loaderVersion && profile.loaderVersion !== "latest"
        ? versions.find(v => v.version === profile.loaderVersion)
        : versions[0];
    if (!target) throw new Error("Forge introuvable pour " + mcv);
    return await installForge(target as any, root);
  }

  if (profile.loader === "neoforge") {
    const versions = await fetchNeoForgeVersions(mcv);
    if (versions.length === 0) throw new Error("NeoForge introuvable pour " + mcv);
    const target =
      profile.loaderVersion && profile.loaderVersion !== "latest"
        ? profile.loaderVersion
        : versions[versions.length - 1];
    return await installNeoForged("neoforge", target, root, { side: "client" });
  }

  return mcv;
}
