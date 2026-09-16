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
    <div className="min-h-screen relative overflow-hidden bg-[linear-gradient(160deg,#081521_0%,#0d2436_42%,#112f46_100%)] text-white">
      <div className="zenops-orb zenops-orb-cyan h-80 w-80 -top-16 -left-10 opacity-90" />
      <div className="zenops-orb zenops-orb-ice h-96 w-96 top-1/2 -translate-y-1/2 right-[-6rem] opacity-70" />
      <div className="zenops-orb zenops-orb-navy h-96 w-96 bottom-[-7rem] left-1/3 opacity-80" />

      <div className="relative z-10 min-h-screen px-4 py-6 md:px-8 md:py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-[1.1rem] flex items-center justify-center text-white font-black text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
              style={{ background: "linear-gradient(135deg, hsl(197 100% 52%), hsl(192 85% 39%))" }}
            >
              Z
            </div>
            <div>
              <span className="font-display font-bold text-white text-xl tracking-tight block">Zenops</span>
              <span className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/70">field operations</span>
            </div>
          </div>

          <div className="grid gap-8 items-center pt-8 md:pt-14 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/7 px-3 py-2 text-[11px] uppercase tracking-[0.22em] text-cyan-100/80">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(74,222,128,0.9)]" />
                provozní přehled
              </div>
              <h1 className="font-display mt-5 text-4xl leading-none sm:text-5xl">
                Evidence práce,
                <span className="block text-cyan-300">která nepůsobí jako tabulka z roku 2012.</span>
              </h1>
              <p className="mt-5 max-w-lg text-sm leading-6 text-slate-300 sm:text-base">
                Zenops sjednocuje kácení, sečení, pracovníky, stroje i audit do jednoho čistého provozního rozhraní.
                Přihlaste se a pokračujte tam, kde jste skončili.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[
                  ["Záznamy", "Kácení i sečení v jednom toku"],
                  ["Přehled", "Rychlý stav práce a aktivit"],
                  ["Kontrola", "Audit a admin bez chaosu"],
                ].map(([title, desc]) => (
                  <div key={title} className="rounded-[1.4rem] border border-white/10 bg-white/6 px-4 py-4 shadow-[0_20px_40px_rgba(0,0,0,0.14)]">
                    <p className="font-display text-base text-white">{title}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-300">{desc}</p>
                  </div>
                ))}
              </div>
            </section>

            <div className="w-full max-w-md lg:justify-self-end">
              <div className="rounded-[2rem] border border-white/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.08))] shadow-[0_30px_90px_rgba(0,0,0,0.28)] backdrop-blur-xl overflow-hidden">
                <div className="px-8 pt-8 pb-6 border-b border-white/10">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-[1.35rem] mb-4 bg-cyan-400/12 ring-1 ring-cyan-300/20">
                    <svg className="w-7 h-7 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h2 className="font-display text-3xl tracking-tight text-white">Přihlášení</h2>
                  <p className="text-sm mt-2 text-slate-300">Vstup do provozní zóny Zenops</p>
                </div>

                <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4" noValidate>
                  {error && (
                    <div
                      className="rounded-2xl px-4 py-3 text-sm border"
                      style={{
                        background: "hsl(4 80% 52% / 0.12)",
                        color: "hsl(4 80% 72%)",
                        borderColor: "hsl(4 80% 52% / 0.30)",
                      }}
                    >
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-200" htmlFor="username">
                      Uživatelské jméno
                    </label>
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      autoComplete="username"
                      className="w-full px-4 py-3 rounded-2xl text-white placeholder:text-white/25 focus:outline-none focus:ring-2 transition-all border border-white/10 bg-white/8"
                      style={{
                        fontSize: "16px",
                        color: "white",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "hsl(197 100% 45%)")}
                      onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                      placeholder="Zadejte uživatelské jméno"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-200" htmlFor="password">
                      Heslo
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="w-full px-4 py-3 rounded-2xl text-white placeholder:text-white/25 focus:outline-none focus:ring-2 transition-all border border-white/10 bg-white/8"
                      style={{
                        fontSize: "16px",
                        color: "white",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "hsl(197 100% 45%)")}
                      onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                      placeholder="Zadejte heslo"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-4 rounded-2xl font-semibold text-sm text-white transition-all disabled:opacity-60 mt-2 shadow-[0_18px_40px_rgba(0,153,204,0.35)] hover:translate-y-[-1px]"
                    style={{ background: "linear-gradient(135deg, hsl(197 100% 48%), hsl(190 86% 37%))" }}
                  >
                    {loading ? "Přihlašování..." : "Přihlásit se →"}
                  </button>
                </form>
              </div>
            </div>
          </div>

          <p className="text-center text-xs mt-8 text-slate-400">
            by{" "}
            <a href="https://zentinel.cz" target="_blank" rel="noreferrer" className="text-cyan-300 hover:underline">
              Zentinel.cz
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
