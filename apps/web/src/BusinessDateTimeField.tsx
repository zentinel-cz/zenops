import { businessDateTimeCandidates, businessDateTimeInput, resolveBusinessDateTime } from "@zenops/contracts/time";
import { useState } from "react";

export function BusinessDateTimeField({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string | undefined }) {
  const initial = defaultValue ? businessDateTimeInput(defaultValue) : "";
  const [value, setValue] = useState(initial);
  const [occurrence, setOccurrence] = useState(() => {
    const candidates = businessDateTimeCandidates(initial);
    return defaultValue && candidates.length > 1 ? (Date.parse(defaultValue) >= Date.parse(candidates[1]!) ? "later" : "earlier") : "";
  });
  const candidates = businessDateTimeCandidates(value);
  return <label>{label} (Europe/Prague)
    <input name={name} type="datetime-local" value={value} required onChange={(event) => { setValue(event.target.value); setOccurrence(""); }} />
    {value && candidates.length === 0 && <small role="alert">Tento čas neexistuje. Zkontrolujte změnu letního času.</small>}
    {candidates.length > 1 && <select name={`${name}Occurrence`} aria-label={`${label}: výskyt opakované hodiny`} required value={occurrence} onChange={(event) => setOccurrence(event.target.value)}>
      <option value="">Vyberte výskyt opakované hodiny</option>
      <option value="earlier">První výskyt (letní čas UTC+02:00)</option>
      <option value="later">Druhý výskyt (zimní čas UTC+01:00)</option>
    </select>}
  </label>;
}

export function readBusinessDateTime(data: FormData, name: string): string {
  return resolveBusinessDateTime(String(data.get(name) ?? ""), String(data.get(`${name}Occurrence`) ?? ""));
}
