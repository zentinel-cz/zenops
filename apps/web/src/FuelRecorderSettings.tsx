import { useEffect, useState, type FormEvent } from 'react';

export function FuelRecorderSettings() {
  const [settings,setSettings]=useState<{version:number;employeeId:string|null;displayName:string|null;active:boolean}|null>(null);
  const [workers,setWorkers]=useState<Array<{id:string;displayName:string;employeeNumber:string}>>([]);
  const [employeeId,setEmployeeId]=useState('');
  const [reason,setReason]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  async function load() {
    setBusy(true);setError('');setMessage('');
    try {
      const [s,e]=await Promise.all([fetch('/api/settings/fuel-recorder',{credentials:'include'}),fetch('/api/employees',{credentials:'include'})]);
      if(!s.ok||!e.ok) throw new Error('Nastavení se nepodařilo načíst.');
      const current=(await s.json()).settings;
      setSettings(current);setEmployeeId(current.employeeId??'');
      setWorkers((await e.json()).employees.filter((worker:{isActive:boolean;roles:string[]})=>worker.isActive&&worker.roles.includes('WORKER')));
    } catch {setError('Nastavení se nepodařilo načíst. Zkuste ho obnovit.');}
    finally {setBusy(false);}
  }
  useEffect(()=>{void load();},[]);
  async function save(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();if(!settings||busy)return;
    setBusy(true);setError('');setMessage('');
    try {
      const response=await fetch('/api/settings/fuel-recorder',{method:'PUT',credentials:'include',headers:{'content-type':'application/json'},
        body:JSON.stringify({employeeId:employeeId||null,expectedVersion:settings.version,reason})});
      const body=await response.json();
      if(!response.ok){setError(body.error??'Nastavení se nepodařilo uložit.');return;}
      setSettings(body.settings);setReason('');setMessage('Odpovědný pracovník byl uložen. Původní záznamy zůstávají zachované.');
    } catch {setError('Spojení selhalo. Obnovte nastavení a ověřte výsledek před dalším uložením.');}
    finally{setBusy(false);}
  }
  return <section className="management-panel fuel-recorder-settings"><p className="eyebrow">ODPOVĚDNOST ZA PALIVO</p><h3>Palivo křovinořezů</h3>
    <p>Vyberte jednoho pracovníka, který zapisuje společnou spotřebu a tankování za zakázku a den. Vedoucí údaje pouze čte; Admin může provádět opravy.</p>
    {settings?.employeeId&&!settings.active&&<p role="status">Přiřazený účet není aktivní nebo už nemá roli Pracovník. Vyberte náhradu.</p>}
    {error&&<p role="alert" className="error">{error}</p>}{message&&<p role="status">{message}</p>}
    {settings&&<form className="fuel-recorder-form" onSubmit={save}><label>Odpovědný pracovník<select value={employeeId} onChange={e=>setEmployeeId(e.target.value)} disabled={busy}>
      <option value="">Nikdo – zapisuje pouze Admin</option>
      {settings.employeeId&&!workers.some(w=>w.id===settings.employeeId)&&<option value={settings.employeeId} disabled>{settings.displayName} (nedostupný účet)</option>}
      {workers.map(w=><option key={w.id} value={w.id}>{w.displayName} · {w.employeeNumber}</option>)}</select></label>
      <label>Důvod změny<input value={reason} onChange={e=>setReason(e.target.value)} minLength={3} maxLength={500} required disabled={busy}/></label>
      <button disabled={busy}>{busy?'Ukládám…':'Uložit odpovědného pracovníka'}</button></form>}
    <button className="ghost" disabled={busy} onClick={()=>void load()}>Obnovit odpovědnost</button>
  </section>;
}
