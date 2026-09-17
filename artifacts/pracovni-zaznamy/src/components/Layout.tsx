import { useAuth } from "@/lib/auth-context";
import { useLocation, Link } from "wouter";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: "Přehled", href: "/" },
  { label: "Kácení", href: "/kaceni" },
  { label: "Sečení", href: "/seceni" },
  { label: "Uživatelé", href: "/admin/uzivatele", adminOnly: true },
  { label: "Číselníky", href: "/admin/ciselniky", adminOnly: true },
  { label: "Audit log", href: "/admin/audit-log", adminOnly: true },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, isAdmin } = useAuth();
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const filtered = navItems.filter((n) => !n.adminOnly || isAdmin);

  function isActive(href: string) {
    if (href === "/") return location === "/";
    return location === href || location.startsWith(href + "/");
  }

  const linkCls = (href: string) =>
    cn(
      "px-3.5 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap border",
      isActive(href)
        ? "bg-white text-slate-950 border-white shadow-sm"
        : "text-white/72 border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20",
    );

  return (
    <div className="min-h-screen zenops-shell zenops-grid flex flex-col relative overflow-hidden">
      <div className="zenops-orb zenops-orb-cyan h-72 w-72 -top-14 -left-14 opacity-80" />
      <div className="zenops-orb zenops-orb-ice h-80 w-80 top-20 right-[-5rem] opacity-70" />
      <div className="zenops-orb zenops-orb-navy h-72 w-72 bottom-0 left-1/3 opacity-40" />

      <header className="sticky top-0 z-40 px-3 pt-3 md:px-5 md:pt-5">
        <div className="zenops-app-width mx-auto h-16 rounded-[1.6rem] border border-white/65 bg-[linear-gradient(135deg,rgba(15,39,58,0.94),rgba(17,70,98,0.84))] shadow-[0_18px_50px_rgba(7,24,38,0.24)] px-4 md:px-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 shrink-0 group">
            <div
              className="w-9 h-9 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]"
              style={{ background: "linear-gradient(135deg, hsl(197 100% 52%), hsl(192 85% 39%))" }}
            >
              Z
            </div>
            <div className="leading-none">
              <span className="font-display font-bold text-white text-lg tracking-tight block">Zenops</span>
              <span className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/70">field operations</span>
            </div>
          </Link>

          <div className="hidden lg:flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-2 text-[11px] uppercase tracking-[0.2em] text-white/60">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(74,222,128,0.9)]" />
            provoz aktivní
          </div>

          <button
            className="md:hidden p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30 transition-colors"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          <nav className="hidden md:flex items-center gap-1.5">
            {filtered.map((n) => (
              <Link key={n.href} href={n.href} className={linkCls(n.href)}>
                {n.label}
              </Link>
            ))}
            <div className="ml-3 pl-3 border-l border-white/12 flex items-center gap-2">
              <div className="text-right leading-tight">
                <span className="text-[11px] uppercase tracking-[0.18em] text-white/40 block">uživatel</span>
                <span className="text-white/80 text-xs font-medium">{user?.fullName}</span>
              </div>
              <button
                onClick={logout}
                className="px-3.5 py-2 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 text-white/85 hover:text-white transition-colors border border-white/10"
              >
                Odhlásit
              </button>
            </div>
          </nav>
        </div>

        {menuOpen && (
          <div className="zenops-app-width mx-auto mt-3 md:hidden">
            <div className="rounded-[1.4rem] border border-white/70 zenops-glass zenops-panel overflow-hidden">
              <div className="p-3 space-y-1.5">
                {filtered.map((n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "block px-4 py-3 rounded-2xl text-sm font-medium transition-colors",
                      isActive(n.href) ? "bg-slate-900 text-white shadow-sm" : "text-slate-700 hover:bg-white/70",
                    )}
                  >
                    {n.label}
                  </Link>
                ))}
                <div className="pt-3 mt-2 border-t border-slate-200/80 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="block text-[11px] uppercase tracking-[0.18em] text-slate-400">uživatel</span>
                    <span className="block text-sm font-medium text-slate-700 truncate">{user?.fullName}</span>
                  </div>
                  <button
                    onClick={logout}
                    className="px-3.5 py-2 rounded-full text-sm font-medium bg-slate-900 hover:bg-slate-800 text-white transition-colors"
                  >
                    Odhlásit
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 zenops-app-width mx-auto w-full px-4 pt-6 pb-8 md:px-5 md:pt-8 relative">
        <div className="absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.7),transparent_70%)]" />
        {children}
      </main>

      <footer className="px-4 pb-4 md:px-5 md:pb-5">
        <div className="zenops-app-width mx-auto rounded-[1.35rem] border border-white/60 zenops-glass zenops-panel px-4 py-3 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500">Zenops • pracovní záznamy a provozní evidence</span>
          <span className="text-xs text-slate-500">
            by <span className="font-semibold" style={{ color: "hsl(197 100% 38%)" }}>Zentinel.cz</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
