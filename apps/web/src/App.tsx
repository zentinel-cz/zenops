import { type FormEvent, useEffect, useState } from "react";
import type { SessionUser } from "@zenops/contracts";

type AuthState = { status: "loading" } | { status: "guest" } | { status: "authenticated"; user: SessionUser };

async function getCurrentUser(): Promise<SessionUser | null> {
  const response = await fetch("/api/auth/me", { credentials: "include" });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error("Služba je dočasně nedostupná.");
  return (await response.json() as { user: SessionUser }).user;
}

export function App() {
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void getCurrentUser()
      .then((user) => setAuth(user ? { status: "authenticated", user } : { status: "guest" }))
      .catch(() => setAuth({ status: "guest" }));
  }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: data.get("email"), password: data.get("password") }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: "Přihlášení se nezdařilo." })) as { error?: string };
      setError(body.error ?? "Přihlášení se nezdařilo.");
      setSubmitting(false);
      return;
    }
    const user = await getCurrentUser();
    setSubmitting(false);
    setAuth(user ? { status: "authenticated", user } : { status: "guest" });
  }

  if (auth.status === "loading") {
    return <main className="center"><div className="loader" aria-label="Načítání" /></main>;
  }

  if (auth.status === "authenticated") {
    return (
      <main className="dashboard">
        <header className="topbar">
          <div><span className="eyebrow">ZENTINEL</span><h1>ZenOps</h1></div>
          <div className="user-chip"><span>{auth.user.displayName}</span><small>{auth.user.roles.join(" · ")}</small></div>
        </header>
        <section className="welcome">
          <p className="eyebrow">PROVOZ DNEŠNÍHO DNE</p>
          <h2>Dobré ráno, {auth.user.displayName.split(" ")[0]}</h2>
          <p>První provozní moduly budou zpřístupněny v dalších milnících.</p>
        </section>
        <section className="module-grid" aria-label="Moduly">
          <article><span>01</span><h3>Moje práce</h3><p>Směny, pracovní úseky a přestávky.</p><b>Připravujeme</b></article>
          <article><span>02</span><h3>Projekty</h3><p>Aktivní zakázky a denní kontext.</p><b>Připravujeme</b></article>
          <article><span>03</span><h3>Schvalování</h3><p>Kontrola práce podle vedoucích projektů.</p><b>Připravujeme</b></article>
        </section>
      </main>
    );
  }

  return (
    <main className="login-layout">
      <section className="brand-panel">
        <div className="brand"><span className="brand-mark">Z</span><span>ZENTINEL</span></div>
        <div className="brand-message"><p className="eyebrow">OPERATIONS, IN FOCUS.</p><h1>ZenOps</h1><p>Práce v terénu. Přesná data. Jeden společný provozní obraz.</p></div>
        <p className="copyright">© {new Date().getFullYear()} Zentinel.cz</p>
      </section>
      <section className="form-panel">
        <form onSubmit={login}>
          <p className="eyebrow">VÍTEJTE ZPĚT</p>
          <h2>Přihlášení</h2>
          <p className="muted">Použijte svůj firemní účet ZenOps.</p>
          <label>E-mail<input name="email" type="email" autoComplete="username" required /></label>
          <label>Heslo<input name="password" type="password" autoComplete="current-password" minLength={12} required /></label>
          {error && <p className="error" role="alert">{error}</p>}
          <button disabled={submitting}>{submitting ? "Ověřuji…" : "Přihlásit se"}</button>
          <small className="support">Potřebujete přístup? Kontaktujte správce systému.</small>
        </form>
      </section>
    </main>
  );
}
