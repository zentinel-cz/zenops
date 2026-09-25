import { type FormEvent, useEffect, useState } from "react";

type AssetLists = {
  machines: Array<{ id: string; code: string; name: string; typeName: string }>;
  attachments: Array<{ id: string; code: string; name: string; typeName: string }>;
  vehicles: Array<{ id: string; code: string; name: string; registrationNumber: string }>;
};

export function AssetPanel({ onChanged }: { onChanged: () => Promise<void> }) {
  const [mode, setMode] = useState<"machine" | "attachment" | "vehicle" | null>(null);
  const [message, setMessage] = useState("");
  const [assets, setAssets] = useState<AssetLists>({ machines: [], attachments: [], vehicles: [] });

  const load = () => fetch("/api/assets", { credentials: "include" })
    .then(async (response) => response.ok ? response.json() as Promise<AssetLists> : Promise.reject())
    .then((body) => setAssets(body));
  useEffect(() => { void load().catch(() => setMessage("Seznam techniky se nepodařilo načíst.")); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!mode) return; setMessage("");
    const form = event.currentTarget; const data = new FormData(form);
    const endpoint = mode === "machine" ? "/api/assets/machines" : mode === "attachment" ? "/api/assets/attachments" : "/api/assets/vehicles";
    const response = await fetch(endpoint, {
      method: "POST", credentials: "include", headers: { "content-type": "application/json" },
      body: JSON.stringify(mode === "machine" ? {
        code: data.get("code"), name: data.get("name"), typeName: data.get("typeName"), tracksMth: data.get("tracked") === "on",
      } : mode === "attachment" ? {
        code: data.get("code"), name: data.get("name"), typeName: data.get("typeName"), uniquelyTracked: data.get("tracked") === "on",
      } : {
        code: data.get("code"), name: data.get("name"), registrationNumber: data.get("registrationNumber"),
      }),
    });
    if (!response.ok) { const body = await response.json().catch(() => ({ error: "Uložení se nezdařilo." })) as { error?: string }; setMessage(body.error ?? "Uložení se nezdařilo."); return; }
    form.reset(); setMode(null); setMessage("Položka katalogu byla vytvořena."); await Promise.all([onChanged(), load()]);
  }

  return <section className="management-panel"><div className="section-heading"><div><p className="eyebrow">PROVOZNÍ PROSTŘEDKY</p><h3>Technika a příslušenství</h3></div><div className="button-group"><button className="inline-action" onClick={() => setMode("machine")}>Nový stroj</button><button className="inline-action secondary" onClick={() => setMode("attachment")}>Nové příslušenství</button><button className="inline-action secondary" onClick={() => setMode("vehicle")}>Nové vozidlo</button></div></div>{message && <p className="form-message">{message}</p>}{mode && <form className="asset-form" onSubmit={submit}><label>Kód<input name="code" required maxLength={40} /></label><label>Název<input name="name" required maxLength={160} /></label>{mode === "vehicle" ? <label>SPZ<input name="registrationNumber" required maxLength={20} /></label> : <><label>Typ<input name="typeName" required maxLength={100} /></label><label className="checkbox"><input name="tracked" type="checkbox" defaultChecked /> {mode === "machine" ? "Sleduje MTH" : "Unikátně sledované"}</label></>}<button>Vytvořit</button><button type="button" className="ghost" onClick={() => setMode(null)}>Zrušit</button></form>}<div className="asset-lists"><AssetList title="Stroje" items={assets.machines.map((item) => ({ ...item, detail: item.typeName }))} /><AssetList title="Příslušenství" items={assets.attachments.map((item) => ({ ...item, detail: item.typeName }))} /><AssetList title="Vozidla" items={assets.vehicles.map((item) => ({ ...item, detail: item.registrationNumber }))} /></div></section>;
}

function AssetList({ title, items }: { title: string; items: Array<{ id: string; code: string; name: string; detail: string }> }) {
  return <div><div className="asset-list-title"><strong>{title}</strong><span>{items.length}</span></div>{items.length === 0 ? <p className="muted">Zatím bez položek.</p> : <ul>{items.map((item) => <li key={item.id}><strong>{item.code}</strong><span>{item.name}</span><small>{item.detail}</small></li>)}</ul>}</div>;
}
