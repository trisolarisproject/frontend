import { Link, NavLink, Outlet } from "react-router-dom";

const links = [{ to: "/campaigns", label: "Campaigns" }];

const AppShell = () => {
  return (
    <div className="app-shell">
      <header className="top-nav">
        <div className="container top-nav-inner">
          <Link className="brand" to="/campaigns">
            Marketing MVP
          </Link>
          <nav>
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `nav-link ${isActive ? "nav-link-active" : ""}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="container app-content">
        <Outlet />
      </main>
    </div>
  );
};

export default AppShell;