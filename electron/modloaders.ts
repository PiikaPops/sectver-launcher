import {
  installFabric,
  installForge,
  installNeoForged,
  getLoaderArtifactListFor,
  install as installMinecraft,
  getVersionList
} from "@xmcl/installer";
import { sharedMcDir } from "./paths";
import type { ProfileManifest } from "../shared/types";

/**
 * Installe la version vanilla complète (jar + libs + assets) si absente.
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
 * Liste des versions NeoForge depuis le maven officiel.
 */
async function fetchNeoForgeVersions(mcVersion: string): Promise<string[]> {
  const url = "https://maven.neoforged.net/api/maven/versions/releases/net/neoforged/neoforge";
  const r = await fetch(url);
  if (!r.ok) throw new Error("NeoForge maven HTTP " + r.status);
  const data = (await r.json()) as { versions: string[] };
  const stripped = mcVersion.startsWith("1.") ? mcVersion.slice(2) : mcVersion;
  return data.versions.filter(v => v.startsWith(stripped + "."));
}

/**
 * Récupère la dernière version "recommended" (sinon "latest") de Forge pour
 * une version MC donnée, via l'endpoint officiel promotions_slim.json. Plus
 * fiable que getForgeVersionList qui parse le HTML du site et casse souvent.
 */
async function fetchForgeVersion(mcVersion: string): Promise<string> {
  const url = "https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json";
  const r = await fetch(url);
  if (!r.ok) throw new Error("Forge promotions HTTP " + r.status);
  const data = (await r.json()) as { promos: Record<string, string> };
  const promo = data.promos[`${mcVersion}-recommended`] ?? data.promos[`${mcVersion}-latest`];
  if (!promo) throw new Error(`Aucune version Forge promue pour ${mcVersion}`);
  return promo;
}

export async function ensureLoader(profile: ProfileManifest): Promise<string> {
  const root = sharedMcDir();
  const mcv = profile.minecraftVersion;

  await ensureVanilla(mcv);

  if (profile.loader === "vanilla") return mcv;

  if (profile.loader === "fabric") {
    // Récupère explicitement la dernière version du loader Fabric pour ce MC,
    // car installFabric() avec version="" génère un 404 sur l'API meta.
    const artifacts = await getLoaderArtifactListFor(mcv);
    if (!artifacts.length) throw new Error(`Aucun loader Fabric disponible pour ${mcv}`);
    const requested =
      profile.loaderVersion && profile.loaderVersion !== "latest"
        ? artifacts.find(a => a.loader.version === profile.loaderVersion)?.loader.version
        : artifacts[0].loader.version;
    if (!requested) throw new Error(`Loader Fabric introuvable pour ${mcv}`);
    return await installFabric({
      minecraftVersion: mcv,
      version: requested,
      minecraft: root,
      side: "client"
    });
  }

  if (profile.loader === "forge") {
    const forgeVer =
      profile.loaderVersion && profile.loaderVersion !== "latest"
        ? profile.loaderVersion
        : await fetchForgeVersion(mcv);
    return await installForge(
      { mcversion: mcv, version: forgeVer } as any,
      root,
      { side: "client" }
    );
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
