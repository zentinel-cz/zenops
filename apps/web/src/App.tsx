import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import type { ProjectSummary, SessionUser } from "@zenops/contracts";
import { EmployeePanel } from "./EmployeePanel";
import { WorkDayPanel } from "./WorkDayPanel";
import { ProjectDayPanel } from "./ProjectDayPanel";
import { AssetPanel } from "./AssetPanel";
import { ApprovalPanel } from "./ApprovalPanel";
import { ReportPanel } from "./ReportPanel";
import { MonthlyPanel } from "./MonthlyPanel";
import { AccountPanel } from "./AccountPanel";
import { AdminRecordsPanel } from "./AdminRecordsPanel";

type AuthState =
  | { status: "loading" }
  | { status: "guest" }
  | { status: "authenticated"; user: SessionUser };

type NavIconName =
  | "overview"
  | "projects"
  | "calendar"
  | "approval"
  | "report"
  | "records"
  | "assets"
  | "people";

function NavIcon({ name }: { name: NavIconName }) {
  const paths: Record<NavIconName, ReactNode> = {
    overview: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    projects: (
      <>
        <path d="M3 7h7l2 2h9v10H3z" />
        <path d="M3 7V5h7l2 2" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M8 3v4M16 3v4M3 10h18" />
      </>
    ),
    approval: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    report: (
      <>
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </>
    ),
    records: (
      <>
        <path d="M6 3h12v18H6z" />
        <path d="M9 8h6M9 12h6M9 16h4" />
      </>
    ),
    assets: (
      <>
        <path d="m14 7 3-3 3 3-3 3M4 17l3-3 3 3-3 3" />
        <path d="M9 15 15 9" />
      </>
    ),
    people: (
      <>
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="9" r="2" />
        <path d="M3 20c0-4 2-7 6-7s6 3 6 7M15 14c3 0 5 2 5 5" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

async function getCurrentUser(): Promise<SessionUser | null> {
  const response = await fetch("/api/auth/me", { credentials: "include" });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error("Služba je dočasně nedostupná.");
  return ((await response.json()) as { user: SessionUser }).user;
}

function Dashboard({
  user,
  onLogout,
}: {
  user: SessionUser;
  onLogout: () => void;
}) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [leaders, setLeaders] = useState<
    Array<{ id: string; displayName: string }>
  >([]);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectSummary | null>(
    null,
  );
  const [projectError, setProjectError] = useState("");
  const [assetVersion, setAssetVersion] = useState(0);
  const [showDailyRecord, setShowDailyRecord] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const canCreateProject = user.permissions.includes("project.create");
  const canManageProjects = user.permissions.includes("project.close");
  const canManageEmployees = user.permissions.includes("employee.manage");
  const canManageAssets = user.permissions.includes("asset.manage");
  const canApprove =
    user.permissions.includes("approval.project.manage") ||
    user.permissions.includes("approval.admin.manage");
  const canReport =
    user.permissions.includes("report.scoped.read") ||
    user.permissions.includes("report.global.read");
  const isWorkerOnly =
    user.roles.includes("WORKER") &&
    !user.roles.includes("LEADER") &&
    !user.roles.includes("ADMIN");
  const isAdmin = user.roles.includes("ADMIN");

  const loadProjects = () =>
    fetch(canManageProjects ? "/api/projects" : "/api/projects/open", {
      credentials: "include",
    })
      .then(async (response) =>
        response.ok
          ? (response.json() as Promise<{ projects: ProjectSummary[] }>)
          : Promise.reject(),
      )
      .then((body) => setProjects(body.projects));

  useEffect(() => {
    void loadProjects()
      .catch(() => setProjectError("Zakázky se nepodařilo načíst."))
      .finally(() => setLoadingProjects(false));
    if (canCreateProject) {
      void fetch("/api/employees/leaders", { credentials: "include" })
        .then(async (response) =>
          response.ok
            ? (response.json() as Promise<{
                leaders: Array<{ id: string; displayName: string }>;
              }>)
            : Promise.reject(),
        )
        .then((body) => setLeaders(body.leaders))
        .catch(() => setProjectError("Seznam vedoucích se nepodařilo načíst."));
    }
  }, []);

  useEffect(() => {
    if (!user.roles.includes("ADMIN")) return;
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".admin-section-anchor, .admin-overview",
      ),
    );
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActiveSection(visible.target.id);
      },
      { rootMargin: "-90px 0px -65%", threshold: [0, 0.15, 0.4] },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [user.roles]);

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProjectError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await fetch("/api/projects", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        code: data.get("code"),
        name: data.get("name"),
        location: data.get("location"),
        leaderEmployeeId: data.get("leaderEmployeeId"),
        startDate: data.get("startDate"),
        besip: data.get("besip") === "on",
      }),
    });
    if (!response.ok) {
      const body = (await response
        .json()
        .catch(() => ({ error: "Zakázku se nepodařilo vytvořit." }))) as {
        error?: string;
      };
      setProjectError(body.error ?? "Zakázku se nepodařilo vytvořit.");
      return;
    }
    form.reset();
    setShowProjectForm(false);
    await loadProjects();
  }

  async function changeProjectState(project: ProjectSummary) {
    setProjectError("");
    const response = await fetch(`/api/projects/${project.id}/state`, {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        status: project.status === "OPEN" ? "CLOSED" : "OPEN",
      }),
    });
    if (!response.ok) {
      const body = (await response
        .json()
        .catch(() => ({ error: "Stav zakázky se nepodařilo změnit." }))) as {
        error?: string;
      };
      setProjectError(body.error ?? "Stav zakázky se nepodařilo změnit.");
      return;
    }
    await loadProjects();
  }

  async function updateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingProject) return;
    setProjectError("");
    const data = new FormData(event.currentTarget);
    const response = await fetch(`/api/projects/${editingProject.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        code: data.get("code"),
        name: data.get("name"),
        location: data.get("location"),
        startDate: data.get("startDate"),
        endDate: data.get("endDate") || null,
        note: data.get("note") || null,
        besip: data.get("besip") === "on",
        reason: data.get("reason"),
      }),
    });
    if (!response.ok) {
      const body = (await response
        .json()
        .catch(() => ({ error: "Zakázku se nepodařilo upravit." }))) as {
        error?: string;
      };
      setProjectError(body.error ?? "Zakázku se nepodařilo upravit.");
      return;
    }
    setEditingProject(null);
    await loadProjects();
  }

  const projectOverview = (
    <section className="module-grid" aria-label="Moduly">
      <article className="projects-card">
        <span>01 · {loadingProjects ? "…" : projects.length}</span>
        <h3>{canManageProjects ? "Zakázky" : "Otevřené zakázky"}</h3>
        {projects.length ? (
          <ul>
            {projects.slice(0, 5).map((project) => (
              <li
                className={project.status === "CLOSED" ? "closed" : ""}
                key={project.id}
              >
                <strong>{project.code}</strong>
                <span>
                  {project.name} · {project.location}
                </span>
                {canManageProjects && (
                  <span className="row-actions">
                    <button
                      className="project-state"
                      onClick={() => setEditingProject(project)}
                    >
                      Upravit
                    </button>
                    <button
                      className="project-state"
                      onClick={() => void changeProjectState(project)}
                    >
                      {project.status === "OPEN" ? "Uzavřít" : "Otevřít"}
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p>
            {loadingProjects
              ? "Načítám zakázky…"
              : "Zatím nejsou žádné zakázky."}
          </p>
        )}
        {canCreateProject && (
          <button
            className="inline-action"
            onClick={() => setShowProjectForm((visible) => !visible)}
          >
            {showProjectForm ? "Zavřít formulář" : "Nová zakázka"}
          </button>
        )}
        <b>PROVOZNÍ PŘEHLED</b>
      </article>
      <article>
        <span>02</span>
        <h3>Technika</h3>
        <p>Stroje, příslušenství a vozidla v jednom přehledu.</p>
        <b>SPRÁVA PROSTŘEDKŮ</b>
      </article>
      <article>
        <span>03</span>
        <h3>Schvalování</h3>
        <p>Kontrola práce podle vedoucích zakázek.</p>
        <b>PRACOVNÍ TOK</b>
      </article>
    </section>
  );

  const projectForms = (
    <>
      {showProjectForm && (
        <section className="project-form-panel">
          <form onSubmit={createProject}>
            <div>
              <p className="eyebrow">NOVÁ ZAKÁZKA</p>
              <h3>Založit zakázku</h3>
            </div>
            <label>
              Kód
              <input name="code" maxLength={40} required />
            </label>
            <label>
              Název
              <input name="name" maxLength={160} required />
            </label>
            <label>
              Místo
              <input name="location" maxLength={240} required />
            </label>
            <label>
              Vedoucí
              <select name="leaderEmployeeId" required defaultValue="">
                <option value="" disabled>
                  Vyberte vedoucího
                </option>
                {leaders.map((leader) => (
                  <option key={leader.id} value={leader.id}>
                    {leader.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Začátek
              <input name="startDate" type="date" required />
            </label>
            <label className="checkbox">
              <input name="besip" type="checkbox" /> BESIP
            </label>
            {projectError && (
              <p className="error" role="alert">
                {projectError}
              </p>
            )}
            <button>Vytvořit zakázku</button>
          </form>
        </section>
      )}
      {editingProject && (
        <form className="admin-entry-form" onSubmit={updateProject}>
          <div>
            <strong>Upravit zakázku</strong>
            <button
              type="button"
              className="close-button"
              onClick={() => setEditingProject(null)}
            >
              ×
            </button>
          </div>
          <label>
            Kód
            <input
              name="code"
              defaultValue={editingProject.code}
              maxLength={40}
              required
            />
          </label>
          <label>
            Název
            <input
              name="name"
              defaultValue={editingProject.name}
              maxLength={160}
              required
            />
          </label>
          <label>
            Místo
            <input
              name="location"
              defaultValue={editingProject.location}
              maxLength={240}
              required
            />
          </label>
          <label>
            Vedoucí
            <input value={editingProject.leaderName} disabled />
          </label>
          <small>Vedoucí je pevně určen při založení zakázky.</small>
          <label>
            Začátek
            <input
              name="startDate"
              type="date"
              defaultValue={editingProject.startDate.slice(0, 10)}
              required
            />
          </label>
          <label>
            Konec
            <input
              name="endDate"
              type="date"
              defaultValue={editingProject.endDate?.slice(0, 10) ?? ""}
            />
          </label>
          <label>
            Poznámka
            <textarea
              name="note"
              defaultValue={editingProject.note ?? ""}
              maxLength={2000}
            />
          </label>
          <label className="checkbox">
            <input
              name="besip"
              type="checkbox"
              defaultChecked={editingProject.besip}
            />{" "}
            BESIP
          </label>
          <label>
            Důvod změny
            <input name="reason" minLength={3} maxLength={500} required />
          </label>
          {projectError && <p className="error">{projectError}</p>}
          <button>Uložit auditovanou změnu</button>
        </form>
      )}
      {!showProjectForm && projectError && (
        <p className="dashboard-error" role="alert">
          {projectError}
        </p>
      )}
    </>
  );

  if (isAdmin) {
    const openProjects = projects.filter(
      (project) => project.status === "OPEN",
    ).length;
    const closedProjects = projects.filter(
      (project) => project.status === "CLOSED",
    ).length;
    const navItems: Array<{ href: string; label: string; icon: NavIconName }> =
      [
        { href: "#overview", label: "Přehled", icon: "overview" },
        { href: "#projects", label: "Zakázky", icon: "projects" },
        { href: "#project-day", label: "Denní provoz", icon: "calendar" },
        { href: "#approvals", label: "Schvalování", icon: "approval" },
        { href: "#daily-report", label: "Denní report", icon: "report" },
        { href: "#monthly-report", label: "Měsíční přehled", icon: "report" },
        { href: "#records", label: "Opravy záznamů", icon: "records" },
        { href: "#assets", label: "Technika", icon: "assets" },
        { href: "#employees", label: "Zaměstnanci", icon: "people" },
      ];
    return (
      <main className="admin-shell">
        <aside className="admin-sidebar">
          <div className="sidebar-brand">
            <span className="brand-mark">Z</span>
            <div>
              <strong>ZENOPS</strong>
              <small>OPERATIONS CONTROL</small>
            </div>
          </div>
          <nav aria-label="Hlavní navigace">
            {navItems.map((item) => (
              <a
                className={activeSection === item.href.slice(1) ? "active" : ""}
                href={item.href}
                key={item.href}
                title={item.label}
                aria-current={
                  activeSection === item.href.slice(1) ? "page" : undefined
                }
              >
                <NavIcon name={item.icon} />
                <span>{item.label}</span>
              </a>
            ))}
          </nav>
          <div className="sidebar-status">
            <span />
            <div>
              <strong>Systém online</strong>
              <small>Produkční prostředí</small>
            </div>
          </div>
        </aside>
        <div className="admin-workspace">
          <header className="admin-topbar">
            <div>
              <span className="topbar-context">
                ADMINISTRACE / PROVOZNÍ PŘEHLED
              </span>
              <h1>Řídicí centrum</h1>
            </div>
            <div className="account">
              <div className="user-chip">
                <span>{user.displayName}</span>
                <small>Administrátor</small>
              </div>
              <AccountPanel onPasswordChanged={onLogout} />
              <button className="ghost" onClick={onLogout}>
                Odhlásit
              </button>
            </div>
          </header>
          <div className="admin-content">
            <section className="admin-overview" id="overview">
              <div>
                <p className="eyebrow">AKTUÁLNÍ STAV PROVOZU</p>
                <h2>Vše pod kontrolou.</h2>
                <p>
                  Zakázky, lidé, technika a schvalování v jednom pracovním
                  prostoru.
                </p>
              </div>
              <div className="overview-metrics">
                <article>
                  <small>Všechny zakázky</small>
                  <strong>{loadingProjects ? "—" : projects.length}</strong>
                  <span>v evidenci</span>
                </article>
                <article>
                  <small>Aktivní zakázky</small>
                  <strong>{loadingProjects ? "—" : openProjects}</strong>
                  <span>otevřené</span>
                </article>
                <article>
                  <small>Archiv zakázek</small>
                  <strong>{loadingProjects ? "—" : closedProjects}</strong>
                  <span>uzavřené</span>
                </article>
              </div>
            </section>
            <section className="admin-section-anchor" id="projects">
              <div className="content-section-label">
                <span>01</span>
                <div>
                  <small>ŘÍZENÍ PROVOZU</small>
                  <strong>Zakázky</strong>
                </div>
              </div>
              {projectOverview}
              {projectForms}
            </section>
            <section className="admin-section-anchor" id="project-day">
              <ProjectDayPanel user={user} projects={projects} />
            </section>
            {canApprove && (
              <section className="admin-section-anchor" id="approvals">
                <ApprovalPanel />
              </section>
            )}
            {canReport && (
              <section className="admin-section-anchor" id="daily-report">
                <ReportPanel />
              </section>
            )}
            {canReport && (
              <section className="admin-section-anchor" id="monthly-report">
                <MonthlyPanel user={user} />
              </section>
            )}
            <section className="admin-section-anchor" id="records">
              <AdminRecordsPanel projects={projects} />
            </section>
            {canManageAssets && (
              <section className="admin-section-anchor" id="assets">
                <AssetPanel
                  onChanged={async () => setAssetVersion((value) => value + 1)}
                />
              </section>
            )}
            {canManageEmployees && (
              <section className="admin-section-anchor" id="employees">
                <EmployeePanel user={user} />
              </section>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard">
      <header className="topbar">
        <div>
          <span className="eyebrow">ZENTINEL</span>
          <h1>ZenOps</h1>
        </div>
        <div className="account">
          <div className="user-chip">
            <span>{user.displayName}</span>
            <small>{user.roles.join(" · ")}</small>
          </div>
          <AccountPanel onPasswordChanged={onLogout} />
          <button className="ghost" onClick={onLogout}>
            Odhlásit
          </button>
        </div>
      </header>
      <section className="welcome">
        <p className="eyebrow">PROVOZ DNEŠNÍHO DNE</p>
        <h2>Dobré ráno, {user.displayName.split(" ")[0]}</h2>
        <p>
          {isWorkerOnly
            ? "Denní záznam rychle a bez zbytečných kroků."
            : "Zakázky, technika a provozní přehled na jednom místě."}
        </p>
      </section>
      {isWorkerOnly ? (
        <section className="worker-home">
          <button
            className="daily-record-card"
            onClick={() => setShowDailyRecord((visible) => !visible)}
          >
            <span>+</span>
            <strong>
              {showDailyRecord ? "Zavřít denní záznam" : "Přidat denní záznam"}
            </strong>
            <small>Strojní sečení, kácení, reprofilace nebo ruční sečení</small>
          </button>
          <article className="future-card">
            <span>BRZY</span>
            <strong>Dovolená a žádosti</strong>
            <small>Tuto část připravíme později.</small>
          </article>
        </section>
      ) : (
        projectOverview
      )}
      {projectForms}
      {isWorkerOnly && showDailyRecord && (
        <WorkDayPanel projects={projects} assetVersion={assetVersion} />
      )}
      <ProjectDayPanel user={user} projects={projects} />
      {canApprove && <ApprovalPanel />}
      {canReport && <ReportPanel />}
      {canReport && <MonthlyPanel user={user} />}
      {user.roles.includes("ADMIN") && (
        <AdminRecordsPanel projects={projects} />
      )}
      {canManageAssets && (
        <AssetPanel
          onChanged={async () => setAssetVersion((value) => value + 1)}
        />
      )}
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
      .then((user) =>
        setAuth(user ? { status: "authenticated", user } : { status: "guest" }),
      )
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
      body: JSON.stringify({
        identifier: data.get("identifier"),
        password: data.get("password"),
      }),
    });
    if (!response.ok) {
      const body = (await response
        .json()
        .catch(() => ({ error: "Přihlášení se nezdařilo." }))) as {
        error?: string;
      };
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
    return (
      <main className="center">
        <div className="loader" aria-label="Načítání" />
      </main>
    );
  }

  if (auth.status === "authenticated") {
    return <Dashboard user={auth.user} onLogout={() => void logout()} />;
  }

  return (
    <main className="login-layout">
      <section className="brand-panel">
        <div className="brand">
          <span className="brand-mark">Z</span>
          <span>ZENTINEL</span>
        </div>
        <div className="brand-message">
          <p className="eyebrow">OPERATIONS, IN FOCUS.</p>
          <h1>ZenOps</h1>
          <p>Práce v terénu. Přesná data. Jeden společný provozní obraz.</p>
        </div>
        <p className="copyright">© {new Date().getFullYear()} Zentinel.cz</p>
      </section>
      <section className="form-panel">
        <form onSubmit={login}>
          <p className="eyebrow">VÍTEJTE ZPĚT</p>
          <h2>Přihlášení</h2>
          <p className="muted">Použijte svůj firemní účet ZenOps.</p>
          <label>
            E-mail nebo uživatelské jméno
            <input name="identifier" type="text" autoComplete="username" required />
          </label>
          <label>
            Heslo
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              minLength={12}
              required
            />
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button disabled={submitting}>
            {submitting ? "Ověřuji…" : "Přihlásit se"}
          </button>
          <small className="support">
            Potřebujete přístup? Kontaktujte správce systému.
          </small>
        </form>
      </section>
    </main>
  );
}
