import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ROLE_LABEL } from "../../services/authService";

const navByRole = {
  admin: [
    { to: "/", label: "Dashboard", icon: HomeIcon },
    { to: "/documentos", label: "Documentos", icon: ReceiptIcon },
    { to: "/usuarios", label: "Usuarios", icon: UsersIcon },
    { to: "/productos", label: "Productos", icon: BoxIcon },
    { to: "/perfil", label: "Mi perfil", icon: UserIcon },
  ],
  supervisor: [
    { to: "/", label: "Dashboard", icon: HomeIcon },
    { to: "/documentos", label: "Documentos", icon: ReceiptIcon },
    { to: "/perfil", label: "Mi perfil", icon: UserIcon },
  ],
  vendedor: [
    { to: "/", label: "Dashboard", icon: HomeIcon },
    { to: "/panel", label: "Generador Tekbo", icon: ReceiptIcon },
    { to: "/perfil", label: "Mi perfil", icon: UserIcon },
  ],
};

export default function MainLayout({ children, title, subtitle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const navItems = navByRole[user?.role] || navByRole.vendedor;

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
      navigate("/login", { replace: true });
    } finally {
      setLoggingOut(false);
    }
  };

  const initials = (user?.first_name?.[0] || "") + (user?.last_name?.[0] || "") || (user?.username?.[0] || "U");

  return (
    <div className="app-bg flex min-h-screen print-layout-root">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex print:hidden">
        <BrandHeader />
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                [
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                  isActive
                    ? "bg-brand-50 text-brand-800"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                ].join(" ")
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Sidebar (mobile drawer) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between">
              <BrandHeader />
              <button
                onClick={() => setMobileOpen(false)}
                className="mr-3 rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Cerrar menu"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 px-3 py-4" onClick={() => setMobileOpen(false)}>
              {navItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  className={({ isActive }) =>
                    [
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                      isActive
                        ? "bg-brand-50 text-brand-800"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                    ].join(" ")
                  }
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </NavLink>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur md:px-8 print:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden"
            aria-label="Abrir menu"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            {title ? (
              <h1 className="font-display truncate text-lg font-bold text-slate-900 sm:text-xl">
                {title}
              </h1>
            ) : null}
            {subtitle ? (
              <p className="truncate text-xs text-slate-500 sm:text-sm">{subtitle}</p>
            ) : null}
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-800">
                {user?.first_name || user?.last_name
                  ? `${user?.first_name || ""} ${user?.last_name || ""}`.trim()
                  : user?.username}
              </p>
              <p className="text-xs text-slate-500">
                {ROLE_LABEL[user?.role] || user?.role}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-800 text-sm font-bold text-white">
              {initials.toUpperCase()}
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-rose-50 hover:text-rose-700 disabled:cursor-wait disabled:opacity-60"
            title="Cerrar sesión"
          >
            <LogoutIcon className="h-4 w-4" />
            <span className="hidden sm:inline">{loggingOut ? "Saliendo…" : "Salir"}</span>
          </button>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8 print:px-0 print:py-0">{children}</main>
      </div>
    </div>
  );
}

function BrandHeader() {
  return (
    <Link to="/" className="flex items-center gap-2 px-5 py-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-800 text-white">
        <ShieldIcon className="h-5 w-5" />
      </div>
      <div>
        <p className="font-display text-base font-bold text-slate-900">Tekbo</p>
        <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Sistema</p>
      </div>
    </Link>
  );
}

/* Icons */
function HomeIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M3 10.5L12 3l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function UsersIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M17 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="7" r="3" />
      <path d="M21 20v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function UserIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ShieldIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M12 3l7 4v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7l7-4z" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function MenuIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
    </svg>
  );
}
function CloseIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}
function LogoutIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ReceiptIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path
        d="M5 2v20l2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1z"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path d="M8 7h8M8 11h8M8 15h5" strokeLinecap="round" />
    </svg>
  );
}

function BoxIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path
        d="M21 8l-9-5-9 5 9 5 9-5z"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path d="M3 8v8l9 5 9-5V8" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M12 13v8" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
