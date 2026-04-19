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
      "px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
      isActive(href)
        ? "bg-white/15 text-white"
        : "text-white/70 hover:bg-white/10 hover:text-white"
    );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header — dark navy matching Zentinel.cz */}
      <header className="sticky top-0 z-40 shadow-lg" style={{ background: "hsl(215 30% 14%)" }}>
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0 group">
            <div className="w-7 h-7 rounded-md flex items-center justify-center text-white font-black text-sm"
              style={{ background: "hsl(197 100% 38%)" }}>
              Z
            </div>
            <span className="font-bold text-white text-base tracking-tight">
              Zenops
            </span>
          </Link>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-md text-white/70 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30 transition-colors"
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

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {filtered.map((n) => (
              <Link key={n.href} href={n.href} className={linkCls(n.href)}>
                {n.label}
              </Link>
            ))}
            <div className="ml-4 pl-4 border-l border-white/15 flex items-center gap-2">
              <span className="text-white/50 text-xs">{user?.fullName}</span>
              <button
                onClick={logout}
                className="px-3 py-1.5 rounded-md text-xs font-medium bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              >
                Odhlásit
              </button>
            </div>
          </nav>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="md:hidden border-t border-white/10 px-4 pb-4" style={{ background: "hsl(215 30% 11%)" }}>
            <div className="pt-3 space-y-0.5">
              {filtered.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "block px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                    isActive(n.href)
                      ? "bg-white/15 text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {n.label}
                </Link>
              ))}
              <div className="pt-3 mt-2 border-t border-white/10 flex items-center justify-between">
                <span className="text-white/40 text-xs">{user?.fullName}</span>
                <button
                  onClick={logout}
                  className="px-3 py-2 rounded-md text-sm font-medium bg-white/10 hover:bg-white/20 text-white/80 transition-colors"
                >
                  Odhlásit
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Zenops — Pracovní záznamy</span>
          <span className="text-xs text-muted-foreground">by <span className="font-medium" style={{ color: "hsl(197 100% 38%)" }}>Zentinel.cz</span></span>
        </div>
      </footer>
    </div>
  );
}
