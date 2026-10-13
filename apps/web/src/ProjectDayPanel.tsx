import type { ProjectSummary, SessionUser } from "@zenops/contracts";
import { type FormEvent, useEffect, useState } from "react";

export function ProjectDayPanel({ user, projects }: { user: SessionUser; projects: ProjectSummary[] }) {
  const today = new Date().toLocaleDateString("en-CA");
  const manageable = projects.filter((project) => project.status === "OPEN" && (user.roles.includes("ADMIN") || project.leaderEmployeeId === user.employeeId));
  const [projectId, setProjectId] = useState("");
  const [weather, setWeather] = useState("");
  const [temperature, setTemperature] = useState("");
  const [note, setNote] = useState("");
  const [brushcutterConsumed, setBrushcutterConsumed] = useState("");
  const [brushcutterRefuelled, setBrushcutterRefuelled] = useState("");
  const [fuelNote, setFuelNote] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadedProjectId, setLoadedProjectId] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoadedProjectId(""); setMessage(""); setLoading(!!projectId);
    setWeather(""); setTemperature(""); setNote(""); setBrushcutterConsumed(""); setBrushcutterRefuelled(""); setFuelNote("");
    if (!projectId) { setWeather(""); setTemperature(""); setNote(""); setBrushcutterConsumed(""); setBrushcutterRefuelled(""); setFuelNote(""); return; }
    void fetch(`/api/projects/${projectId}/day?date=${today}`, { credentials: "include", signal: controller.signal })
      .then(async (response) => response.ok ? response.json() as Promise<{ projectDay: { weather: string | null; temperatureC: string | null; note: string | null } | null; fuelRecords: Array<{ category: string; fuelConsumed: string | null; fuelRefuelled: string | null; note: string | null }> }> : Promise.reject())
      .then(({ projectDay, fuelRecords }) => { if (controller.signal.aborted) return; setLoadedProjectId(projectId); const fuel = fuelRecords.find((record) => record.category === "BRUSHCUTTER"); setWeather(projectDay?.weather ?? ""); setTemperature(projectDay?.temperatureC ?? ""); setNote(projectDay?.note ?? ""); setBrushcutterConsumed(fuel?.fuelConsumed ?? ""); setBrushcutterRefuelled(fuel?.fuelRefuelled ?? ""); setFuelNote(fuel?.note ?? ""); })
      .catch(() => { if (!controller.signal.aborted) setMessage("Denní údaje se nepodařilo načíst. Vyberte zakázku znovu."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [projectId]);

  if (!user.permissions.includes("project_day.manage")) return null;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (saving || loading || loadedProjectId !== projectId) return; setSaving(true); setMessage("");
    try {
    const response = await fetch(`/api/projects/${projectId}/day?date=${today}`, {
      method: "PUT", credentials: "include", headers: { "content-type": "application/json" },
      body: JSON.stringify({ weather: weather || null, temperatureC: temperature ? Number(temperature) : null, note: note || null }),
    });
    if (!response.ok) { const body = await response.json().catch(() => ({ error: "Uložení se nezdařilo." })) as { error?: string }; setMessage(body.error ?? "Uložení se nezdařilo."); return; }
    if (brushcutterConsumed || brushcutterRefuelled) {
      const fuelResponse = await fetch(`/api/projects/${projectId}/day/fuel?date=${today}`, {
        method: "PUT", credentials: "include", headers: { "content-type": "application/json" },
        body: JSON.stringify({ category: "BRUSHCUTTER", fuelConsumed: brushcutterConsumed ? Number(brushcutterConsumed) : null, fuelRefuelled: brushcutterRefuelled ? Number(brushcutterRefuelled) : null, note: fuelNote || null }),
      });
      if (!fuelResponse.ok) { const body = await fuelResponse.json().catch(() => ({ error: "Palivo se nepodařilo uložit." })) as { error?: string }; setMessage(`Údaje dne jsou uložené, palivo se neuložilo: ${body.error ?? "Zkuste uložení znovu."}`); return; }
    }
    setMessage("Denní údaje byly uloženy.");
    } catch { setMessage("Spojení se serverem selhalo. Před dalším uložením ověřte údaje dne i palivo."); }
    finally { setSaving(false); }
  }

  return <section className="management-panel"><div className="section-heading"><div><p className="eyebrow">KONTEXT DNE · {today}</p><h3>Údaje zakázky a sdílené palivo</h3></div></div>{manageable.length === 0 ? <p className="muted">Nejsou dostupné zakázky, které můžete dnes spravovat.</p> : <form className="project-day-form" onSubmit={save}><label>Zakázka<select disabled={saving} value={projectId} onChange={(event) => setProjectId(event.target.value)} required><option value="">Vyberte zakázku</option>{manageable.map((project) => <option key={project.id} value={project.id}>{project.code} · {project.name}</option>)}</select></label><label>Počasí<input disabled={saving || loading || !projectId || loadedProjectId !== projectId} value={weather} onChange={(event) => setWeather(event.target.value)} maxLength={120} /></label><label>Teplota °C<input disabled={saving || loading || !projectId || loadedProjectId !== projectId} value={temperature} onChange={(event) => setTemperature(event.target.value)} type="number" min="-60" max="60" step="0.1" /></label><label>Poznámka<input disabled={saving || loading || !projectId || loadedProjectId !== projectId} value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} /></label><fieldset className="fuel-fields"><legend>Křovinořezy · společné palivo zakázky</legend><label>Spotřeba<input disabled={saving || loading || !projectId || loadedProjectId !== projectId} value={brushcutterConsumed} onChange={(event) => setBrushcutterConsumed(event.target.value)} type="number" min="0" step="0.01" /></label><label>Tankování<input disabled={saving || loading || !projectId || loadedProjectId !== projectId} value={brushcutterRefuelled} onChange={(event) => setBrushcutterRefuelled(event.target.value)} type="number" min="0" step="0.01" /></label><label>Poznámka<input disabled={saving || loading || !projectId || loadedProjectId !== projectId} value={fuelNote} onChange={(event) => setFuelNote(event.target.value)} maxLength={1000} /></label></fieldset><button disabled={saving || loading || !projectId || loadedProjectId !== projectId}>{saving ? "Ukládám…" : loading ? "Načítám…" : "Uložit údaje dne"}</button>{message && <p className="form-message">{message}</p>}</form>}</section>;
}
