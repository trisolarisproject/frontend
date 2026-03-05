import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import brandLogo from "../../logo_50_by_50.svg";
import { useLocation } from "react-router-dom";

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

const primaryNavItems: NavItem[] = [
  { to: "/summary", label: "Summary" },
  { to: "/performance", label: "Performance" },
];

const campaignNavItems: NavItem[] = [
  { to: "/campaigns", label: "Campaigns", end: true },
  { to: "/campaigns/new", label: "New Campaign" },
  { to: "/campaign-assets", label: "Campaign Assets" },
];

const utilityNavItems: NavItem[] = [
  { to: "/audiences", label: "Audiences" },
  { to: "/creative-library", label: "Creative Library" },
];

const AppShell = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <button
        type="button"
        className="sidebar-backdrop"
        aria-label="Close menu"
        onClick={() => setSidebarOpen(false)}
        data-open={isSidebarOpen}
      />

      <aside className={`sidebar ${isSidebarOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-top">
          <Link className="brand" to="/campaigns">
            <img className="brand-logo" src={brandLogo} alt="Sekoa logo" />
            <span>Sekoa</span>
          </Link>
          <button
            type="button"
            className="sidebar-close"
            aria-label="Close menu"
            onClick={() => setSidebarOpen(false)}
          >
            ✕
          </button>
        </div>

        <p className="side-section-label">Navigation</p>
        <nav className="sidebar-nav">
          {primaryNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `side-link ${isActive ? "side-link-active" : ""}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <p className="side-section-label">Campaigns</p>
        <nav className="sidebar-nav">
          {campaignNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `side-link ${isActive ? "side-link-active" : ""}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <p className="side-section-label">Utilities</p>
        <nav className="sidebar-nav">
          {utilityNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `side-link ${isActive ? "side-link-active" : ""}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          <p className="muted">AI Marketing Wizard</p>
          <p className="muted">Beta v0.0.1</p>
        </div>
      </aside>

      <main className="app-content">
        <button
          type="button"
          className="sidebar-toggle"
          aria-label="Open menu"
          onClick={() => setSidebarOpen(true)}
        >
          ☰ Menu
        </button>
        <div className="content-container">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppShell;
