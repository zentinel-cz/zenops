import type { EmployeeSummary, SessionUser } from "@zenops/contracts";
import { type FormEvent, useEffect, useState } from "react";

export function EmployeePanel({ user }: { user: SessionUser }) {
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [stateTarget, setStateTarget] = useState<EmployeeSummary | null>(null);
  const [error, setError] = useState("");

  const load = () => fetch("/api/employees", { credentials: "include" })
    .then(async (response) => response.ok ? response.json() as Promise<{ employees: EmployeeSummary[] }> : Promise.reject())
    .then((body) => setEmployees(body.employees));

  useEffect(() => { void load().catch(() => setError("Zaměstnance se nepodařilo načíst.")); }, []);

  async function createEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await fetch("/api/employees", {
      method: "POST", credentials: "include", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        employeeNumber: data.get("employeeNumber"), displayName: data.get("displayName"),
        email: data.get("email"), password: data.get("password"), roles: data.getAll("roles"),
      }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: "Účet se nepodařilo vytvořit." })) as { error?: string };
      setError(body.error ?? "Účet se nepodařilo vytvořit.");
      return;
    }
    form.reset();
    setShowCreate(false);
    await load();
  }

  async function changeState(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stateTarget) return;
    const data = new FormData(event.currentTarget);
    const response = await fetch(`/api/employees/${stateTarget.id}/state`, {
      method: "PATCH", credentials: "include", headers: { "content-type": "application/json" },
      body: JSON.stringify({ active: !stateTarget.isActive, reason: data.get("reason") }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: "Stav se nepodařilo změnit." })) as { error?: string };
      setError(body.error ?? "Stav se nepodařilo změnit.");
      return;
    }
    setStateTarget(null);
    await load();
  }

  return (
    <section className="management-panel">
      <div className="section-heading"><div><p className="eyebrow">SPRÁVA PŘÍSTUPŮ</p><h3>Zaměstnanci</h3></div><button className="inline-action" onClick={() => setShowCreate((value) => !value)}>{showCreate ? "Zavřít" : "Nový zaměstnanec"}</button></div>
      {error && <p className="error" role="alert">{error}</p>}
      {showCreate && <form className="employee-form" onSubmit={createEmployee}><label>Osobní číslo<input name="employeeNumber" required maxLength={40} /></label><label>Jméno<input name="displayName" required maxLength={160} /></label><label>E-mail<input name="email" type="email" required /></label><label>Dočasné heslo<input name="password" type="password" required minLength={12} /></label><fieldset><legend>Role</legend><label className="checkbox"><input type="checkbox" name="roles" value="WORKER" defaultChecked /> Pracovník</label><label className="checkbox"><input type="checkbox" name="roles" value="LEADER" /> Vedoucí</label><label className="checkbox"><input type="checkbox" name="roles" value="ADMIN" /> Admin</label></fieldset><button>Vytvořit účet</button></form>}
      <div className="employee-list">{employees.map((employee) => <div className={`employee-row ${employee.isActive ? "" : "inactive"}`} key={employee.id}><div><strong>{employee.displayName}</strong><span>{employee.employeeNumber} · {employee.email}</span></div><span className="role-list">{employee.roles.join(" · ")}</span><button className="table-action" disabled={employee.id === user.employeeId} onClick={() => setStateTarget(employee)}>{employee.isActive ? "Deaktivovat" : "Aktivovat"}</button></div>)}</div>
      {stateTarget && <form className="state-dialog" onSubmit={changeState}><div><strong>{stateTarget.isActive ? "Deaktivovat" : "Aktivovat"}: {stateTarget.displayName}</strong><button type="button" className="close-button" onClick={() => setStateTarget(null)}>×</button></div><label>Důvod<input name="reason" required minLength={3} maxLength={500} autoFocus /></label><button>{stateTarget.isActive ? "Potvrdit deaktivaci" : "Potvrdit aktivaci"}</button></form>}
    </section>
  );
}
