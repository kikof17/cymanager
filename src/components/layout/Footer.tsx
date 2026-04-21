const APP_VERSION_LABEL = `CyManager Toolkit v${__APP_VERSION__}`;

export default function Footer() {
  return (
    <footer className="footer">
      <span>{APP_VERSION_LABEL}</span>
      <span>Release 1.5.0 · React + Vite + TypeScript</span>
    </footer>
  );
}