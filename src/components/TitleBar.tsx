export function TitleBar() {
  return (
    <div className="titlebar">
      <div className="titlebar-drag">
        <span className="titlebar-title">SECTVER LAUNCHER</span>
      </div>
      <div className="titlebar-actions">
        <button className="tb-btn" title="Réduire" onClick={() => window.api.win.minimize()} aria-label="Réduire">
          <svg width="12" height="12" viewBox="0 0 12 12"><rect x="2" y="5.5" width="8" height="1" fill="currentColor" /></svg>
        </button>
        <button className="tb-btn tb-close" title="Fermer" onClick={() => window.api.win.close()} aria-label="Fermer">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <line x1="2.5" y1="2.5" x2="9.5" y2="9.5" stroke="currentColor" strokeWidth="1.2" />
            <line x1="9.5" y1="2.5" x2="2.5" y2="9.5" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
