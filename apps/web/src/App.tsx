import { useMutation } from "./useMutation";
import { roleLabel, projectStatusLabel } from "@zenops/contracts/labels";
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
import { AccountantPanel } from "./AccountantPanel";
import { WorkerProfilePanel } from "./WorkerProfilePanel";
import { ListSearch, matchesSearch } from "./ListSearch";

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
  const [projectQuery, setProjectQuery] = useState("");
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [leaders, setLeaders] = useState<
    Array<{ id: string; displayName: string }>
  >([]);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectSummary | null>(
    null,
  );
  const [projectError, setProjectError] = useState("");
  const { busy, runMutation } = useMutation(setProjectError);
  const [assetVersion, setAssetVersion] = useState(0);
  const [showDailyRecord, setShowDailyRecord] = useState(false);
  const [showWorkerProfile, setShowWorkerProfile] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const canCreateProject = user.permissions.includes("project.create");
  const canManageProjects = user.permissions.includes("project.close");
  const canManageEmployees = user.permissions.includes("employee.manage");
  const canManageIssuedItems = user.permissions.includes("employee.items.manage");
  const canManageAssets = user.permissions.includes("asset.manage");
  const canApprove = user.permissions.includes("approval.project.manage");
  const canReport =
    user.permissions.includes("report.scoped.read") ||
    user.permissions.includes("report.global.read");
  const isWorkerOnly =
    user.roles.includes("WORKER") &&
    !user.roles.includes("LEADER") &&
    !user.roles.includes("ADMIN");
  const isAdmin = user.roles.includes("ADMIN");
  const isLeader = user.roles.includes("LEADER") && !isAdmin;
  const isAccountant = user.roles.includes("ACCOUNTANT");

  const loadProjects = () =>
    fetch(canManageProjects || isLeader ? "/api/projects" : "/api/projects/open", {
      credentials: "include",
    })
      .then(async (response) =>
        response.ok
          ? (response.json() as Promise<{ projects: ProjectSummary[] }>)
          : Promise.reject(),
      )
      .then((body) => setProjects(body.projects));

  useEffect(() => {
    if (isAccountant) {
      setLoadingProjects(false);
      return;
    }
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

  async function createProject(event: FormEvent<HTMLFormElement>) {
event.preventDefault(); return runMutation(async () => {

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

});
}

  async function changeProjectState(project: ProjectSummary) {
return runMutation(async () => {

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

});
}

  async function updateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); return runMutation(async () => {
    if (!editingProject) return;
    setProjectError("");
    const data = new FormData(event.currentTarget);
    const response = await fetch(`/api/projects/${editingProject.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        code: data.get("code"),
        leaderEmployeeId: data.get("leaderEmployeeId"),
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
    });
  }

  const projectOverview = (
    <section className="module-grid project-directory" aria-label="Seznam zakázek">
      <article className="projects-card">
        <span>01 · {loadingProjects ? "…" : projects.length}</span>
        <h3>{canManageProjects || isLeader ? "Zakázky" : "Otevřené zakázky"}</h3>
        {projects.length ? (
          <>
          {projects.length > 0 && <ListSearch value={projectQuery} onChange={setProjectQuery} label="Hledat zakázku podle kódu, názvu nebo místa" />}
          <ul>
        {projects.filter((project) => matchesSearch(projectQuery, project.code, project.name, project.location, projectStatusLabel(project.status))).map((project) => (
              <li
                className={project.status === "CLOSED" ? "closed" : ""}
                key={project.id}
              >
                <strong>{project.code}</strong>
                <span>
                  {project.name} · {project.location}{project.status === "CLOSED" ? " · Uzavřeno" : ""}
                </span>
                {canManageProjects && (
                  <span className="row-actions">
                    <button disabled={busy}
                      className="project-state"
                      onClick={() => setEditingProject(project)}
                    >
                      Upravit
                    </button>
                    <button disabled={busy}
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
          {!projects.some((project) => matchesSearch(projectQuery, project.code, project.name, project.location, projectStatusLabel(project.status))) && <p className="muted">Žádná zakázka neodpovídá hledání.</p>}
          </>
        ) : (
          <p>
            {loadingProjects
              ? "Načítám zakázky…"
              : "Zatím nejsou žádné zakázky."}
          </p>
        )}
        {canCreateProject && (
          <button disabled={busy}
            className="inline-action"
            onClick={() => setShowProjectForm((visible) => !visible)}
          >
            {showProjectForm ? "Zavřít formulář" : "Nová zakázka"}
          </button>
        )}
        <b>PROVOZNÍ PŘEHLED</b>
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
            <button disabled={busy}>Vytvořit zakázku</button>
          </form>
        </section>
      )}
      {editingProject && (
        <form className="admin-entry-form" onSubmit={updateProject}>
          <div>
            <strong>Upravit zakázku</strong>
            <button disabled={busy}
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
            <select name="leaderEmployeeId" defaultValue={editingProject.leaderEmployeeId} required>
              {!leaders.some((leader) => leader.id === editingProject.leaderEmployeeId) && <option value={editingProject.leaderEmployeeId}>{editingProject.leaderName} (dosavadní vedoucí)</option>}
              {leaders.map((leader) => <option key={leader.id} value={leader.id}>{leader.displayName}</option>)}
            </select>
          </label>
          <small>Změna vedoucího předá přístup k historii i čekajícímu schvalování. Důvod změny bude uložen.</small>
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
          <button disabled={busy}>Uložit auditovanou změnu</button>
        </form>
      )}
      {!showProjectForm && projectError && (
        <p className="dashboard-error" role="alert">
          {projectError}
        </p>
      )}
    </>
  );

  if (isAccountant) {
    return (
      <main className="admin-shell accountant-shell">
        <aside className="admin-sidebar">
          <div className="sidebar-brand"><span className="brand-mark">Z</span><div><strong>ZENOPS</strong><small>PERSONÁLNÍ EVIDENCE</small></div></div>
          <nav aria-label="Hlavní navigace"><button disabled={busy} className="active" type="button" aria-current="page"><NavIcon name="people" /><span>Uživatelé a vybavení</span></button></nav>
          <div className="sidebar-status"><span /><div><strong>Systém je dostupný</strong><small>Personální evidence</small></div></div>
        </aside>
        <div className="admin-workspace">
          <header className="admin-topbar"><div><span className="topbar-context">PERSONÁLNÍ EVIDENCE</span><h1>Uživatelé a svěřené věci</h1></div><div className="account"><div className="user-chip"><span>{user.displayName}</span><small>Účetní</small></div><AccountPanel onPasswordChanged={onLogout} /><button disabled={busy} className="ghost" onClick={onLogout}>Odhlásit</button></div></header>
          <div className="admin-content"><AccountantPanel /></div>
        </div>
      </main>
    );
  }

  if (isLeader) {
    const leaderProjects = projects.filter(
      (project) => project.leaderEmployeeId === user.employeeId,
    );
    const navItems: Array<{ id: string; label: string; icon: NavIconName }> = [
      { id: "overview", label: "Přehled", icon: "overview" },
      { id: "records", label: "Opravy práce", icon: "calendar" },
      ...(canApprove ? [{ id: "approvals", label: "Schvalování", icon: "approval" as const }] : []),
      ...(canCreateProject ? [{ id: "projects", label: "Zakázky", icon: "projects" as const }] : []),
      ...(user.permissions.includes("project_day.manage") ? [{ id: "project-day", label: "Denní provoz", icon: "calendar" as const }] : []),
      ...(canReport ? [{ id: "reports", label: "Reporty", icon: "report" as const }] : []),
      ...(canManageAssets ? [{ id: "assets", label: "Technika", icon: "assets" as const }] : []),
    ];
    const currentSection = navItems.find((item) => item.id === activeSection) ?? navItems[0]!;
    const actionHints: Record<string, string> = {
      records: "Opravit schválenou práci s uvedením důvodu.",
      approvals: "Zkontrolovat čekající práci a rozhodnout o schválení.",
      projects: "Vlastní zakázky, jejich historie a založení nové zakázky.",
      "project-day": "Počasí, teplota, poznámka a společné palivo.",
      reports: "Denní a měsíční přehled provozu.",
      assets: "Stroje, příslušenství a vozidla.",
    };
    return (
      <main className="admin-shell leader-shell">
        <aside className="admin-sidebar">
          <div className="sidebar-brand">
            <span className="brand-mark">Z</span>
            <div><strong>ZENOPS</strong><small>PROVOZ ZAKÁZEK</small></div>
          </div>
          <nav aria-label="Hlavní navigace Vedoucího">
            {navItems.map((item) => (
              <button disabled={busy}
                className={activeSection === item.id ? "active" : ""}
                key={item.id}
                title={item.label}
                type="button"
                aria-current={activeSection === item.id ? "page" : undefined}
                onClick={() => setActiveSection(item.id)}
              >
                <NavIcon name={item.icon} /><span>{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="sidebar-status"><span /><div><strong>Systém je dostupný</strong><small>Provozní agenda</small></div></div>
        </aside>
        <div className="admin-workspace">
          <header className="admin-topbar">
            <div><span className="topbar-context">VEDOUCÍ / {currentSection.label.toUpperCase()}</span><h1>{currentSection.label}</h1></div>
            <div className="account">
              <div className="user-chip"><span>{user.displayName}</span><small>Vedoucí</small></div>
              <AccountPanel onPasswordChanged={onLogout} />
              <button disabled={busy} className="ghost" onClick={onLogout}>Odhlásit</button>
            </div>
          </header>
          <div className="admin-content leader-content">
            {activeSection === "overview" && <>
              <section className="admin-overview leader-overview">
                <div>
                  <p className="eyebrow">VAŠE PROVOZNÍ AGENDA</p>
                  <h2>Dnešní práce na jednom místě.</h2>
                  <p>Vyberte úkol. Zakázky i schvalování jsou omezené na váš rozsah oprávnění.</p>
                </div>
                <div className="overview-metrics">
                  <article><small>Otevřené zakázky</small><strong>{loadingProjects ? "—" : leaderProjects.filter((project) => project.status === "OPEN").length}</strong><span>vaše aktivní zakázky</span></article>
                  <article><small>Zakázky, které vedete</small><strong>{loadingProjects ? "—" : leaderProjects.length}</strong><span>včetně uzavřených zakázek</span></article>
                </div>
              </section>
              <section className="leader-quick-actions" aria-labelledby="leader-actions-title">
                <div className="leader-actions-heading"><p className="eyebrow">RYCHLÝ PŘÍSTUP</p><h2 id="leader-actions-title">Co potřebujete udělat?</h2></div>
                <div className="leader-action-grid">
                  {navItems.filter((item) => item.id !== "overview").map((item) => (
                    <button disabled={busy} className={`leader-action-card ${item.id === "approvals" ? "primary" : ""}`} type="button" key={item.id} onClick={() => setActiveSection(item.id)}>
                      <span className="leader-action-icon"><NavIcon name={item.icon} /></span>
                      <span className="leader-action-copy"><strong>{item.label === "Schvalování" ? "Zkontrolovat práci" : item.label}</strong><small>{actionHints[item.id]}</small></span>
                      <span className="leader-action-cta">Otevřít <b aria-hidden="true">→</b></span>
                    </button>
                  ))}
                </div>
              </section>
            </>}
            {activeSection === "records" && <AdminRecordsPanel projects={leaderProjects} leaderMode />}
            {activeSection === "approvals" && canApprove && <section className="admin-section-view"><div className="content-section-label"><span>01</span><div><small>PRÁCE PRACOVNÍKŮ</small><strong>Schvalování</strong></div></div><ApprovalPanel /></section>}
            {activeSection === "projects" && canCreateProject && <section className="admin-section-view"><div className="content-section-label"><span>02</span><div><small>ORGANIZACE PRÁCE</small><strong>Zakázky</strong></div></div>{projectOverview}{projectForms}</section>}
            {activeSection === "project-day" && user.permissions.includes("project_day.manage") && <section className="admin-section-view"><div className="content-section-label"><span>03</span><div><small>ÚDAJE KAŽDÉHO DNE</small><strong>Denní provoz</strong></div></div><ProjectDayPanel user={user} projects={projects} /></section>}
            {activeSection === "reports" && canReport && <section className="admin-section-view leader-report-stack"><div className="content-section-label"><span>04</span><div><small>VÝSLEDKY PROVOZU</small><strong>Reporty</strong></div></div><ReportPanel /><MonthlyPanel user={user} /></section>}
            {activeSection === "assets" && canManageAssets && <section className="admin-section-view"><div className="content-section-label"><span>05</span><div><small>PROVOZNÍ PROSTŘEDKY</small><strong>Technika</strong></div></div><AssetPanel onChanged={async () => setAssetVersion((value) => value + 1)} /></section>}
          </div>
        </div>
      </main>
    );
  }

  if (isAdmin) {
    const openProjects = projects.filter(
      (project) => project.status === "OPEN",
    ).length;
    const closedProjects = projects.filter(
      (project) => project.status === "CLOSED",
    ).length;
    const navItems: Array<{ id: string; label: string; icon: NavIconName }> =
      [
        { id: "overview", label: "Přehled", icon: "overview" },
        { id: "projects", label: "Zakázky", icon: "projects" },
        { id: "project-day", label: "Denní provoz", icon: "calendar" },
        { id: "daily-report", label: "Denní report", icon: "report" },
        { id: "monthly-report", label: "Měsíční přehled", icon: "report" },
        { id: "records", label: "Opravy záznamů", icon: "records" },
        { id: "assets", label: "Technika", icon: "assets" },
        { id: "employees", label: "Zaměstnanci", icon: "people" },
        { id: "workers", label: "Vybavení uživatelů", icon: "assets" },
      ];
    const currentSection =
      navItems.find((item) => item.id === activeSection) ?? navItems[0]!;
    return (
      <main className="admin-shell">
        <aside className="admin-sidebar">
          <div className="sidebar-brand">
            <span className="brand-mark">Z</span>
            <div>
              <strong>ZENOPS</strong>
              <small>ŘÍZENÍ PROVOZU</small>
            </div>
          </div>
          <nav aria-label="Hlavní navigace">
            {navItems.map((item) => (
              <button disabled={busy}
                className={activeSection === item.id ? "active" : ""}
                key={item.id}
                title={item.label}
                type="button"
                aria-current={activeSection === item.id ? "page" : undefined}
                onClick={() => setActiveSection(item.id)}
              >
                <NavIcon name={item.icon} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="sidebar-status">
            <span />
            <div>
              <strong>Systém je dostupný</strong>
              <small>Produkční prostředí</small>
            </div>
          </div>
        </aside>
        <div className="admin-workspace">
          <header className="admin-topbar">
            <div>
              <span className="topbar-context">
                ADMINISTRACE / {currentSection.label.toUpperCase()}
              </span>
              <h1>{currentSection.label}</h1>
            </div>
            <div className="account">
              <div className="user-chip">
                <span>{user.displayName}</span>
                <small>Administrátor</small>
              </div>
              <AccountPanel onPasswordChanged={onLogout} />
              <button disabled={busy} className="ghost" onClick={onLogout}>
                Odhlásit
              </button>
            </div>
          </header>
          <div className="admin-content">
            {activeSection === "overview" && (
              <section className="admin-overview" id="overview">
                <div>
                  <p className="eyebrow">AKTUÁLNÍ STAV PROVOZU</p>
                  <h2>Vše pod kontrolou.</h2>
                  <p>
                    Souhrnný pohled na stav zakázek. Podrobné agendy otevřete
                    v navigaci vlevo.
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
            )}
            {activeSection === "projects" && (
              <section className="admin-section-view" id="projects">
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
            )}
            {activeSection === "project-day" && (
              <section className="admin-section-view" id="project-day">
                <ProjectDayPanel user={user} projects={projects} />
              </section>
            )}
            {activeSection === "daily-report" && canReport && (
              <section className="admin-section-anchor" id="daily-report">
                <ReportPanel />
              </section>
            )}
            {activeSection === "monthly-report" && canReport && (
              <section className="admin-section-view" id="monthly-report">
                <MonthlyPanel user={user} />
              </section>
            )}
            {activeSection === "records" && (
              <section className="admin-section-view" id="records">
                <AdminRecordsPanel projects={projects} />
              </section>
            )}
            {activeSection === "assets" && canManageAssets && (
              <section className="admin-section-view" id="assets">
                <AssetPanel
                  onChanged={async () => setAssetVersion((value) => value + 1)}
                />
              </section>
            )}
            {activeSection === "employees" && canManageEmployees && (
              <section className="admin-section-view" id="employees">
                <EmployeePanel user={user} />
              </section>
            )}
            {activeSection === "workers" && canManageIssuedItems && (
              <section className="admin-section-view" id="workers">
                <AccountantPanel />
              </section>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={isWorkerOnly ? "dashboard worker-dashboard" : "dashboard"}>
      <header className="topbar">
        <div>
          <span className="eyebrow">ZENTINEL</span>
          <h1>ZenOps</h1>
        </div>
        <div className="account">
          <div className="user-chip">
            <span>{user.displayName}</span>
            <small>{isWorkerOnly ? "Pracovník" : user.roles.map(roleLabel).join(" · ")}</small>
          </div>
          <AccountPanel onPasswordChanged={onLogout} />
          <button disabled={busy} className="ghost" onClick={onLogout}>
            Odhlásit
          </button>
        </div>
      </header>
      {(!isWorkerOnly || (!showDailyRecord && !showWorkerProfile)) && <section className="welcome">
        <p className="eyebrow">PROVOZ DNEŠNÍHO DNE</p>
        <h2>Dobré ráno, {user.displayName.split(" ")[0]}</h2>
        <p>
          {isWorkerOnly
            ? "Denní záznam rychle a bez zbytečných kroků."
            : "Zakázky, technika a provozní přehled na jednom místě."}
        </p>
      </section>}
      {isWorkerOnly ? (
        !showDailyRecord && !showWorkerProfile && <section className="worker-home">
          <button disabled={busy} className="daily-record-card" onClick={() => setShowDailyRecord(true)}>
            <span className="worker-home-icon" aria-hidden="true">→</span>
            <span className="worker-home-copy"><small>DNEŠNÍ ZÁZNAM</small><strong>Kde dnes pracuji?</strong><small>Zapsat směnu a práci</small></span>
            <span className="worker-home-cta">Začít</span>
          </button>
          <button disabled={busy} className="worker-profile-shortcut" onClick={() => setShowWorkerProfile(true)}>Můj profil a svěřené věci <span aria-hidden="true">→</span></button>
        </section>
      ) : (
        projectOverview
      )}
      {projectForms}
      {isWorkerOnly && showDailyRecord && (
        <WorkDayPanel projects={projects} assetVersion={assetVersion} employeeId={user.employeeId} onClose={() => setShowDailyRecord(false)} />
      )}
      {isWorkerOnly && showWorkerProfile && <WorkerProfilePanel onClose={() => setShowWorkerProfile(false)} />}
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
    try {
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
    } catch { setError("Nepodařilo se spojit se serverem. Zkuste přihlášení znovu."); }
    finally { setSubmitting(false); }
  }

  async function logout() {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      if (!response.ok) throw new Error();
      setAuth({ status: "guest" });
    } catch { window.alert("Odhlášení se nepodařilo. Zkontrolujte připojení a zkuste to znovu."); }
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
          <p className="eyebrow">PROVOZ POD KONTROLOU.</p>
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
