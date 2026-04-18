import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Accueil" },
  { to: "/guide", label: "Guide débutant" },
  { to: "/faq", label: "FAQ" },
  { to: "/effectif", label: "Effectif" },
  { to: "/entrainement", label: "Entraînement" },
  { to: "/courses", label: "Courses" },
  { to: "/calendrier", label: "Calendrier" },
  { to: "/resultats", label: "Résultats" },
  { to: "/classement", label: "Classement" },
  { to: "/todo", label: "To-do" },
  { to: "/parametres", label: "Paramètres" },
];

export default function Sidebar() {
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
    </aside>
  );
}