import { useEffect, useState, type FormEvent } from 'react';
import type { ProjectSummary } from '@zenops/contracts';
import { businessDate } from '@zenops/contracts/time';

export function BrushcutterFuelPanel({projects,onClose}:{projects:ProjectSummary[];onClose:()=>void}) {
  const [projectId,setProjectId]=useState('');
  const [date,setDate]=useState(businessDate());
  const [consumed,setConsumed]=useState('');
  const [refuelled,setRefuelled]=useState('');
  const [note,setNote]=useState('');
  const [recorder,setRecorder]=useState('');
  const [cleared,setCleared]=useState(false);
  const [loading,setLoading]=useState(false);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [loadedKey,setLoadedKey]=useState('');
  const [reload,setReload]=useState(0);
  const key=`${projectId}:${date}`;
  useEffect(()=>{
    const controller=new AbortController();
    setLoadedKey('');setError('');setMessage('');setConsumed('');setRefuelled('');setNote('');setRecorder('');setCleared(false);
    setLoading(!!projectId&&!!date);
    if(projectId&&date) void fetch(`/api/projects/${projectId}/brushcutter-fuel?date=${date}`,{credentials:'include',signal:controller.signal})
      .then(async r=>{const body=await r.json();if(!r.ok)throw new Error(body.error??'Palivo se nepodařilo načíst.');return body;})
      .then(body=>{if(controller.signal.aborted)return;const f=body.fuelRecord;setConsumed(f?.fuelConsumed??'');setRefuelled(f?.fuelRefuelled??'');setNote(f?.note??'');setRecorder(f?.recordedByName??'');setCleared(!!f?.clearedAt);setLoadedKey(key);})
      .catch(e=>{if(!controller.signal.aborted)setError(e.message);})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[projectId,date,reload]);
  async function save(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(saving||loading||loadedKey!==key)return;
    setSaving(true);setError('');setMessage('');
    try{
      const r=await fetch(`/api/projects/${projectId}/brushcutter-fuel?date=${date}`,{method:'PUT',credentials:'include',headers:{'content-type':'application/json'},
        body:JSON.stringify({category:'BRUSHCUTTER',fuelConsumed:consumed===''?null:Number(consumed),fuelRefuelled:refuelled===''?null:Number(refuelled),note:note||null})});
      const body=await r.json();if(!r.ok){setError(body.error??'Palivo se nepodařilo uložit.');return;}
      setConsumed(body.fuelRecord?.fuelConsumed??'');setRefuelled(body.fuelRecord?.fuelRefuelled??'');setNote(body.fuelRecord?.note??'');setCleared(!!body.fuelRecord?.clearedAt);
      setRecorder('');setMessage('Palivo křovinořezů bylo uloženo.');
    }catch{setLoadedKey('');setError('Spojení selhalo. Obnovte údaje a ověřte výsledek před dalším uložením.');}
    finally{setSaving(false);}
  }
  const disabled=saving||loading||loadedKey!==key;
  return <section className="management-panel brushcutter-panel"><button className="ghost worker-back" onClick={onClose} disabled={saving}>← Zpět</button>
    <p className="eyebrow">SPOLEČNÉ PALIVO ZAKÁZKY</p><h3>Palivo křovinořezů</h3><p>Zapište celkovou spotřebu skupiny jednou za zakázku a den.</p>
    <form className="brushcutter-form" onSubmit={save}><div className="brushcutter-context">
      <label>Zakázka<select required value={projectId} disabled={saving} onChange={e=>setProjectId(e.target.value)}><option value="">Vyberte zakázku</option>{projects.filter(p=>p.status==='OPEN').map(p=><option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}</select></label>
      <label>Datum<input type="date" required value={date} disabled={saving} onChange={e=>setDate(e.target.value)}/></label></div>
      {loading&&<p role="status">Načítám palivo…</p>}{error&&<p role="alert" className="error">{error}</p>}{message&&<p role="status">{message}</p>}
      {recorder&&<p className="muted">Naposledy zapsal: {recorder}</p>}{cleared&&<p className="muted">Vykázané palivo bylo vymazáno; historie zůstává zachovaná.</p>}
      <div className="brushcutter-amounts"><label>Spotřebované palivo (l)<input type="number" inputMode="decimal" min="0" max="100000" step="0.01" value={consumed} disabled={disabled} onChange={e=>setConsumed(e.target.value)}/></label>
      <label>Natankované palivo (l)<input type="number" inputMode="decimal" min="0" max="100000" step="0.01" value={refuelled} disabled={disabled} onChange={e=>setRefuelled(e.target.value)}/></label></div>
      <label>Poznámka k palivu<textarea maxLength={1000} value={note} disabled={disabled} onChange={e=>setNote(e.target.value)} rows={3}/></label>
      <p className="form-hint">Prázdné pole = neuvedeno. Nula = skutečná nulová hodnota. Vymazáním obou čísel a uložením zrušíte vykázané palivo se zachováním historie.</p>
      <button disabled={disabled||!projectId||!date}>{saving?'Ukládám…':'Uložit palivo křovinořezů'}</button>
    </form>
    <button type="button" className="ghost" disabled={saving||loading||!projectId||!date} onClick={()=>setReload(n=>n+1)}>Obnovit údaje</button>
    {projects.filter(p=>p.status==='OPEN').length===0&&<p>Nejsou dostupné otevřené zakázky.</p>}
  </section>;
}
