import { useEffect, useState, type FormEvent } from "react";
import type { ShiftPreset } from "@zenops/contracts";
import { shiftLabel } from "@zenops/contracts/labels";

export function SettingsPanel() {
  const [settings, setSettings] = useState<{version:number;presets:ShiftPreset[]} | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function load() {
    setLoading(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/settings/shift-presets", {credentials:"include"});
      if (!response.ok) throw new Error();
      setSettings((await response.json()).settings);
    } catch { setError("Nastavení se nepodařilo načíst. Zkuste ho obnovit."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  async function save(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!settings || saving) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setSaving(true); setError(""); setMessage("");
    try {
      const presets = settings.presets.map(preset => ({shiftType:preset.shiftType,
        startTime:data.get(`${preset.shiftType}-start`) || null, endTime:data.get(`${preset.shiftType}-end`) || null}));
      const response = await fetch("/api/settings/shift-presets", {method:"PUT",credentials:"include",
        headers:{"content-type":"application/json"},body:JSON.stringify({expectedVersion:settings.version,presets,reason:data.get("reason")})});
      const body = await response.json();
      if (!response.ok) { setError(body.error ?? "Nastavení se nepodařilo uložit."); return; }
      setSettings(body.settings); setMessage("Předvolby směn byly uloženy. Existující záznamy se nemění.");
      (form.elements.namedItem("reason") as HTMLInputElement).value = "";
    } catch { setError("Nepodařilo se spojit se serverem. Před dalším uložením ověřte aktuální nastavení."); }
    finally { setSaving(false); }
  }
  return <section className="management-panel"><h3>Nastavení směn</h3>
    <p>Časy v pásmu Europe/Prague se předvyplní při zadávání nové práce. Pracovník je může upravit podle skutečnosti.</p>
    <p>Prázdná dvojice znamená aktuální hodinu ve zvoleném dni. Konec před začátkem znamená konec následující den.</p>
    {loading && <p role="status">Načítám nastavení…</p>}
    {error && <p className="error" role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    {settings && !loading && <form className="shift-settings-form" key={settings.version} onSubmit={save}>
      {settings.presets.map(preset => <fieldset key={preset.shiftType}><legend>{shiftLabel(preset.shiftType)}</legend>
        <label>Začátek směny<input type="time" name={`${preset.shiftType}-start`} defaultValue={preset.startTime ?? ""} disabled={saving} /></label>
        <label>Konec směny<input type="time" name={`${preset.shiftType}-end`} defaultValue={preset.endTime ?? ""} disabled={saving} /></label>
      </fieldset>)}
      <label>Důvod změny<input name="reason" required minLength={3} maxLength={500} disabled={saving} /></label>
      <button disabled={saving}>{saving ? "Ukládám…" : "Uložit předvolby směn"}</button>
    </form>}
    <button type="button" className="ghost" disabled={saving || loading} onClick={()=>void load()}>Obnovit nastavení</button>
  </section>;
}
