import { useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext.jsx";

const links = [
  ["Панель", "/dashboard"],
  ["Речі", "/items"],
  ["Додати річ", "/items/new"],
  ["Запити на обмін", "/exchange-requests"],
  ["Профіль", "/profile"],
];

const publicLinks = [
  ["Речі", "/items"],
  ["Увійти", "/login"],
  ["Реєстрація", "/register"],
];

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loadUser, logout, user } = useAuth();

  useEffect(() => {
    if (isAuthenticated && !user) {
      loadUser().catch(() => logout());
    }
  }, [isAuthenticated, user]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-lg font-bold tracking-tight text-gray-900">Smart Item Exchange</p>
            <p className="text-sm text-muted">Обмінюйтеся розумніше з AI-підбором</p>
          </div>
          <nav className="flex flex-wrap items-center gap-1.5">
            {(isAuthenticated
              ? user?.role === "admin"
                ? [...links, ["Адмін", "/admin"]]
                : links
              : publicLinks
            ).map(([label, to]) => {
              const isActive = location.pathname === to;
              return (
              <Link
                key={to}
                to={to}
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "bg-brand text-white shadow-sm"
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
                className="rounded-xl border border-line px-3 py-2 text-sm font-semibold text-ink shadow-sm hover:bg-surface"
              >
                Вийти
              </button>
            ) : null}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
