const APP_VERSION_LABEL = "CyManager Toolkit v1.0.2";

export default function Header() {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">CyManager Toolkit</p>
        <h1 className="topbar-title">Assistant club</h1>
      </div>

      <div className="topbar-actions">
        <span className="status-badge">{APP_VERSION_LABEL}</span>
      </div>
    </header>
  );
}