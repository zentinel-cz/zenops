import { useId } from "react";

export function ListSearch({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  const id = useId();
  return <div className="list-search"><label htmlFor={id}>{label}</label><input id={id} type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Hledat…" /></div>;
}

export function matchesSearch(query: string, ...values: Array<string | number | null | undefined>) {
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("cs-CZ");
  const needles = normalize(query.trim()).split(/\s+/).filter(Boolean);
  const haystack = normalize(values.map((value) => String(value ?? "")).join(" "));
  return needles.length === 0 || needles.every((needle) => haystack.includes(needle));
}
