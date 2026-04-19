import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";

export function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, isLoading, isAdmin } = useAuth();
  const [, navigate] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Načítám...</div>
      </div>
    );
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  if (adminOnly && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">Přístup odepřen</p>
          <p className="text-sm text-muted-foreground mt-1">Tato sekce je pouze pro administrátory.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
