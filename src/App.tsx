import { useEffect, useState } from "react";
import type { AuthAccount, RemoteManifest, UserSettings, LaunchProgress } from "../shared/types";
import { Login } from "./pages/Login";
import { Home } from "./pages/Home";
import { Mods } from "./pages/Mods";
import { Settings } from "./pages/Settings";
import { TitleBar } from "./components/TitleBar";

type Page = "home" | "mods" | "settings";

export default function App() {
  const [account, setAccount] = useState<AuthAccount | null>(null);
  const [manifest, setManifest] = useState<RemoteManifest | null>(null);
  const [settings, setSettings] = useState<UserSettings>({ ramByProfile: {} });
  const [page, setPage] = useState<Page>("home");
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [progress, setProgress] = useState<LaunchProgress | null>(null);
  const [updateInfo, setUpdateInfo] = useState<{ status: string; version?: string; percent?: number } | null>(null);

  useEffect(() => {
    window.api.auth.current().then(a => setAccount(a as AuthAccount | null));
    window.api.settings.get().then(s => setSettings(s as UserSettings));
    window.api.manifest.fetch().then(m => {
      setManifest(m as RemoteManifest);
      const last = (m as RemoteManifest).profiles[0]?.id;
      setSelectedProfile(prev => prev ?? last ?? null);
    }).catch(e => console.error("manifest", e));

    const offProgress = window.api.on.launchProgress(p => {
      setProgress(prev => {
        // Une erreur ne doit pas être écrasée par un event tardif "done".
        if (prev?.stage === "error" && p.stage === "done") return prev;
        return p;
      });
    });
    const offUpdater = window.api.on.updaterStatus(s => setUpdateInfo(s));
    return () => { offProgress(); offUpdater(); };
  }, []);

  useEffect(() => {
    if (manifest && !selectedProfile) setSelectedProfile(manifest.profiles[0]?.id ?? null);
  }, [manifest, selectedProfile]);

  if (!account) {
    return (
      <div className="app-shell">
        <TitleBar />
        <Login onLogin={async () => {
          const a = await window.api.auth.login();
          setAccount(a as AuthAccount);
        }} />
      </div>
    );
  }

  const updateSettings = async (next: UserSettings) => {
    setSettings(next);
    await window.api.settings.set(next);
  };

  return (
    <div className="app-shell">
      <TitleBar />
      <div className="app">
      <aside className="sidebar">
        <button className={`nav-btn ${page === "home" ? "active" : ""}`} onClick={() => setPage("home")}>Accueil</button>
        <button className={`nav-btn ${page === "mods" ? "active" : ""}`} onClick={() => setPage("mods")}>Mods & Packs</button>
        <button className={`nav-btn ${page === "settings" ? "active" : ""}`} onClick={() => setPage("settings")}>Paramètres</button>
        <div style={{ flex: 1 }} />
        <div className="user-card">
          <img
            src={`https://mc-heads.net/avatar/${account.uuid}/32`}
            alt=""
            width={32}
            height={32}
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <span className="ulabel">Connecté</span>
            <span className="uname" title={account.username} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {account.username}
            </span>
          </div>
        </div>
        <button className="nav-btn" style={{ marginTop: 8 }} onClick={async () => { await window.api.auth.logout(); setAccount(null); }}>
          Se déconnecter
        </button>
      </aside>

      <main className="main">
        {page === "home" && (
          <Home
            manifest={manifest}
            settings={settings}
            selectedProfile={selectedProfile}
            setSelectedProfile={setSelectedProfile}
            updateSettings={updateSettings}
            progress={progress}
          />
        )}
        {page === "mods" && manifest && selectedProfile && (
          <Mods
            manifest={manifest}
            profileId={selectedProfile}
            setProfileId={setSelectedProfile}
            settings={settings}
            updateSettings={updateSettings}
          />
        )}
        {page === "settings" && (
          <Settings
            manifest={manifest}
            settings={settings}
            updateSettings={updateSettings}
            updateInfo={updateInfo}
          />
        )}
      </main>

      </div>
      {updateInfo && (updateInfo.status === "available" || updateInfo.status === "downloaded") && (
        <div className="toast">
          <div style={{ fontWeight: 700, marginBottom: 6 }}>
            {updateInfo.status === "downloaded" ? "Mise à jour prête" : "Mise à jour disponible"}
            {updateInfo.version ? ` — v${updateInfo.version}` : ""}
          </div>
          {updateInfo.status === "downloaded" ? (
            <button className="primary" onClick={() => window.api.updater.install()}>
              Installer & redémarrer
            </button>
          ) : (
            <div className="muted">Téléchargement en cours…</div>
          )}
        </div>
      )}
    </div>
  );
}
