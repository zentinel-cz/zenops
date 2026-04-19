import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
    } catch {
      setError("Neplatné uživatelské jméno nebo heslo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "hsl(215 30% 14%)" }}>
      {/* Top bar */}
      <div className="px-6 py-4 flex items-center gap-2">
        <div className="w-7 h-7 rounded-md flex items-center justify-center text-white font-black text-sm"
          style={{ background: "hsl(197 100% 38%)" }}>
          Z
        </div>
        <span className="font-bold text-white text-base tracking-tight">Zenops</span>
      </div>

      {/* Main area */}
      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-sm">
          {/* Card */}
          <div className="rounded-2xl shadow-2xl overflow-hidden" style={{ background: "hsl(215 28% 18%)" }}>
            {/* Card header */}
            <div className="px-8 pt-8 pb-6 text-center border-b" style={{ borderColor: "hsl(215 20% 24%)" }}>
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
                style={{ background: "hsl(197 100% 38% / 0.15)" }}>
                <svg className="w-7 h-7" style={{ color: "hsl(197 100% 50%)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Zenops</h1>
              <p className="text-sm mt-1" style={{ color: "hsl(210 15% 55%)" }}>Pracovní záznamy</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4" noValidate>
              {error && (
                <div className="rounded-lg px-4 py-3 text-sm border"
                  style={{
                    background: "hsl(4 80% 52% / 0.12)",
                    color: "hsl(4 80% 72%)",
                    borderColor: "hsl(4 80% 52% / 0.30)"
                  }}>
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: "hsl(210 20% 72%)" }} htmlFor="username">
                  Uživatelské jméno
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  className="w-full px-4 py-3 rounded-lg text-white placeholder:text-white/25 focus:outline-none focus:ring-2 transition-all"
                  style={{
                    background: "hsl(215 25% 22%)",
                    border: "1px solid hsl(215 20% 28%)",
                    fontSize: "16px",
                    color: "white",
                  }}
                  onFocus={(e) => e.target.style.borderColor = "hsl(197 100% 38%)"}
                  onBlur={(e) => e.target.style.borderColor = "hsl(215 20% 28%)"}
                  placeholder="Zadejte uživatelské jméno"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: "hsl(210 20% 72%)" }} htmlFor="password">
                  Heslo
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-3 rounded-lg text-white placeholder:text-white/25 focus:outline-none focus:ring-2 transition-all"
                  style={{
                    background: "hsl(215 25% 22%)",
                    border: "1px solid hsl(215 20% 28%)",
                    fontSize: "16px",
                    color: "white",
                  }}
                  onFocus={(e) => e.target.style.borderColor = "hsl(197 100% 38%)"}
                  onBlur={(e) => e.target.style.borderColor = "hsl(215 20% 28%)"}
                  placeholder="Zadejte heslo"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-lg font-semibold text-sm text-white transition-all disabled:opacity-60 mt-2"
                style={{ background: "hsl(197 100% 38%)" }}
              >
                {loading ? "Přihlašování..." : "Přihlásit se →"}
              </button>
            </form>
          </div>

          <p className="text-center text-xs mt-6" style={{ color: "hsl(215 15% 45%)" }}>
            by <a href="https://zentinel.cz" target="_blank" rel="noreferrer"
              style={{ color: "hsl(197 100% 50%)" }} className="hover:underline">Zentinel.cz</a>
          </p>
        </div>
      </div>
    </div>
  );
}
