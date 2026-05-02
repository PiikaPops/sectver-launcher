import { useEffect, useState, useCallback } from "react";
import type { Loader, RemoteManifest, UserSettings } from "../../shared/types";

const LOADER_CHOICES: { id: Loader; label: string }[] = [
  { id: "vanilla", label: "Vanilla" },
  { id: "fabric", label: "Fabric" },
  { id: "neoforge", label: "NeoForge" },
  { id: "forge", label: "Forge" }
];

interface Props {
  manifest: RemoteManifest;
  profileId: string;
  setProfileId: (id: string) => void;
  settings: UserSettings;
  updateSettings: (s: UserSettings) => Promise<void>;
}

export function Mods({ manifest, profileId, setProfileId, settings, updateSettings }: Props) {
  const [localMods, setLocalMods] = useState<string[]>([]);

  const profile = manifest.profiles.find(p => p.id === profileId);

  const refresh = useCallback(async () => {
    const list = await window.api.profile.listMods(profileId);
    setLocalMods(list as string[]);
  }, [profileId]);

  useEffect(() => { refresh(); }, [refresh]);

  if (!profile) return null;

  const hasManagedMods = (profile.mods?.length ?? 0) > 0;
  const requiredNames = new Set((profile.mods ?? []).map(m => m.name));
  const allowLoaderPicker = profile.loader === "vanilla";
  const currentLoader = (settings.loaderByProfile?.[profile.id] ?? profile.loader) as Loader;

  const setLoader = async (loader: Loader) => {
    await updateSettings({
      ...settings,
      loaderByProfile: { ...(settings.loaderByProfile ?? {}), [profile.id]: loader }
    });
  };

  return (
    <>
      <h1 className="title">Mods & Packs</h1>

      <div className="card">
        <div className="spread">
          <div>
            <strong>Profil sélectionné : {profile.displayName}</strong>
            <div className="muted">{currentLoader} — Minecraft {profile.minecraftVersion}</div>
          </div>
          <select value={profileId} onChange={e => setProfileId(e.target.value)}>
            {manifest.profiles.map(p => <option key={p.id} value={p.id}>{p.displayName}</option>)}
          </select>
        </div>
      </div>

      {allowLoaderPicker && (
        <div className="card">
          <div className="spread" style={{ marginBottom: 12 }}>
            <strong>Loader de mods</strong>
            <span className="muted">Pour Minecraft {profile.minecraftVersion}</span>
          </div>
          <div className="loader-picker">
            {LOADER_CHOICES.map(c => (
              <label key={c.id} className={`loader-opt ${currentLoader === c.id ? "on" : ""}`}>
                <input
                  type="radio"
                  name={`loader-${profile.id}`}
                  checked={currentLoader === c.id}
                  onChange={() => setLoader(c.id)}
                />
                <span>{c.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {hasManagedMods && (
        <div className="card">
          <div className="spread" style={{ marginBottom: 12 }}>
            <strong>Mods côté serveur (gérés)</strong>
            <span className="muted">{profile.mods!.length} mods</span>
          </div>
          <ul className="mods-list">
            {profile.mods!.map(m => (
              <li key={m.name}>
                <span>{m.name}</span>
                <span className="tag">requis</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        <div className="spread" style={{ marginBottom: 12 }}>
          <strong>Mes mods locaux</strong>
          <div className="row">
            <button onClick={async () => { await window.api.profile.importMod(profileId); refresh(); }}>+ Ajouter mods</button>
            <button onClick={async () => { await window.api.profile.importShader(profileId); }}>+ Shaders</button>
            <button onClick={async () => { await window.api.profile.importResourcePack(profileId); }}>+ Resource Packs</button>
            <button onClick={() => window.api.profile.openFolder(profileId)}>Ouvrir le dossier</button>
          </div>
        </div>
        <ul className="mods-list">
          {localMods.map(name => {
            const isRequired = requiredNames.has(name);
            return (
              <li key={name}>
                <span>{name}</span>
                {isRequired ? (
                  <span className="tag">requis</span>
                ) : (
                  <button
                    onClick={async () => { await window.api.profile.removeMod(profileId, name); refresh(); }}
                    style={{ padding: "4px 10px", fontSize: 12 }}
                  >
                    Supprimer
                  </button>
                )}
              </li>
            );
          })}
          {localMods.length === 0 && <li className="muted">Aucun mod local.</li>}
        </ul>
      </div>
    </>
  );
}
