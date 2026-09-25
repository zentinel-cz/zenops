import { type FormEvent, useState } from "react";

export function AssetPanel({ onChanged }: { onChanged: () => Promise<void> }) {
  const [mode, setMode] = useState<"machine" | "attachment" | null>(null);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!mode) return; setMessage("");
    const form = event.currentTarget; const data = new FormData(form);
    const response = await fetch(mode === "machine" ? "/api/assets/machines" : "/api/assets/attachments", {
      method: "POST", credentials: "include", headers: { "content-type": "application/json" },
      body: JSON.stringify(mode === "machine" ? {
        code: data.get("code"), name: data.get("name"), typeName: data.get("typeName"), tracksMth: data.get("tracked") === "on",
      } : {
        code: data.get("code"), name: data.get("name"), typeName: data.get("typeName"), uniquelyTracked: data.get("tracked") === "on",
      }),
    });
    if (!response.ok) { const body = await response.json().catch(() => ({ error: "Uložení se nezdařilo." })) as { error?: string }; setMessage(body.error ?? "Uložení se nezdařilo."); return; }
    form.reset(); setMode(null); setMessage("Položka katalogu byla vytvořena."); await onChanged();
  }

  return <section className="management-panel"><div className="section-heading"><div><p className="eyebrow">PROVOZNÍ PROSTŘEDKY</p><h3>Stroje a příslušenství</h3></div><div className="button-group"><button className="inline-action" onClick={() => setMode("machine")}>Nový stroj</button><button className="inline-action secondary" onClick={() => setMode("attachment")}>Nové příslušenství</button></div></div>{message && <p className="form-message">{message}</p>}{mode && <form className="asset-form" onSubmit={submit}><label>Kód<input name="code" required maxLength={40} /></label><label>Název<input name="name" required maxLength={160} /></label><label>Typ<input name="typeName" required maxLength={100} /></label><label className="checkbox"><input name="tracked" type="checkbox" defaultChecked /> {mode === "machine" ? "Sleduje MTH" : "Unikátně sledované"}</label><button>Vytvořit</button><button type="button" className="ghost" onClick={() => setMode(null)}>Zrušit</button></form>}</section>;
}
