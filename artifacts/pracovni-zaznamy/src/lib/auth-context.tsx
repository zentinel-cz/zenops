import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useGetMe, useLogin, useLogout } from "@workspace/api-client-react";
import { useLocation } from "wouter";

interface AuthUser {
  id: number;
  username: string;
  fullName: string;
  role: "admin" | "user";
  isActive: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [, navigate] = useLocation();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const { data: meData, isLoading: meLoading, error: meError } = useGetMe();

  useEffect(() => {
    if (!meLoading) {
      if (meData) {
        setUser(meData as AuthUser);
      } else {
        setUser(null);
      }
      setIsInitialized(true);
    }
  }, [meData, meLoading, meError]);

  const loginMutation = useLogin();
  const logoutMutation = useLogout();

  const login = async (username: string, password: string) => {
    const result = await loginMutation.mutateAsync({ data: { username, password } });
    setUser(result.user as AuthUser);
    navigate("/");
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
    setUser(null);
    navigate("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: !isInitialized,
        login,
        logout,
        isAdmin: user?.role === "admin",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
