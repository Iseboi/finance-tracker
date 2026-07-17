// Modular navbar: horizontal links on desktop, side drawer on mobile.
import { useState } from "react";
import { useAuth } from "../AuthContext";

const LINKS = ["Dashboard", "Transactions", "Reports"];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("Dashboard");
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
        {LINKS.map((l) => (
          <button
            key={l}
            className={`nav-link ${active === l ? "active" : ""}`}
            onClick={() => {
              setActive(l);
              setOpen(false);
            }}
          >
            <i className="arrow-ico" aria-hidden="true" />
            {l}
          </button>
        ))}
        <div className="nav-side">
          <p className="date">{dateLabel}</p>
          <button className="ghost" onClick={logout}>Log out</button>
        </div>
      </div>
    </nav>
  );
}
