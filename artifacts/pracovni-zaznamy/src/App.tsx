import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";

import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import FellingListPage from "@/pages/FellingListPage";
import FellingFormPage from "@/pages/FellingFormPage";
import FellingDetailPage from "@/pages/FellingDetailPage";
import MowingListPage from "@/pages/MowingListPage";
import MowingFormPage from "@/pages/MowingFormPage";
import MowingDetailPage from "@/pages/MowingDetailPage";
import AdminUsersPage from "@/pages/AdminUsersPage";
import AdminCodebooksPage from "@/pages/AdminCodebooksPage";
import AdminAuditLogPage from "@/pages/AdminAuditLogPage";
import NotFound from "@/pages/not-found";
import FutureRolePage from "@/pages/FutureRolePage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: false,
    },
  },
});

function AppRoutes() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">Načítám...</div>
      </div>
    );
  }

  if (!user && location !== "/login") {
    return <LoginPage />;
  }

  if (location === "/login") {
    return <LoginPage />;
  }

  if (user && (user.role === "employee" || user.role === "manager")) {
    return <FutureRolePage />;
  }

  return (
    <Layout>
      <Switch>
        <Route path="/">
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        </Route>
        <Route path="/kaceni">
          <ProtectedRoute>
            <FellingListPage />
          </ProtectedRoute>
        </Route>
        <Route path="/kaceni/novy">
          <ProtectedRoute>
            <FellingFormPage />
          </ProtectedRoute>
        </Route>
        <Route path="/kaceni/:id">
          <ProtectedRoute>
            <FellingDetailPage />
          </ProtectedRoute>
        </Route>
        <Route path="/seceni">
          <ProtectedRoute>
            <MowingListPage />
          </ProtectedRoute>
        </Route>
        <Route path="/seceni/novy">
          <ProtectedRoute>
            <MowingFormPage />
          </ProtectedRoute>
        </Route>
        <Route path="/seceni/:id">
          <ProtectedRoute>
            <MowingDetailPage />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/uzivatele">
          <ProtectedRoute adminOnly>
            <AdminUsersPage />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/ciselniky">
          <ProtectedRoute adminOnly>
            <AdminCodebooksPage />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/audit-log">
          <ProtectedRoute adminOnly>
            <AdminAuditLogPage />
          </ProtectedRoute>
        </Route>
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
