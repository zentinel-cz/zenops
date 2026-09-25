import { type FormEvent, useEffect, useState } from "react";
import type { ProjectSummary, SessionUser } from "@zenops/contracts";
import { EmployeePanel } from "./EmployeePanel";
import { WorkDayPanel } from "./WorkDayPanel";
import { ProjectDayPanel } from "./ProjectDayPanel";
import { AssetPanel } from "./AssetPanel";

type AuthState = { status: "loading" } | { status: "guest" } | { status: "authenticated"; user: SessionUser };

async function getCurrentUser(): Promise<SessionUser | null> {
  const response = await fetch("/api/auth/me", { credentials: "include" });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error("Služba je dočasně nedostupná.");
  return (await response.json() as { user: SessionUser }).user;
}

function Dashboard({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [leaders, setLeaders] = useState<Array<{ id: string; displayName: string }>>([]);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projectError, setProjectError] = useState("");
  const [assetVersion, setAssetVersion] = useState(0);
  const canCreateProject = user.permissions.includes("project.create");
  const canManageProjects = user.permissions.includes("project.close");
  const canManageEmployees = user.permissions.includes("employee.manage");
  const canManageAssets = user.permissions.includes("asset.manage");

  const loadProjects = () => fetch(canManageProjects ? "/api/projects" : "/api/projects/open", { credentials: "include" })
    .then(async (response) => response.ok ? response.json() as Promise<{ projects: ProjectSummary[] }> : Promise.reject())
    .then((body) => setProjects(body.projects));

  useEffect(() => {
    void loadProjects()
      .catch(() => setProjectError("Projekty se nepodařilo načíst."))
      .finally(() => setLoadingProjects(false));
    if (canCreateProject) {
      void fetch("/api/employees/leaders", { credentials: "include" })
        .then(async (response) => response.ok ? response.json() as Promise<{ leaders: Array<{ id: string; displayName: string }> }> : Promise.reject())
        .then((body) => setLeaders(body.leaders))
        .catch(() => setProjectError("Seznam vedoucích se nepodařilo načíst."));
    }
  }, []);

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProjectError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await fetch("/api/projects", {
      method: "POST", credentials: "include", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        code: data.get("code"), name: data.get("name"), location: data.get("location"),
        leaderEmployeeId: data.get("leaderEmployeeId"), startDate: data.get("startDate"),
        besip: data.get("besip") === "on",
      }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: "Projekt se nepodařilo vytvořit." })) as { error?: string };
      setProjectError(body.error ?? "Projekt se nepodařilo vytvořit.");
      return;
    }
    form.reset();
    setShowProjectForm(false);
    await loadProjects();
  }

  async function changeProjectState(project: ProjectSummary) {
    setProjectError("");
    const response = await fetch(`/api/projects/${project.id}/state`, {
      method: "PATCH", credentials: "include", headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: project.status === "OPEN" ? "CLOSED" : "OPEN" }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: "Stav projektu se nepodařilo změnit." })) as { error?: string };
      setProjectError(body.error ?? "Stav projektu se nepodařilo změnit.");
      return;
    }
    await loadProjects();
  }

  return (
    <main className="dashboard">
      <header className="topbar">
        <div><span className="eyebrow">ZENTINEL</span><h1>ZenOps</h1></div>
        <div className="account"><div className="user-chip"><span>{user.displayName}</span><small>{user.roles.join(" · ")}</small></div><button className="ghost" onClick={onLogout}>Odhlásit</button></div>
      </header>
      <section className="welcome">
        <p className="eyebrow">PROVOZ DNEŠNÍHO DNE</p>
        <h2>Dobré ráno, {user.displayName.split(" ")[0]}</h2>
        <p>Vaše práce, projekty a schvalování na jednom místě.</p>
      </section>
      <section className="module-grid" aria-label="Moduly">
        <article><span>01</span><h3>Moje práce</h3><p>Směny, pracovní úseky a přestávky.</p><b>AKTIVNÍ MODUL</b></article>
        <article className="projects-card"><span>02 · {loadingProjects ? "…" : projects.length}</span><h3>{canManageProjects ? "Projekty" : "Otevřené projekty"}</h3>{projects.length ? <ul>{projects.slice(0, 5).map((project) => <li className={project.status === "CLOSED" ? "closed" : ""} key={project.id}><strong>{project.code}</strong><span>{project.name} · {project.location}</span>{canManageProjects && <button className="project-state" onClick={() => void changeProjectState(project)}>{project.status === "OPEN" ? "Uzavřít" : "Otevřít"}</button>}</li>)}</ul> : <p>{loadingProjects ? "Načítám projekty…" : "Zatím nejsou žádné projekty."}</p>}{canCreateProject && <button className="inline-action" onClick={() => setShowProjectForm((visible) => !visible)}>{showProjectForm ? "Zavřít formulář" : "Nový projekt"}</button>}<b>AKTIVNÍ MODUL</b></article>
        <article><span>03</span><h3>Schvalování</h3><p>Kontrola práce podle vedoucích projektů.</p><b>PŘIPRAVUJEME</b></article>
      </section>
      {showProjectForm && <section className="project-form-panel"><form onSubmit={createProject}><div><p className="eyebrow">NOVÝ PROJEKT</p><h3>Založit projekt</h3></div><label>Kód<input name="code" maxLength={40} required /></label><label>Název<input name="name" maxLength={160} required /></label><label>Místo<input name="location" maxLength={240} required /></label><label>Vedoucí<select name="leaderEmployeeId" required defaultValue=""><option value="" disabled>Vyberte vedoucího</option>{leaders.map((leader) => <option key={leader.id} value={leader.id}>{leader.displayName}</option>)}</select></label><label>Začátek<input name="startDate" type="date" required /></label><label className="checkbox"><input name="besip" type="checkbox" /> BESIP</label>{projectError && <p className="error" role="alert">{projectError}</p>}<button>Vytvořit projekt</button></form></section>}
      {!showProjectForm && projectError && <p className="dashboard-error" role="alert">{projectError}</p>}
      <WorkDayPanel projects={projects} assetVersion={assetVersion} />
      <ProjectDayPanel user={user} projects={projects} />
      {canManageAssets && <AssetPanel onChanged={async () => setAssetVersion((value) => value + 1)} />}
      {canManageEmployees && <EmployeePanel user={user} />}
    </main>
  );
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

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setAuth({ status: "guest" });
  }

  if (auth.status === "loading") {
    return <main className="center"><div className="loader" aria-label="Načítání" /></main>;
  }

  if (auth.status === "authenticated") {
    return <Dashboard user={auth.user} onLogout={() => void logout()} />;
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
