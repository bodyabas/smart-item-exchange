import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext.jsx";

const links = [
  ["Dashboard", "/dashboard"],
  ["Items", "/items"],
  ["Add Item", "/items/new"],
  ["Exchange Requests", "/exchange-requests"],
  ["Profile", "/profile"],
];

const publicLinks = [
  ["Items", "/items"],
  ["Login", "/login"],
  ["Register", "/register"],
];

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-lg font-semibold">Smart Item Exchange</p>
            <p className="text-sm text-muted">Trade smarter with matching tools</p>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            {(isAuthenticated ? links : publicLinks).map(([label, to]) => {
              const isActive = location.pathname === to;
              return (
              <Link
                key={to}
                to={to}
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  isActive
                    ? "bg-brand text-white"
                    : "text-muted hover:bg-surface hover:text-ink"
                }`}
              >
                {label}
              </Link>
              );
            })}
            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-md border border-line px-3 py-2 text-sm font-medium text-ink hover:bg-surface"
              >
                Logout
              </button>
            ) : null}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
