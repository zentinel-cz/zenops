import { businessDate, businessTime, businessTimeZone } from "@zenops/contracts/time";
import { shiftLabel, workStateLabel } from "@zenops/contracts/labels";
import { useState } from "react";
import { ListSearch, matchesSearch } from "./ListSearch";

export type WorkDayRecordTarget = { id: string; workDate: string; employeeName: string };
export type BlockedWorkDay = WorkDayRecordTarget & {
  employeeId: string; shiftType: string; state: string; canCancel: boolean; workerCanAct: boolean; workEntryCount: number;
  entries: Array<{ id: string; state: string; startAt: string; endAt: string; projectId: string;
    projectCode: string; projectName: string; workTypeName: string; leaderEmployeeId: string;
    leaderName: string; leaderCanApprove: boolean; returnReason: string | null }>;
};
const dateLabel = (date: string) => new Date(date.slice(0,10)+"T12:00:00Z")
  .toLocaleDateString("cs-CZ",{timeZone:businessTimeZone});
function nextStep(day: BlockedWorkDay) {
  if (day.canCancel) return "Pracovník nebo Admin: posoudit zrušení prázdného dne s důvodem.";
  if (day.state==="DRAFT") return day.workerCanAct ? "Pracovník: dokončit a odeslat den." : "Admin: prověřit účet pracovníka a rozpracovaný záznam.";
  if (day.state==="RETURNED") return day.workerCanAct ? "Pracovník: opravit vrácenou práci a den znovu odeslat." : "Admin: prověřit účet pracovníka a vrácenou práci.";
  return "Vedoucí jednotlivých zakázek: rozhodnout o čekajících úsecích.";
}

export function PeriodBlockers({ days, onOpenWorkDay }: { days: BlockedWorkDay[]; onOpenWorkDay?: ((target: WorkDayRecordTarget) => void) | undefined }) {
  const [query,setQuery] = useState("");
  const visible = days.filter(day=>matchesSearch(query,day.employeeName,day.workDate,shiftLabel(day.shiftType),workStateLabel(day.state),
    day.entries.map(entry=>`${entry.projectCode} ${entry.projectName} ${entry.leaderName} ${entry.returnReason ?? ""}`).join(" ")));
  return <section className="period-blockers" aria-label="Co brání uzávěrce">
    <div className="section-heading"><h4>Co brání uzávěrce</h4><span className="state-badge">{days.length} {days.length===1 ? "den" : days.length>1 && days.length<5 ? "dny" : "dnů"}</span></div>
    {days.length===0 ? <p className="muted">Žádné nevyřešené dny. Stav se při uzavření znovu ověří.</p> : <>
      <ListSearch value={query} onChange={setQuery} label="Hledat překážku podle pracovníka, zakázky nebo vedoucího" />
      <p className="period-blocker-count">Zobrazeno: {visible.length} z {days.length}</p>
      {visible.map(day=><article className="period-blocker" key={day.id} aria-label={`${day.employeeName} · ${dateLabel(day.workDate)}`}>
        <header><div><h5>{day.employeeName}</h5><p>{dateLabel(day.workDate)} · {shiftLabel(day.shiftType)}</p></div>
          <span className={`state-badge ${day.state.toLowerCase()}`}>{workStateLabel(day.state)}</span></header>
        <p className="period-next-step">{nextStep(day)}</p>
        {day.entries.length>0 ? <details><summary>Nevyřešené úseky ({day.entries.length})</summary>
          <ul>{day.entries.map(entry=><li key={entry.id}>
            <strong>{entry.projectCode} · {entry.projectName}</strong>
            <span>{entry.workTypeName} · {businessTime(entry.startAt)}–{businessTime(entry.endAt)}
              {businessDate(entry.startAt)!==businessDate(entry.endAt) && " (+1 den)"} · {workStateLabel(entry.state)}</span>
            {entry.state==="SUBMITTED" ? <span>{entry.leaderCanApprove
              ? `Schválí vedoucí: ${entry.leaderName}`
              : `Vedoucí ${entry.leaderName} nyní nemůže schvalovat. Admin musí prověřit předání zakázky.`}</span>
              : <span>Vyřeší pracovník: {day.employeeName}{!day.workerCanAct && " · účet vyžaduje kontrolu Admina"}</span>}
            {entry.returnReason && <p className="return-reason">Důvod vrácení: {entry.returnReason}</p>}
          </li>)}</ul></details>
          : <p className="period-blocker-empty">{day.workEntryCount===0
            ? "Den neobsahuje pracovní úseky. Při posouzení zkontrolujte také přestávky a vlastní jízdy."
            : "Úseky jsou schválené, ale stav celého dne ještě vyžaduje kontrolu."}</p>}
        {onOpenWorkDay && <button type="button" className="table-action" onClick={()=>onOpenWorkDay(day)}>Otevřít záznam</button>}
      </article>)}
      {visible.length===0 && <p className="muted">Žádná překážka neodpovídá hledání.</p>}
    </>}
  </section>;
}
