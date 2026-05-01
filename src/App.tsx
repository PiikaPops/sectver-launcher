import { useEffect, useState } from "react";
import type { AuthAccount, RemoteManifest, UserSettings, LaunchProgress } from "../shared/types";
import { Login } from "./pages/Login";
import { Home } from "./pages/Home";
import { Mods } from "./pages/Mods";
import { Settings } from "./pages/Settings";

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

    const offProgress = window.api.on.launchProgress(p => setProgress(p));
    const offUpdater = window.api.on.updaterStatus(s => setUpdateInfo(s));
    return () => { offProgress(); offUpdater(); };
  }, []);

  useEffect(() => {
    if (manifest && !selectedProfile) setSelectedProfile(manifest.profiles[0]?.id ?? null);
  }, [manifest, selectedProfile]);

  if (!account) {
    return <Login onLogin={async () => {
      const a = await window.api.auth.login();
      setAccount(a as AuthAccount);
    }} />;
  }

  const updateSettings = async (next: UserSettings) => {
    setSettings(next);
    await window.api.settings.set(next);
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">SECTVER</div>
        <button className={`nav-btn ${page === "home" ? "active" : ""}`} onClick={() => setPage("home")}>Accueil</button>
        <button className={`nav-btn ${page === "mods" ? "active" : ""}`} onClick={() => setPage("mods")}>Mods & Packs</button>
        <button className={`nav-btn ${page === "settings" ? "active" : ""}`} onClick={() => setPage("settings")}>Paramètres</button>
        <div style={{ flex: 1 }} />
        <div className="muted" style={{ padding: "8px 10px" }}>
          Connecté en tant que <strong style={{ color: "var(--text)" }}>{account.username}</strong>
        </div>
        <button className="nav-btn" onClick={async () => { await window.api.auth.logout(); setAccount(null); }}>
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
          <Mods manifest={manifest} profileId={selectedProfile} setProfileId={setSelectedProfile} />
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
