import { useState } from "react";
import type { LaunchProgress, RemoteManifest, ProfileManifest, UserSettings } from "../../shared/types";

interface Props {
  manifest: RemoteManifest | null;
  settings: UserSettings;
  selectedProfile: string | null;
  setSelectedProfile: (id: string) => void;
  updateSettings: (s: UserSettings) => Promise<void>;
  progress: LaunchProgress | null;
}

/** Applique le choix de loader utilisateur sur un profil de base (MC version inchangée). */
function effectiveProfile(p: ProfileManifest, settings: UserSettings): ProfileManifest {
  const override = settings.loaderByProfile?.[p.id];
  if (!override || override === p.loader) return p;
  return { ...p, loader: override };
}

export function Home({ manifest, settings, progress }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errById, setErrById] = useState<Record<string, string | null>>({});

  if (!manifest) {
    return (
      <div className="home">
        <div className="hero-heading">Choisissez votre Sectver !</div>
        <div className="muted" style={{ textAlign: "center" }}>Chargement du manifeste…</div>
      </div>
    );
  }

  const launch = async (p: ProfileManifest) => {
    const ram = settings.ramByProfile[p.id] ?? p.defaultRamMb;
    setBusyId(p.id);
    setErrById(prev => ({ ...prev, [p.id]: null }));
    try {
      await window.api.profile.launch(p.id, ram);
    } catch (e: any) {
      setErrById(prev => ({ ...prev, [p.id]: e?.message ?? String(e) }));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="home">
      <div className="hero-heading">Choisissez votre Sectver !</div>

      <div className="profile-panels">
        {manifest.profiles.map(basis => {
          const p = effectiveProfile(basis, settings);
          const ram = settings.ramByProfile[basis.id] ?? basis.defaultRamMb;
          const isBusy = busyId === basis.id;
          const showProgress = isBusy && progress;
          const localErr = errById[basis.id];
          const isModded = p.loader !== "vanilla";
          return (
            <ProfilePanel
              key={basis.id}
              profile={p}
              ramMb={ram}
              isBusy={isBusy}
              progress={showProgress ? progress : null}
              error={localErr}
              isModded={isModded}
              onPlay={() => launch(p)}
              onOpenFolder={() => window.api.profile.openFolder(basis.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

interface PanelProps {
  profile: ProfileManifest;
  ramMb: number;
  isBusy: boolean;
  progress: LaunchProgress | null;
  error: string | null | undefined;
  isModded: boolean;
  onPlay: () => void;
  onOpenFolder: () => void;
}

function ProfilePanel({ profile, ramMb, isBusy, progress, error, isModded, onPlay, onOpenFolder }: PanelProps) {
  const bgUrl = `./backgrounds/${profile.id}.jpg`;
  return (
    <div
      className="profile-panel"
      style={{ ["--profile-bg" as any]: `url("${bgUrl}")` }}
    >
      <div className="pp-bg" />
      <div className="pp-head">
        <div>
          <div className="pp-name">{profile.displayName}</div>
          <span className="pp-mc">Minecraft {profile.minecraftVersion}</span>
        </div>
        <span className={`tag ${isModded ? "" : "gold"}`}>{profile.loader}</span>
      </div>

      <div className="pp-stats">
        <span className="pp-stat">RAM : <strong>{(ramMb / 1024).toFixed(1)} Go</strong></span>
        {profile.mods?.length ? (
          <span className="pp-stat"><strong>{profile.mods.length}</strong> mods</span>
        ) : null}
        {profile.shaders?.length ? (
          <span className="pp-stat"><strong>{profile.shaders.length}</strong> shaders</span>
        ) : null}
      </div>

      <div className="pp-spacer" />

      {(progress || error) && (
        <div className={`pp-progress ${progress?.stage === "error" || error ? "error" : ""}`}>
          {error
            ? error
            : progress
              ? `${progress.stage} — ${progress.message}`
              : ""}
          {progress && typeof progress.percent === "number" && (
            <div className="progressbar"><span style={{ width: `${progress.percent}%` }} /></div>
          )}
        </div>
      )}

      <button className="play-btn" disabled={isBusy} onClick={onPlay}>
        {isBusy ? "Lancement…" : "Jouer"}
      </button>

      <div className="pp-tools">
        <button onClick={onOpenFolder}>Ouvrir le dossier</button>
      </div>
    </div>
  );
}
