import type { ProjectSummary, SessionUser } from "@zenops/contracts";
import { type FormEvent, useEffect, useState } from "react";

export function ProjectDayPanel({ user, projects }: { user: SessionUser; projects: ProjectSummary[] }) {
  const today = new Date().toLocaleDateString("en-CA");
  const manageable = projects.filter((project) => project.status === "OPEN" && (user.roles.includes("ADMIN") || project.leaderEmployeeId === user.employeeId));
  const [projectId, setProjectId] = useState("");
  const [weather, setWeather] = useState("");
  const [temperature, setTemperature] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!projectId) { setWeather(""); setTemperature(""); setNote(""); return; }
    void fetch(`/api/projects/${projectId}/day?date=${today}`, { credentials: "include" })
      .then(async (response) => response.ok ? response.json() as Promise<{ projectDay: { weather: string | null; temperatureC: string | null; note: string | null } | null }> : Promise.reject())
      .then(({ projectDay }) => { setWeather(projectDay?.weather ?? ""); setTemperature(projectDay?.temperatureC ?? ""); setNote(projectDay?.note ?? ""); })
      .catch(() => setMessage("Denní údaje se nepodařilo načíst."));
  }, [projectId]);

  if (!user.permissions.includes("project_day.manage")) return null;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("");
    const response = await fetch(`/api/projects/${projectId}/day?date=${today}`, {
      method: "PUT", credentials: "include", headers: { "content-type": "application/json" },
      body: JSON.stringify({ weather: weather || null, temperatureC: temperature ? Number(temperature) : null, note: note || null }),
    });
    if (!response.ok) { const body = await response.json().catch(() => ({ error: "Uložení se nezdařilo." })) as { error?: string }; setMessage(body.error ?? "Uložení se nezdařilo."); return; }
    setMessage("Denní údaje byly uloženy.");
  }

  return <section className="management-panel"><div className="section-heading"><div><p className="eyebrow">KONTEXT DNE · {today}</p><h3>Údaje projektu</h3></div></div>{manageable.length === 0 ? <p className="muted">Nejsou dostupné projekty, které můžete dnes spravovat.</p> : <form className="project-day-form" onSubmit={save}><label>Projekt<select value={projectId} onChange={(event) => setProjectId(event.target.value)} required><option value="">Vyberte projekt</option>{manageable.map((project) => <option key={project.id} value={project.id}>{project.code} · {project.name}</option>)}</select></label><label>Počasí<input value={weather} onChange={(event) => setWeather(event.target.value)} maxLength={120} /></label><label>Teplota °C<input value={temperature} onChange={(event) => setTemperature(event.target.value)} type="number" min="-60" max="60" step="0.1" /></label><label>Poznámka<input value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} /></label><button disabled={!projectId}>Uložit údaje dne</button>{message && <p className="form-message">{message}</p>}</form>}</section>;
}
