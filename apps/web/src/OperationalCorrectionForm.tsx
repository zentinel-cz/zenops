import { adminMachineUsageUpdateSchema, adminVehicleTripUpdateSchema, type MachineUsageSummary } from "@zenops/contracts";
import { businessDate, businessTime } from "@zenops/contracts/time";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { BusinessDateTimeField, readBusinessDateTime } from "./BusinessDateTimeField";
import { useMutation } from "./useMutation";

export type CorrectionTrip = {
  id: string; vehicleId: string; vehicleCode: string; startAt: string; endAt: string;
  startOdometerKm: string; endOdometerKm: string; fuelConsumed: string | null;
  fuelRefuelled: string | null; note: string | null; passengerEmployeeIds: string[];
};
export type OperationalCorrectionTarget = { employeeName: string; workDate: string } & (
  { kind: "machine"; usage: MachineUsageSummary }
  | { kind: "trip"; trip: CorrectionTrip; driverEmployeeId: string }
);
type Options = {
  attachments: Array<{ id: string; code: string; name: string; isActive: boolean }>;
  employees: Array<{ id: string; employeeNumber: string; displayName: string; isActive: boolean }>;
};
const numberOrNull = (data: FormData, name: string) => {
  const value = String(data.get(name) ?? "").trim();
  return value === "" ? null : Number(value);
};

