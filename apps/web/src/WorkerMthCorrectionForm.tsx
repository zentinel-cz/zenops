import type { MachineUsageSummary } from "@zenops/contracts";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { useMutation } from "./useMutation";

export function WorkerMthCorrectionForm({ workDayId, entryId, usage, onClose, onSaved }: {
  workDayId: string; entryId: string; usage: MachineUsageSummary; onClose: () => void; onSaved: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [message,setMessage] = useState("");
  const {busy,runMutation} = useMutation(setMessage);
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  },[]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await runMutation(async () => {
      setMessage("");
      const startMth = Number(data.get("startMth"));
      const endMth = Number(data.get("endMth"));
      const reason = String(data.get("reason") ?? "").trim();
      if (endMth < startMth) { setMessage("Konečný MTH nesmí být nižší než počáteční."); return; }
      if (reason.length < 3) { setMessage("Uveďte důvod opravy alespoň o 3 znacích."); return; }
      const response = await fetch(`/api/workdays/${workDayId}/entries/${entryId}/machine/${usage.id}/mth`, {
        method:"PATCH",credentials:"include",headers:{"content-type":"application/json"},
        body:JSON.stringify({startMth,endMth,reason}),
      });
      if (!response.ok) {
        const body = await response.json().catch(()=>({})) as {error?:string};
        setMessage(body.error ?? "Oprava se nezdařila. Zadané hodnoty zůstaly zachované."); return;
      }
      onSaved();
    });
  }
  return <dialog ref={dialog} className="record-correction-dialog" aria-labelledby={titleId}
    onCancel={event=>{event.preventDefault();if(!busy)onClose();}}>
    <div className="record-correction-heading"><div><p className="eyebrow">OPRAVA VLASTNÍ PRÁCE</p>
      <h3 id={titleId}>Opravit MTH · {usage.machineCode}</h3></div>
      <button type="button" className="ghost" aria-label="Zavřít opravu MTH" disabled={busy} onClick={onClose}>×</button></div>
    <p className="record-correction-context">{usage.machineName}<br />Původní MTH: {usage.startMth ?? "Neuvedeno"} – {usage.endMth ?? "Neuvedeno"}</p>
    <p className="record-correction-hint">Uveďte správné hodnoty a důvod opravy. Původní údaje zůstanou v historii.
      Vrácený den po opravě znovu odešlete vedoucímu.</p>
    {message && <p className="error" role="alert">{message}</p>}
    <form onSubmit={submit}><fieldset className="record-correction-fields" disabled={busy}>
      <div className="record-correction-grid">
        <label>Počáteční MTH<input name="startMth" type="number" required min="0" max="10000000" step="0.01" defaultValue={usage.startMth ?? ""} /></label>
        <label>Konečný MTH<input name="endMth" type="number" required min="0" max="10000000" step="0.01" defaultValue={usage.endMth ?? ""} /></label>
      </div>
      <label htmlFor={`${titleId}-reason`}>Důvod opravy</label>
      <textarea id={`${titleId}-reason`} name="reason" required minLength={3} maxLength={1000} />
      <button disabled={busy}>{busy ? "Ukládám…" : "Uložit opravu MTH"}</button>
    </fieldset><button type="button" className="ghost" disabled={busy} onClick={onClose}>Zrušit</button></form>
  </dialog>;
}
