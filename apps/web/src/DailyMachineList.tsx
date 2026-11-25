import type { DailyMachineSummary } from "@zenops/contracts";
import { businessDate, businessTime } from "@zenops/contracts/time";
import { workStateLabel } from "@zenops/contracts/labels";
import { MachineUsageDetails } from "./MachineUsageDetails";

export function DailyMachineList({ machines }: { machines: DailyMachineSummary[] }) {
  return <section className="daily-machines" aria-label="Soupiska strojů"><div className="section-heading">
    <div><p className="eyebrow">TECHNIKA VYBRANÉHO DNE</p><h4>Soupiska strojů</h4></div><span>{machines.length} strojů</span>
  </div><p className="muted">Součty zahrnují schválená i předběžná použití. MTH jsou součtem rozdílů odečtů, nikoli pracovních hodin.</p>
    {!machines.length ? <p className="muted">Pro tento den nejsou přiřazené stroje.</p> : <div className="daily-machine-grid">{machines.map(machine => <article className="daily-machine-card" key={machine.machineId}>
      <header><div><strong>{machine.machineCode}</strong><h5>{machine.machineName}</h5></div><b>{machine.mth ?? "—"} MTH</b></header>
      <dl><div><dt>Spotřeba</dt><dd>{machine.fuelConsumed ?? "—"} l</dd></div><div><dt>Tankování</dt><dd>{machine.fuelRefuelled ?? "—"} l</dd></div>
        <div><dt>Použití stroje</dt><dd>{machine.usages.length}</dd></div><div><dt>Použití s odečtem MTH</dt><dd>{machine.measuredUsages}/{machine.usages.length}</dd></div></dl>
      <details><summary>Obsluha, příslušenství a podrobnosti ({machine.usages.length})</summary><div className="daily-machine-usages">{machine.usages.map(usage => <section key={usage.id}>
        <strong>{usage.employeeName}</strong><p>{usage.projectCode} · {usage.projectName}</p>
        <p>{businessTime(usage.startAt)}–{businessTime(usage.endAt)}{businessDate(usage.startAt)!==businessDate(usage.endAt) ? " (+1 den)" : ""} · {workStateLabel(usage.entryState)}</p>
        <MachineUsageDetails usages={[usage]} />
      </section>)}</div></details>
    </article>)}</div>}
  </section>;
}
