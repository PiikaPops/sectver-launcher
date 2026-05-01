import { useEffect, useState, useCallback } from "react";
import type { RemoteManifest } from "../../shared/types";

interface Props {
  manifest: RemoteManifest;
  profileId: string;
  setProfileId: (id: string) => void;
}

export function Mods({ manifest, profileId, setProfileId }: Props) {
  const [localMods, setLocalMods] = useState<string[]>([]);

  const profile = manifest.profiles.find(p => p.id === profileId);

  const refresh = useCallback(async () => {
    const list = await window.api.profile.listMods(profileId);
    setLocalMods(list as string[]);
  }, [profileId]);

  useEffect(() => { refresh(); }, [refresh]);

  if (!profile) return null;

  const isVanilla = profile.loader === "vanilla";

  return (
    <>
      <h1 className="title">Mods & Packs</h1>

      <div className="card">
        <div className="spread">
          <div>
            <strong>Profil sélectionné : {profile.displayName}</strong>
            <div className="muted">{profile.loader} — Minecraft {profile.minecraftVersion}</div>
          </div>
          <select
            value={profileId}
            onChange={e => setProfileId(e.target.value)}
            style={{ background: "var(--primary-2)", color: "var(--text)", border: "1px solid var(--border)", padding: 8, borderRadius: 6 }}
          >
            {manifest.profiles.map(p => <option key={p.id} value={p.id}>{p.displayName}</option>)}
          </select>
        </div>
      </div>

      {isVanilla && <div className="card muted">Le profil vanilla ne supporte pas les mods. Sélectionnez un profil moddé.</div>}

      {!isVanilla && (
        <>
          <div className="card">
            <div className="spread" style={{ marginBottom: 12 }}>
              <strong>Mods côté serveur (gérés)</strong>
              <span className="muted">{profile.mods?.length ?? 0} mods</span>
            </div>
            <ul className="mods-list">
              {(profile.mods ?? []).map(m => (
                <li key={m.name}>
                  <span>{m.name}</span>
                  <span className="tag">requis</span>
                </li>
              ))}
              {!profile.mods?.length && <li className="muted">Aucun mod géré pour ce profil.</li>}
            </ul>
          </div>

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
              {localMods.map(name => (
                <li key={name}>
                  <span>{name}</span>
                  <button
                    onClick={async () => { await window.api.profile.removeMod(profileId, name); refresh(); }}
                    style={{ padding: "4px 10px", fontSize: 12 }}
                  >
                    Supprimer
                  </button>
                </li>
              ))}
              {localMods.length === 0 && <li className="muted">Aucun mod local.</li>}
            </ul>
          </div>
        </>
      )}
    </>
  );
}
