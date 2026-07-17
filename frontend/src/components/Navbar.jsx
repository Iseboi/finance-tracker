// Modular navbar: horizontal links on desktop, side drawer on mobile.
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../AuthContext";

const LINKS = [
  { to: "/", label: "Dashboard" },
  { to: "/transactions", label: "Transactions" },
  { to: "/reports", label: "Reports" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { logout } = useAuth();

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <nav className="nav">
      <button
        className="nav-toggle"
        onClick={() => setOpen(!open)}
        aria-label="Menu"
        aria-expanded={open}
      >
        <span /><span /><span />
      </button>
      <p className="brand">Finance Tracker</p>
      <button
        className={`nav-scrim ${open ? "open" : ""}`}
        aria-label="Close menu"
        tabIndex={open ? 0 : -1}
        onClick={() => setOpen(false)}
      />
      <div className={`nav-links ${open ? "open" : ""}`}>
        {LINKS.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            onClick={() => setOpen(false)}
          >
            <i className="arrow-ico" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
        <div className="nav-side">
          <p className="date">{dateLabel}</p>
          <button className="ghost" onClick={logout}>Log out</button>
        </div>
      </div>
    </nav>
  );
}
