import type { RemoteManifest, UserSettings } from "../../shared/types";

interface Props {
  manifest: RemoteManifest | null;
  settings: UserSettings;
  updateSettings: (s: UserSettings) => Promise<void>;
  updateInfo: { status: string; version?: string; percent?: number } | null;
}

export function Settings({ manifest, settings, updateSettings, updateInfo }: Props) {
  return (
    <>
      <h1 className="title">Paramètres</h1>

      <div className="card">
        <strong style={{ display: "block", marginBottom: 12 }}>Mémoire allouée par profil</strong>
        {manifest?.profiles.map(p => {
          const ram = settings.ramByProfile[p.id] ?? p.defaultRamMb;
          return (
            <div key={p.id} style={{ marginBottom: 16 }}>
              <div className="spread">
                <span>{p.displayName}</span>
                <span className="muted">{ram} Mo</span>
              </div>
              <input
                type="range" min={1024} max={16384} step={512}
                value={ram}
                onChange={e => updateSettings({
                  ...settings,
                  ramByProfile: { ...settings.ramByProfile, [p.id]: parseInt(e.target.value, 10) }
                })}
              />
            </div>
          );
        })}
      </div>

      <div className="card">
        <div className="spread">
          <div>
            <strong>Mises à jour du launcher</strong>
            <div className="muted">
              {updateInfo
                ? `${updateInfo.status}${updateInfo.version ? ` — v${updateInfo.version}` : ""}`
                : "Aucune information"}
            </div>
          </div>
          <div className="row">
            <button onClick={() => window.api.updater.check()}>Vérifier maintenant</button>
            {updateInfo?.status === "downloaded" && (
              <button className="primary" onClick={() => window.api.updater.install()}>
                Installer & redémarrer
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="card muted" style={{ fontSize: 12 }}>
        Sectver Launcher — les versions Minecraft, le loader et la liste de mods sont contrôlés à distance par les administrateurs via le manifeste GitHub.
      </div>
    </>
  );
}
