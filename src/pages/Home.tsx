import { useState } from "react";
import type { LaunchProgress, RemoteManifest, UserSettings } from "../../shared/types";

interface Props {
  manifest: RemoteManifest | null;
  settings: UserSettings;
  selectedProfile: string | null;
  setSelectedProfile: (id: string) => void;
  updateSettings: (s: UserSettings) => Promise<void>;
  progress: LaunchProgress | null;
}

export function Home({ manifest, settings, selectedProfile, setSelectedProfile, updateSettings, progress }: Props) {
  const [launching, setLaunching] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!manifest) return <div className="muted">Chargement du manifeste…</div>;

  const profile = manifest.profiles.find(p => p.id === selectedProfile) ?? null;
  const ram = profile ? (settings.ramByProfile[profile.id] ?? profile.defaultRamMb) : 4096;

  const onRamChange = async (v: number) => {
    if (!profile) return;
    await updateSettings({
      ...settings,
      ramByProfile: { ...settings.ramByProfile, [profile.id]: v }
    });
  };

  const launch = async () => {
    if (!profile) return;
    setErr(null);
    setLaunching(true);
    try {
      await window.api.profile.launch(profile.id, ram);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLaunching(false);
    }
  };

  return (
    <>
      <h1 className="title">Bienvenue</h1>
      {manifest.announcement && <div className="card">{manifest.announcement}</div>}

      <div className="subtitle">Choisissez votre version</div>
      <div className="profile-grid">
        {manifest.profiles.map(p => (
          <div
            key={p.id}
            className={`profile-card ${selectedProfile === p.id ? "selected" : ""}`}
            onClick={() => setSelectedProfile(p.id)}
          >
            <div className="spread" style={{ marginBottom: 10 }}>
              <strong style={{ fontSize: 16 }}>{p.displayName}</strong>
              <span className="tag">{p.loader}</span>
            </div>
            <div className="muted">Minecraft {p.minecraftVersion}</div>
            {p.mods?.length ? <div className="muted" style={{ marginTop: 6 }}>{p.mods.length} mods</div> : null}
          </div>
        ))}
      </div>

      {profile && (
        <div className="card" style={{ marginTop: 22 }}>
          <div className="spread" style={{ marginBottom: 14 }}>
            <strong>Mémoire allouée : {ram} Mo</strong>
            <span className="muted">Min 1024 — Max 16384</span>
          </div>
          <input
            type="range" min={1024} max={16384} step={512}
            value={ram}
            onChange={e => onRamChange(parseInt(e.target.value, 10))}
          />

          <div style={{ marginTop: 18 }} className="row">
            <button className="primary" disabled={launching} onClick={launch} style={{ padding: "12px 22px", fontSize: 15 }}>
              {launching ? "Lancement…" : `Lancer ${profile.displayName}`}
            </button>
            <button onClick={() => window.api.profile.openFolder(profile.id)}>
              Ouvrir le dossier
            </button>
          </div>

          {progress && (
            <div style={{ marginTop: 16 }}>
              <div className="muted">{progress.stage} — {progress.message}</div>
              {typeof progress.percent === "number" && (
                <div className="progressbar"><span style={{ width: `${progress.percent}%` }} /></div>
              )}
            </div>
          )}
          {err && <div className="danger" style={{ marginTop: 12 }}>{err}</div>}
        </div>
      )}
    </>
  );
}