export function OperationalCorrectionForm({ target, onClose, onSaved }: {
  target: OperationalCorrectionTarget; onClose: () => void; onSaved: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [options, setOptions] = useState<Options | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [message, setMessage] = useState("");
  const { busy, runMutation } = useMutation(setMessage);
  const machine = target.kind === "machine" ? target.usage : null;
  const trip = target.kind === "trip" ? target.trip : null;

  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setOptions(null); setMessage("");
    void fetch("/api/admin/record-options", { credentials: "include", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const body = await response.json() as Options;
        if (!controller.signal.aborted) setOptions(body);
      })
      .catch(() => { if (!controller.signal.aborted) setMessage("Seznamy se nepodařilo načíst. Zkuste načtení znovu."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (!options || loading) return;
    await runMutation(async () => {
      setMessage("");
      const reason = String(data.get("reason") ?? "").trim();
      if (reason.length < 3) { setMessage("Uveďte důvod opravy alespoň o 3 znacích."); return; }
      const fuel = { fuelConsumed: numberOrNull(data, "fuelConsumed"), fuelRefuelled: numberOrNull(data, "fuelRefuelled"), reason };
      const parsed = machine ? adminMachineUsageUpdateSchema.safeParse({
        ...fuel, machineId: machine.machineId, startMth: numberOrNull(data, "startMth"),
        endMth: numberOrNull(data, "endMth"), attachmentIds: data.getAll("attachmentIds"),
      }) : adminVehicleTripUpdateSchema.safeParse({
        ...fuel, vehicleId: trip!.vehicleId, startAt: readBusinessDateTime(data, "startAt"),
        endAt: readBusinessDateTime(data, "endAt"), startOdometerKm: Number(data.get("startOdometerKm")),
        endOdometerKm: Number(data.get("endOdometerKm")), passengerEmployeeIds: data.getAll("passengerEmployeeIds"),
        note: String(data.get("note") ?? "").trim() || null,
      });
      if (!parsed.success) {
        setMessage(parsed.error.issues.find((issue) => issue.code === "custom")?.message
          ?? "Zkontrolujte zadané údaje. Lze vybrat nejvýše 20 cestujících nebo položek příslušenství.");
        return;
      }
      const response = await fetch(`/api/admin/${machine ? "machine-usages" : "vehicle-trips"}/${machine?.id ?? trip!.id}`, {
        method: "PATCH", credentials: "include", headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        setMessage(body.error ?? "Oprava se nezdařila. Zadané hodnoty zůstaly ve formuláři."); return;
      }
      onSaved();
    });
  }

  return <dialog ref={dialog} className="record-correction-dialog" aria-labelledby={titleId}
    onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className="record-correction-heading"><div>
      <p className="eyebrow">AUDITOVANÁ OPRAVA</p>
      <h3 id={titleId}>{machine ? `MTH a palivo · ${machine.machineCode}` : `Opravit jízdu · ${trip!.vehicleCode}`}</h3>
    </div><button type="button" className="ghost" disabled={busy} aria-label="Zavřít opravu" onClick={onClose}>×</button></div>
    <p className="record-correction-context">{target.employeeName} · {target.workDate.slice(0, 10)}
      {trip && <><br />Řidič této jízdy · {businessDate(trip.startAt)} {businessTime(trip.startAt)} – {businessDate(trip.endAt)} {businessTime(trip.endAt)}</>}</p>
    {message && <p className="error" role="alert">{message}</p>}
    {loading && <p role="status">Načítám seznamy pro opravu…</p>}
    {!loading && !options && <button type="button" onClick={() => setAttempt((value) => value + 1)}>Zkusit načíst znovu</button>}
    <form onSubmit={submit}>
      <fieldset className="record-correction-fields" disabled={busy || loading || !options}>
        {machine && <div className="record-correction-grid">
          <label>Počáteční MTH<input name="startMth" type="number" min="0" max="10000000" step="0.01" defaultValue={machine.startMth ?? ""} /></label>
          <label>Konečný MTH<input name="endMth" type="number" min="0" max="10000000" step="0.01" defaultValue={machine.endMth ?? ""} /></label>
        </div>}
        {trip && <>
          <div className="record-correction-grid">
            <BusinessDateTimeField name="startAt" label="Začátek jízdy" defaultValue={trip.startAt} />
            <BusinessDateTimeField name="endAt" label="Konec jízdy" defaultValue={trip.endAt} />
            <label>Počáteční km<input name="startOdometerKm" type="number" required min="0" max="10000000" step="0.01" defaultValue={trip.startOdometerKm} /></label>
            <label>Konečné km<input name="endOdometerKm" type="number" required min="0" max="10000000" step="0.01" defaultValue={trip.endOdometerKm} /></label>
          </div>
        </>}
        <div className="record-correction-grid">
          <label>Spotřeba (l)<input name="fuelConsumed" type="number" min="0" max="100000" step="0.01" defaultValue={(machine ?? trip)!.fuelConsumed ?? ""} /></label>
          <label>Tankování (l)<input name="fuelRefuelled" type="number" min="0" max="100000" step="0.01" defaultValue={(machine ?? trip)!.fuelRefuelled ?? ""} /></label>
        </div>
        <p className="record-correction-hint">Prázdné pole znamená neuvedenou hodnotu. Nula je výslovně uvedená nulová hodnota.</p>
        {machine && <fieldset className="record-correction-choices"><legend>Příslušenství tohoto stroje</legend>
          {options?.attachments.map((item) => <label key={item.id}><input type="checkbox" name="attachmentIds" value={item.id}
            defaultChecked={machine.attachmentIds.includes(item.id)} /><span>{item.code} · {item.name}{!item.isActive && " (neaktivní)"}</span></label>)}
          {options?.attachments.length === 0 && <p>Žádné příslušenství není evidováno.</p>}
        </fieldset>}
        {trip && <>
          <fieldset className="record-correction-choices"><legend>Cestující</legend>
            {options?.employees.filter((item) => target.kind === "trip" && item.id !== target.driverEmployeeId).map((item) => <label key={item.id}>
              <input type="checkbox" name="passengerEmployeeIds" value={item.id} defaultChecked={trip.passengerEmployeeIds.includes(item.id)} />
              <span>{item.displayName} · {item.employeeNumber}{!item.isActive && " (neaktivní)"}</span></label>)}
          </fieldset>
          <label htmlFor={`${titleId}-note`}>Poznámka k jízdě</label>
          <textarea id={`${titleId}-note`} name="note" maxLength={1000} defaultValue={trip.note ?? ""} />
        </>}
        <label htmlFor={`${titleId}-reason`}>Důvod opravy</label>
        <textarea id={`${titleId}-reason`} name="reason" required minLength={3} maxLength={1000} />
        <button type="submit" disabled={busy || loading || !options}>{busy ? "Ukládám…" : "Uložit auditovanou opravu"}</button>
      </fieldset>
      <button type="button" className="ghost" disabled={busy} onClick={onClose}>Zrušit</button>
    </form>
  </dialog>;
}
