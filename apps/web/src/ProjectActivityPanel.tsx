import { useEffect, useState } from "react";
import type { ProjectActivity } from "@zenops/contracts";
import { businessDate, businessTime } from "@zenops/contracts/time";
import { shiftLabel, workStateLabel, projectStatusLabel } from "@zenops/contracts/labels";
import { MachineUsageDetails, machineUsageSearchText } from "./MachineUsageDetails";
import { DailyMachineList } from "./DailyMachineList";
import { ListSearch, matchesSearch } from "./ListSearch";

const hours = (minutes:number) => `${Math.floor(minutes/60)} h ${minutes%60} min`;

export function ProjectActivityPanel({projectId,onClose}:{projectId:string;onClose:()=>void}) {
  const [date,setDate] = useState(businessDate());
  const [activity,setActivity] = useState<ProjectActivity|null>(null);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState("");
  const [refresh,setRefresh] = useState(0);
  const [query,setQuery] = useState("");
  useEffect(()=>{
    const controller = new AbortController();
    setActivity(null);setLoading(true);setError("");
    void fetch(`/api/projects/${projectId}/activity?date=${date}`,{credentials:"include",signal:controller.signal})
      .then(async response=>{
        if (!response.ok) {
          const body = await response.json().catch(()=>({}));
          throw new Error(body.error ?? "Přehled zakázky se nepodařilo načíst.");
        }
        return response.json() as Promise<{activity:ProjectActivity}>;
      }).then(body=>{if(!controller.signal.aborted)setActivity(body.activity);})
      .catch(cause=>{if(!controller.signal.aborted)setError(cause instanceof Error ? cause.message : "Přehled se nepodařilo načíst.");})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[projectId,date,refresh]);
  const workers = [...new Set(activity?.project.entries.map(entry=>entry.employeeId) ?? [])];
  return <section className="management-panel project-activity-panel">
    <button type="button" className="worker-back" onClick={onClose}>← Zpět na zakázky</button>
    <div className="section-heading"><div><p className="eyebrow">PROVOZ ZAKÁZKY</p><h3>{activity ? `${activity.project.code} · ${activity.project.name}` : "Detail zakázky"}</h3></div>
      <label>Datum přehledu zakázky<input type="date" required value={date} onChange={event=>{if(event.target.value)setDate(event.target.value);}} /></label></div>
    <button type="button" className="ghost" disabled={loading} onClick={()=>setRefresh(value=>value+1)}>Obnovit přehled zakázky</button>
    {loading && <p role="status">Načítám pracovníky a techniku…</p>}{error && <p className="error" role="alert">{error}</p>}
    {activity && <><p className="project-activity-meta">{activity.project.location} · {projectStatusLabel(activity.project.status)} · Vedoucí: {activity.project.leaderName}</p>
      {activity.project.note && <p>{activity.project.note}</p>}
      <div className="report-summary"><div><strong>{activity.summary.workers}</strong><span>pracovníků</span></div><div><strong>{activity.machines.length}</strong><span>strojů</span></div>
        <div><strong>{hours(activity.summary.workedMinutes)}</strong><span>zapsaná práce</span></div><div><strong>{hours(activity.summary.approvedMinutes)}</strong><span>schváleno</span></div></div>
      <h4>Pracovníci na zakázce</h4><p className="muted">Podle zapsaných pracovních úseků pro vybraný den. Zahrnuje i rozpracovanou a vrácenou práci.</p>
      {workers.length===0 ? <p className="project-empty">K této zakázce zatím nikdo ve vybraný den nezapsal práci.</p> : <>
        <ListSearch value={query} onChange={setQuery} label="Hledat pracovníka, činnost, stroj nebo příslušenství" />
        <div className="project-worker-grid">{workers.map(employeeId=>{
          const entries=activity.project.entries.filter(entry=>entry.employeeId===employeeId);
          if(!entries.some(entry=>matchesSearch(query,entry.employeeName,entry.workTypeName,entry.workActivityName,entry.description,machineUsageSearchText(entry.machineUsages))))return null;
          return <article className="project-worker-card" key={employeeId}><header><h5>{entries[0]!.employeeName}</h5><b>{hours(entries.reduce((sum,entry)=>sum+entry.workedMinutes,0))}</b></header>
            {entries.map(entry=><section key={entry.id} className="project-worker-entry"><div className="project-entry-heading"><strong>{businessTime(entry.startAt)}–{businessTime(entry.endAt)}{businessDate(entry.startAt)!==businessDate(entry.endAt) ? " (+1 den)" : ""}</strong><span className={`state-badge ${entry.entryState.toLowerCase()}`}>{workStateLabel(entry.entryState)}</span></div>
              <p>{entry.workTypeName}{entry.workActivityName ? ` · ${entry.workActivityName}` : ""} · {shiftLabel(entry.shiftType)}</p>
              {entry.description && <p>{entry.description}</p>}
              {entry.machineUsages.length ? <MachineUsageDetails usages={entry.machineUsages} /> : <small>Bez přiřazeného stroje</small>}
            </section>)}
          </article>;
        })}</div>
        {!activity.project.entries.some(entry=>matchesSearch(query,entry.employeeName,entry.workTypeName,entry.workActivityName,entry.description,machineUsageSearchText(entry.machineUsages))) && <p className="muted">Žádný pracovník neodpovídá hledání.</p>}
      </>}
      <DailyMachineList machines={activity.machines} />
    </>}
  </section>;
}
