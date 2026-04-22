import SeasonHeaderV2 from "./SeasonHeaderV2";

const APP_VERSION_LABEL = `CyManager Toolkit v${__APP_VERSION__}`;

export default function Header() {
  return (
    <header className="topbar">
      <div className="topbar-header-row">
        <div>
          <p className="eyebrow">CyManager Toolkit V2</p>
          <h1 className="topbar-title">Cockpit saisonnier du club</h1>
        </div>

        <div className="topbar-actions">
          <span className="status-badge">{APP_VERSION_LABEL}</span>
        </div>
      </div>

      <SeasonHeaderV2 />
    </header>
  );
}