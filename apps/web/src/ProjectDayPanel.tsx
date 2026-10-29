import { businessDate } from "@zenops/contracts/time";
import type { ProjectSummary, SessionUser } from "@zenops/contracts";
import { type FormEvent, useEffect, useState } from "react";

export function ProjectDayPanel({ user, projects }: { user: SessionUser; projects: ProjectSummary[] }) {
  const [today, setDate] = useState(businessDate());
  const manageable = projects.filter((project) => (user.roles.includes("ADMIN") || project.leaderEmployeeId === user.employeeId));
  const [projectId, setProjectId] = useState("");
  const closedProject = manageable.find((project) => project.id === projectId)?.status === "CLOSED";
  const [weather, setWeather] = useState("");
  const [temperature, setTemperature] = useState("");
  const [note, setNote] = useState("");
  const [brushcutterConsumed, setBrushcutterConsumed] = useState("");
  const [brushcutterRefuelled, setBrushcutterRefuelled] = useState("");
  const [fuelNote, setFuelNote] = useState("");
  const [fuelCleared, setFuelCleared] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadedKey, setLoadedKey] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoadedKey(""); setMessage(""); setLoading(!!projectId); setFuelCleared(false);
    setWeather(""); setTemperature(""); setNote(""); setBrushcutterConsumed(""); setBrushcutterRefuelled(""); setFuelNote("");
    if (!projectId) { setWeather(""); setTemperature(""); setNote(""); setBrushcutterConsumed(""); setBrushcutterRefuelled(""); setFuelNote(""); return; }
    void fetch(`/api/projects/${projectId}/day?date=${today}`, { credentials: "include", signal: controller.signal })
      .then(async (response) => response.ok ? response.json() as Promise<{ projectDay: { weather: string | null; temperatureC: string | null; note: string | null } | null; fuelRecords: Array<{ category: string; fuelConsumed: string | null; fuelRefuelled: string | null; note: string | null; clearedAt: string | null }> }> : Promise.reject())
      .then(({ projectDay, fuelRecords }) => { if (controller.signal.aborted) return; setLoadedKey(`${projectId}:${today}`); const fuel = fuelRecords.find((record) => record.category === "BRUSHCUTTER"); setWeather(projectDay?.weather ?? ""); setTemperature(projectDay?.temperatureC ?? ""); setNote(projectDay?.note ?? ""); setBrushcutterConsumed(fuel?.fuelConsumed ?? ""); setBrushcutterRefuelled(fuel?.fuelRefuelled ?? ""); setFuelNote(fuel?.note ?? ""); setFuelCleared(!!fuel?.clearedAt); })
      .catch(() => { if (!controller.signal.aborted) setMessage("Denní údaje se nepodařilo načíst. Vyberte zakázku znovu."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [projectId, today]);

  if (!user.permissions.includes("project_day.manage")) return null;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (closedProject || saving || loading || loadedKey !== `${projectId}:${today}`) return; setSaving(true); setMessage("");
    try {
    const response = await fetch(`/api/projects/${projectId}/day?date=${today}`, {
      method: "PUT", credentials: "include", headers: { "content-type": "application/json" },
      body: JSON.stringify({ weather: weather || null, temperatureC: temperature ? Number(temperature) : null, note: note || null, fuel: { category: "BRUSHCUTTER", fuelConsumed: brushcutterConsumed !== "" ? Number(brushcutterConsumed) : null, fuelRefuelled: brushcutterRefuelled !== "" ? Number(brushcutterRefuelled) : null, note: fuelNote || null } }),
    });
    if (!response.ok) { const body = await response.json().catch(() => ({ error: "Uložení se nezdařilo." })) as { error?: string }; setMessage(body.error ?? "Uložení se nezdařilo."); return; }
    const saved = await response.json() as { fuelRecord: { fuelConsumed: string | null; fuelRefuelled: string | null; note: string | null; clearedAt: string | null } | null };
    setBrushcutterConsumed(saved.fuelRecord?.fuelConsumed ?? "");
    setBrushcutterRefuelled(saved.fuelRecord?.fuelRefuelled ?? "");
    setFuelNote(saved.fuelRecord?.note ?? "");
    setFuelCleared(!!saved.fuelRecord?.clearedAt);
    setMessage("Denní údaje a palivo byly uloženy.");
    } catch { setMessage("Spojení se serverem selhalo. Před dalším uložením ověřte údaje dne i palivo."); }
    finally { setSaving(false); }
  }

  return <section className="management-panel"><div className="section-heading"><div><p className="eyebrow">KONTEXT DNE · {today}</p><h3>Údaje zakázky a sdílené palivo</h3></div><input type="date" aria-label="Datum provozních údajů" value={today} disabled={saving} onChange={(event) => setDate(event.target.value)} required /></div>{closedProject && <p className="muted">Historie uzavřené zakázky — pouze pro čtení.</p>}{manageable.length === 0 ? <p className="muted">Nejsou dostupné zakázky, které můžete dnes spravovat.</p> : <form className="project-day-form" onSubmit={save}><label>Zakázka<select disabled={saving} value={projectId} onChange={(event) => setProjectId(event.target.value)} required><option value="">Vyberte zakázku</option>{manageable.map((project) => <option key={project.id} value={project.id}>{project.code} · {project.name}{project.status === "CLOSED" ? " (uzavřeno)" : ""}</option>)}</select></label><label>Počasí<input disabled={closedProject || saving || loading || !projectId || loadedKey !== `${projectId}:${today}`} value={weather} onChange={(event) => setWeather(event.target.value)} maxLength={120} /></label><label>Teplota °C<input disabled={closedProject || saving || loading || !projectId || loadedKey !== `${projectId}:${today}`} value={temperature} onChange={(event) => setTemperature(event.target.value)} type="number" min="-60" max="60" step="0.1" /></label><label>Poznámka<input disabled={closedProject || saving || loading || !projectId || loadedKey !== `${projectId}:${today}`} value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} /></label>{fuelCleared && <p className="muted">Vykázané palivo bylo vymazáno. Původní hodnoty jsou uchované v auditu.</p>}<fieldset className="fuel-fields"><legend>Křovinořezy · společné palivo zakázky</legend><p className="muted">Prázdné pole znamená neuvedenou hodnotu, 0 znamená nulovou spotřebu či tankování. Vymazáním obou hodnot a uložením zrušíte vykázané palivo; historie zůstane zachována.</p><label>Spotřeba<input disabled={closedProject || saving || loading || !projectId || loadedKey !== `${projectId}:${today}`} value={brushcutterConsumed} onChange={(event) => setBrushcutterConsumed(event.target.value)} type="number" min="0" step="0.01" /></label><label>Tankování<input disabled={closedProject || saving || loading || !projectId || loadedKey !== `${projectId}:${today}`} value={brushcutterRefuelled} onChange={(event) => setBrushcutterRefuelled(event.target.value)} type="number" min="0" step="0.01" /></label><label>Poznámka<input disabled={closedProject || saving || loading || !projectId || loadedKey !== `${projectId}:${today}`} value={fuelNote} onChange={(event) => setFuelNote(event.target.value)} maxLength={1000} /></label></fieldset><button disabled={closedProject || saving || loading || !projectId || loadedKey !== `${projectId}:${today}`}>{saving ? "Ukládám…" : loading ? "Načítám…" : "Uložit údaje dne"}</button>{message && <p className="form-message">{message}</p>}</form>}</section>;
}
