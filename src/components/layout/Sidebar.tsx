import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Accueil" },
  { to: "/guide", label: "Guide débutant" },
  { to: "/faq", label: "FAQ" },
  { to: "/effectif", label: "Effectif" },
  { to: "/transferts", label: "Transferts" },
  { to: "/entrainement", label: "Entraînement" },
  { to: "/courses", label: "Courses" },
  { to: "/calendrier", label: "Calendrier" },
  { to: "/resultats", label: "Résultats" },
  { to: "/classement", label: "Classement" },
  { to: "/statistiques", label: "Statistiques" },
  { to: "/finance", label: "Finance" },
  { to: "/planification", label: "Planification" },
  { to: "/todo", label: "To-do" },
  { to: "/parametres", label: "Paramètres" },
];

export default function Sidebar() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const formattedDate = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(now);

  const formattedTime = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(now);

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo">CM</div>
        <div>
          <strong>CyManager</strong>
          <p className="sidebar-subtitle">Gestion club</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === "/"}
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-clock" aria-label="Date et heure actuelles">
        <p className="sidebar-clock-time">{formattedTime}</p>
        <p className="sidebar-clock-date">{formattedDate}</p>
      </div>
    </aside>
  );
}