import { useState } from "react";

export function Login({ onLogin }: { onLogin: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleLogin = async () => {
    setBusy(true);
    setErr(null);
    try { await onLogin(); }
    catch (e: any) { setErr(e?.message ?? String(e)); }
    finally { setBusy(false); }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1>SECTVER</h1>
        <div className="muted" style={{ marginBottom: 24 }}>Launcher Minecraft</div>
        <button className="primary" style={{ width: "100%", padding: "12px" }} disabled={busy} onClick={handleLogin}>
          {busy ? "Connexion…" : "Se connecter avec Microsoft"}
        </button>
        {err && <div className="danger" style={{ marginTop: 14, fontSize: 13 }}>{err}</div>}
        <div className="muted" style={{ marginTop: 24, fontSize: 12 }}>
          Une fenêtre Microsoft va s'ouvrir pour authentifier votre compte Minecraft.
        </div>
      </div>
    </div>
  );
}
