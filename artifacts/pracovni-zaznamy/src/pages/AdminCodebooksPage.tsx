import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListWorkers, useCreateWorker, useUpdateWorker, useDeleteWorker, getListWorkersQueryKey,
  useListContractorCompanies, useCreateContractorCompany, useUpdateContractorCompany, useDeleteContractorCompany, getListContractorCompaniesQueryKey,
  useListVehicles, useCreateVehicle, useUpdateVehicle, useDeleteVehicle, getListVehiclesQueryKey,
  useListMachines, useCreateMachine, useUpdateMachine, useDeleteMachine, getListMachinesQueryKey,
  useListAccessories, useCreateAccessory, useUpdateAccessory, useDeleteAccessory, getListAccessoriesQueryKey,
  useListRegions, useCreateRegion, useUpdateRegion, useDeleteRegion, getListRegionsQueryKey,
  useListWeatherTypes, useCreateWeatherType, useUpdateWeatherType, useDeleteWeatherType, getListWeatherTypesQueryKey,
} from "@workspace/api-client-react";

type Tab = "pracovnici" | "subdodavatele" | "auta" | "stroje" | "prislusenstvi" | "kraje" | "pocasi";

const tabs: { key: Tab; label: string; icon: string }[] = [
  { key: "pracovnici", label: "Pracovníci", icon: "👷" },
  { key: "subdodavatele", label: "Subdodavatelé", icon: "🏢" },
  { key: "auta", label: "Auta", icon: "🚗" },
  { key: "stroje", label: "Stroje", icon: "🚜" },
  { key: "prislusenstvi", label: "Příslušenství", icon: "🔧" },
  { key: "kraje", label: "Kraje / Revíry", icon: "🗺️" },
  { key: "pocasi", label: "Počasí", icon: "☀️" },
];

export default function AdminCodebooksPage() {
  const [tab, setTab] = useState<Tab>("pracovnici");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">Číselníky</h1>
        <p className="text-sm text-muted-foreground mt-1">Správa hodnot pro výběrová pole ve formulářích</p>
      </div>

      <div className="flex gap-1 flex-wrap border-b border-border overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {tab === "pracovnici" && <WorkersTab />}
        {tab === "subdodavatele" && <ContractorCompaniesTab />}
        {tab === "auta" && <VehiclesTab />}
        {tab === "stroje" && <MachinesTab />}
        {tab === "prislusenstvi" && <AccessoriesTab />}
        {tab === "kraje" && <RegionsTab />}
        {tab === "pocasi" && <WeatherTab />}
      </div>
    </div>
  );
}

function ContractorCompaniesTab() {
  const queryClient = useQueryClient();
  const { data: companies, isLoading } = useListContractorCompanies();
  const createMutation = useCreateContractorCompany();
  const updateMutation = useUpdateContractorCompany();
  const deleteMutation = useDeleteContractorCompany();
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", companyId: "", note: "", isActive: true });
  const [error, setError] = useState("");
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListContractorCompaniesQueryKey() });
  const reset = () => { setForm({ name: "", companyId: "", note: "", isActive: true }); setError(""); };
  const openEdit = (id: number) => { const company = companies?.find((item) => item.id === id); if (!company) return; setForm({ name: company.name, companyId: company.companyId ?? "", note: company.note ?? "", isActive: company.isActive }); setEditId(id); };
  const save = async (event: React.FormEvent, id?: number) => {
    event.preventDefault(); setError("");
    if (!form.name.trim()) { setError("Název firmy je povinný"); return; }
    try {
      const data = { name: form.name.trim(), companyId: form.companyId.trim() || null, note: form.note.trim() || null, isActive: form.isActive };
      if (id) await updateMutation.mutateAsync({ id, data }); else await createMutation.mutateAsync({ data });
      await invalidate(); reset(); setShowAdd(false); setEditId(null);
    } catch { setError("Firmu se nepodařilo uložit"); }
  };
  const fields = <><div><label className={labelClass}>Název firmy *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} required /></div><div><label className={labelClass}>IČO</label><input value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })} className={inputClass} /></div><div><label className={labelClass}>Poznámka</label><input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={inputClass} /></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />Aktivní</label></>;
  return <div className="space-y-4"><div className="flex justify-between items-center"><p className="text-sm text-muted-foreground">{companies?.length ?? 0} firem</p><button onClick={() => { reset(); setShowAdd(true); }} className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm font-medium">+ Přidat firmu</button></div>
    {showAdd && <div className="bg-card border border-primary/30 rounded-lg p-4"><h3 className="font-semibold mb-3">Nová subdodavatelská firma</h3>{error && <p className="text-destructive text-xs mb-2">{error}</p>}<form onSubmit={(e) => void save(e)} className="grid sm:grid-cols-2 gap-3">{fields}<div className="sm:col-span-2 flex gap-2"><button className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm">Uložit</button><button type="button" onClick={() => { setShowAdd(false); reset(); }} className="px-4 py-2 border rounded text-sm">Zrušit</button></div></form></div>}
    <CodebookTable items={companies?.map((company) => ({ id: company.id, name: company.name, subtitle: [company.companyId ? `IČO ${company.companyId}` : "", company.note].filter(Boolean).join(" • ") || undefined, isActive: company.isActive })) ?? []} isLoading={isLoading} onEdit={openEdit} onToggle={async (id, isActive) => { const company = companies?.find((item) => item.id === id); if (!company) return; await updateMutation.mutateAsync({ id, data: { name: company.name, companyId: company.companyId, note: company.note, isActive: !isActive } }); await invalidate(); }} onDelete={async (id) => { try { await deleteMutation.mutateAsync({ id }); await invalidate(); } catch { alert("Firmu nelze smazat, pokud má přiřazené pracovníky."); } }} emptyMessage="Žádné subdodavatelské firmy." />
    {editId !== null && <EditModal title="Upravit subdodavatelskou firmu" onClose={() => { setEditId(null); reset(); }}>{error && <p className="text-destructive text-xs mb-2">{error}</p>}<form onSubmit={(e) => void save(e, editId)} className="space-y-3">{fields}<div className="flex gap-2"><button className="flex-1 py-2 bg-primary text-primary-foreground rounded text-sm">Uložit změny</button><button type="button" onClick={() => { setEditId(null); reset(); }} className="px-4 py-2 border rounded text-sm">Zrušit</button></div></form></EditModal>}
  </div>;
}

interface EditModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

function EditModal({ title, onClose, children }: EditModalProps) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-card border border-card-border rounded-lg shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

const inputClass = "w-full px-3 py-2 border border-input rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm";
const labelClass = "block text-sm font-medium text-foreground mb-1";

interface CodebookItem {
  id: number;
  name: string;
  subtitle?: string;
  badge?: string;
  isActive: boolean;
}

interface CodebookTableProps {
  items: CodebookItem[];
  isLoading?: boolean;
  onEdit: (id: number) => void;
  onToggle: (id: number, isActive: boolean) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  emptyMessage?: string;
}

function CodebookTable({ items, isLoading, onEdit, onToggle, onDelete, emptyMessage = "Žádné záznamy" }: CodebookTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-14 bg-card border border-card-border rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="bg-card border border-card-border rounded-lg p-8 text-center text-muted-foreground text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="bg-card border border-card-border rounded-lg divide-y divide-border overflow-hidden">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-3 px-4 py-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-foreground">{item.name}</p>
              {item.badge && (
                <span className="px-1.5 py-0.5 rounded text-xs bg-secondary text-secondary-foreground font-medium">
                  {item.badge}
                </span>
              )}
              <span className={`text-xs font-medium ${item.isActive ? "text-green-600" : "text-muted-foreground"}`}>
                {item.isActive ? "Aktivní" : "Neaktivní"}
              </span>
            </div>
            {item.subtitle && <p className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</p>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onEdit(item.id)}
              className="px-2 py-1 text-xs text-primary border border-primary/30 rounded hover:bg-primary/5 transition-colors"
            >
              Upravit
            </button>
            <button
              onClick={() => onToggle(item.id, item.isActive)}
              className="px-2 py-1 text-xs border border-border rounded hover:bg-accent/50 transition-colors text-muted-foreground"
            >
              {item.isActive ? "Deakt." : "Aktivovat"}
            </button>
            <button
              onClick={() => { if (confirm("Smazat tento záznam?")) onDelete(item.id); }}
              className="px-2 py-1 text-xs text-destructive border border-destructive/30 rounded hover:bg-destructive/5 transition-colors"
            >
              Smazat
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function WorkersTab() {
  const queryClient = useQueryClient();
  const { data: workers, isLoading } = useListWorkers();
  const { data: contractorCompanies } = useListContractorCompanies();
  const createMutation = useCreateWorker();
  const updateMutation = useUpdateWorker();
  const deleteMutation = useDeleteWorker();
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ firstName: "", lastName: "", note: "", isActive: true, defaultBrushcutter: false, defaultSlopeMower: false, contractorCompanyId: null as number | null, defaultSubcontractor: false });
  const [error, setError] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListWorkersQueryKey() });

  const openEdit = (id: number) => {
    const w = workers?.find((x) => x.id === id);
    if (!w) return;
    setForm({ firstName: w.firstName, lastName: w.lastName, note: w.note ?? "", isActive: w.isActive, defaultBrushcutter: w.defaultBrushcutter, defaultSlopeMower: w.defaultSlopeMower, contractorCompanyId: w.contractorCompanyId ?? null, defaultSubcontractor: w.defaultSubcontractor });
    setEditId(id);
  };

  const resetForm = () => { setForm({ firstName: "", lastName: "", note: "", isActive: true, defaultBrushcutter: false, defaultSlopeMower: false, contractorCompanyId: null, defaultSubcontractor: false }); setError(""); };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (!form.firstName.trim() || !form.lastName.trim()) { setError("Jméno a příjmení jsou povinné"); return; }
    try {
      await createMutation.mutateAsync({ data: { firstName: form.firstName.trim(), lastName: form.lastName.trim(), note: form.note.trim() || undefined, isActive: form.isActive, defaultBrushcutter: form.contractorCompanyId ? false : form.defaultBrushcutter, defaultSlopeMower: form.contractorCompanyId ? false : form.defaultSlopeMower, contractorCompanyId: form.contractorCompanyId, defaultSubcontractor: Boolean(form.contractorCompanyId && form.defaultSubcontractor) } });
      await invalidate(); resetForm(); setShowAdd(false);
    } catch { setError("Chyba při ukládání"); }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (!editId || !form.firstName.trim() || !form.lastName.trim()) { setError("Jméno a příjmení jsou povinné"); return; }
    try {
      await updateMutation.mutateAsync({ id: editId, data: { firstName: form.firstName.trim(), lastName: form.lastName.trim(), note: form.note.trim() || undefined, isActive: form.isActive, defaultBrushcutter: form.contractorCompanyId ? false : form.defaultBrushcutter, defaultSlopeMower: form.contractorCompanyId ? false : form.defaultSlopeMower, contractorCompanyId: form.contractorCompanyId, defaultSubcontractor: Boolean(form.contractorCompanyId && form.defaultSubcontractor) } as never });
      await invalidate(); setEditId(null); resetForm();
    } catch { setError("Chyba při ukládání"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{workers?.filter((w) => w.isActive !== false).length ?? 0} záznamů</p>
        <button onClick={() => { resetForm(); setShowAdd(true); }} className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm font-medium hover:opacity-90">
          + Přidat pracovníka
        </button>
      </div>

      {showAdd && (
        <div className="bg-card border border-primary/30 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Nový pracovník</h3>
          {error && <p className="text-destructive text-xs mb-2">{error}</p>}
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Jméno *</label>
              <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className={inputClass} placeholder="Jan" required />
            </div>
            <div>
              <label className={labelClass}>Příjmení *</label>
              <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className={inputClass} placeholder="Novák" required />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Poznámka</label>
              <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={inputClass} placeholder="Volitelná poznámka" />
            </div>
            <div className="sm:col-span-2"><label className={labelClass}>Zařazení pracovníka</label><select value={form.contractorCompanyId ?? ""} onChange={(e) => setForm({ ...form, contractorCompanyId: e.target.value ? Number(e.target.value) : null, defaultSubcontractor: false })} className={inputClass}><option value="">Kmenový pracovník</option>{(contractorCompanies ?? []).filter((company) => company.isActive).map((company) => <option key={company.id} value={company.id}>Subdodavatel: {company.name}</option>)}</select></div>
            {!form.contractorCompanyId ? <><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.defaultBrushcutter} onChange={(e) => setForm({ ...form, defaultBrushcutter: e.target.checked })} />Výchozí pro křovinořezy</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.defaultSlopeMower} onChange={(e) => setForm({ ...form, defaultSlopeMower: e.target.checked })} />Výchozí pro svahové sekačky</label></> : <label className="sm:col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.defaultSubcontractor} onChange={(e) => setForm({ ...form, defaultSubcontractor: e.target.checked })} />Výchozí pracovník této firmy</label>}
            <div className="sm:col-span-2 flex gap-2">
              <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:opacity-90 disabled:opacity-60">
                {createMutation.isPending ? "Ukládám..." : "Uložit"}
              </button>
              <button type="button" onClick={() => { setShowAdd(false); resetForm(); }} className="px-4 py-2 bg-secondary text-secondary-foreground border border-border rounded text-sm font-medium">Zrušit</button>
            </div>
          </form>
        </div>
      )}

      <CodebookTable
        items={workers?.filter((w) => w.isActive !== false).map((w) => ({ id: w.id, name: `${w.firstName} ${w.lastName}`, subtitle: [w.contractorCompanyId ? `Firma: ${contractorCompanies?.find((company) => company.id === w.contractorCompanyId)?.name ?? "neznámá"}` : "Kmenový pracovník", w.note, w.defaultBrushcutter ? "Křovinořezy" : "", w.defaultSlopeMower ? "Svahové sekačky" : "", w.defaultSubcontractor ? "Výchozí pro firmu" : ""].filter(Boolean).join(" • ") || undefined, isActive: w.isActive })) ?? []}
        isLoading={isLoading}
        onEdit={openEdit}
        onToggle={async (id, isActive) => { const worker = workers?.find((item) => item.id === id); if (!worker) return; await updateMutation.mutateAsync({ id, data: { firstName: worker.firstName, lastName: worker.lastName, isActive: !isActive } as never }); await invalidate(); }}
        onDelete={async (id) => { await deleteMutation.mutateAsync({ id }); await invalidate(); }}
        emptyMessage="Žádní pracovníci. Přidejte prvního."
      />

      {editId !== null && (
        <EditModal title="Upravit pracovníka" onClose={() => { setEditId(null); resetForm(); }}>
          {error && <p className="text-destructive text-xs mb-3">{error}</p>}
          <form onSubmit={handleUpdate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Jméno *</label>
                <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className={inputClass} required />
              </div>
              <div>
                <label className={labelClass}>Příjmení *</label>
                <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className={inputClass} required />
              </div>
            </div>
            <div>
              <label className={labelClass}>Poznámka</label>
              <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={inputClass} />
            </div>
            <div><label className={labelClass}>Zařazení pracovníka</label><select value={form.contractorCompanyId ?? ""} onChange={(e) => setForm({ ...form, contractorCompanyId: e.target.value ? Number(e.target.value) : null, defaultSubcontractor: false })} className={inputClass}><option value="">Kmenový pracovník</option>{(contractorCompanies ?? []).filter((company) => company.isActive).map((company) => <option key={company.id} value={company.id}>Subdodavatel: {company.name}</option>)}</select></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="worker-active" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
              <label htmlFor="worker-active" className="text-sm text-foreground">Aktivní</label>
            </div>
            {!form.contractorCompanyId ? <><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.defaultBrushcutter} onChange={(e) => setForm({ ...form, defaultBrushcutter: e.target.checked })} />Výchozí pro křovinořezy</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.defaultSlopeMower} onChange={(e) => setForm({ ...form, defaultSlopeMower: e.target.checked })} />Výchozí pro svahové sekačky</label></> : <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.defaultSubcontractor} onChange={(e) => setForm({ ...form, defaultSubcontractor: e.target.checked })} />Výchozí pracovník této firmy</label>}
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={updateMutation.isPending} className="flex-1 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:opacity-90 disabled:opacity-60">
                {updateMutation.isPending ? "Ukládám..." : "Uložit změny"}
              </button>
              <button type="button" onClick={() => { setEditId(null); resetForm(); }} className="px-4 py-2 bg-secondary text-secondary-foreground border border-border rounded text-sm font-medium">Zrušit</button>
            </div>
          </form>
        </EditModal>
      )}
    </div>
  );
}

function VehiclesTab() {
  const queryClient = useQueryClient();
  const { data: vehicles, isLoading } = useListVehicles();
  const createMutation = useCreateVehicle();
  const updateMutation = useUpdateVehicle();
  const deleteMutation = useDeleteVehicle();
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", licensePlate: "", note: "", isActive: true, defaultSlopeMower: false });
  const [error, setError] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListVehiclesQueryKey() });

  const openEdit = (id: number) => {
    const v = vehicles?.find((x) => x.id === id);
    if (!v) return;
    setForm({ name: v.name, licensePlate: v.licensePlate ?? "", note: v.note ?? "", isActive: v.isActive, defaultSlopeMower: v.defaultSlopeMower });
    setEditId(id);
  };

  const resetForm = () => { setForm({ name: "", licensePlate: "", note: "", isActive: true, defaultSlopeMower: false }); setError(""); };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (!form.name.trim()) { setError("Název je povinný"); return; }
    try {
      await createMutation.mutateAsync({ data: { name: form.name.trim(), licensePlate: form.licensePlate.trim() || undefined, note: form.note.trim() || undefined, isActive: form.isActive, defaultSlopeMower: form.defaultSlopeMower } });
      await invalidate(); resetForm(); setShowAdd(false);
    } catch { setError("Chyba při ukládání"); }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (!editId || !form.name.trim()) { setError("Název je povinný"); return; }
    try {
      await updateMutation.mutateAsync({ id: editId, data: { name: form.name.trim(), licensePlate: form.licensePlate.trim() || undefined, note: form.note.trim() || undefined, isActive: form.isActive, defaultSlopeMower: form.defaultSlopeMower } as never });
      await invalidate(); setEditId(null); resetForm();
    } catch { setError("Chyba při ukládání"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{vehicles?.filter((v) => v.isActive !== false).length ?? 0} záznamů</p>
        <button onClick={() => { resetForm(); setShowAdd(true); }} className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm font-medium hover:opacity-90">
          + Přidat auto
        </button>
      </div>

      {showAdd && (
        <div className="bg-card border border-primary/30 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Nové auto / vozidlo</h3>
          {error && <p className="text-destructive text-xs mb-2">{error}</p>}
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className={labelClass}>Název vozidla *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="Traktor Zetor 7745" required />
            </div>
            <div>
              <label className={labelClass}>SPZ</label>
              <input value={form.licensePlate} onChange={(e) => setForm({ ...form, licensePlate: e.target.value })} className={inputClass} placeholder="1AB 2345" />
            </div>
            <div>
              <label className={labelClass}>Poznámka</label>
              <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={inputClass} placeholder="Volitelně" />
            </div>
            <label className="sm:col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.defaultSlopeMower} onChange={(e) => setForm({ ...form, defaultSlopeMower: e.target.checked })} />Výchozí auto pro svahové sekačky</label>
            <div className="sm:col-span-2 flex gap-2">
              <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:opacity-90 disabled:opacity-60">
                {createMutation.isPending ? "Ukládám..." : "Uložit"}
              </button>
              <button type="button" onClick={() => { setShowAdd(false); resetForm(); }} className="px-4 py-2 bg-secondary text-secondary-foreground border border-border rounded text-sm font-medium">Zrušit</button>
            </div>
          </form>
        </div>
      )}

      <CodebookTable
        items={vehicles?.filter((v) => v.isActive !== false).map((v) => ({ id: v.id, name: v.name, subtitle: [v.licensePlate, v.note, v.defaultSlopeMower ? "Výchozí pro svahové sekačky" : ""].filter(Boolean).join(" • ") || undefined, isActive: v.isActive })) ?? []}
        isLoading={isLoading}
        onEdit={openEdit}
        onToggle={async (id, isActive) => { await updateMutation.mutateAsync({ id, data: { name: "", isActive: !isActive } as never }); await invalidate(); }}
        onDelete={async (id) => { await deleteMutation.mutateAsync({ id }); await invalidate(); }}
        emptyMessage="Žádná vozidla. Přidejte první."
      />

      {editId !== null && (
        <EditModal title="Upravit vozidlo" onClose={() => { setEditId(null); resetForm(); }}>
          {error && <p className="text-destructive text-xs mb-3">{error}</p>}
          <form onSubmit={handleUpdate} className="space-y-3">
            <div>
              <label className={labelClass}>Název *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>SPZ</label>
                <input value={form.licensePlate} onChange={(e) => setForm({ ...form, licensePlate: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Poznámka</label>
                <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={inputClass} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="vehicle-active" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
              <label htmlFor="vehicle-active" className="text-sm text-foreground">Aktivní</label>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.defaultSlopeMower} onChange={(e) => setForm({ ...form, defaultSlopeMower: e.target.checked })} />Výchozí auto pro svahové sekačky</label>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={updateMutation.isPending} className="flex-1 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:opacity-90 disabled:opacity-60">
                {updateMutation.isPending ? "Ukládám..." : "Uložit změny"}
              </button>
              <button type="button" onClick={() => { setEditId(null); resetForm(); }} className="px-4 py-2 bg-secondary text-secondary-foreground border border-border rounded text-sm font-medium">Zrušit</button>
            </div>
          </form>
        </EditModal>
      )}
    </div>
  );
}

function MachinesTab() {
  const queryClient = useQueryClient();
  const { data: machines, isLoading } = useListMachines();
  const { data: accessories } = useListAccessories();
  const { data: workers } = useListWorkers();
  const createMutation = useCreateMachine();
  const updateMutation = useUpdateMachine();
  const deleteMutation = useDeleteMachine();
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", type: "", mowingCategory: "", note: "", isActive: true, defaultAccessoryId: null as number | null, defaultOperatorId: null as number | null });
  const [error, setError] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListMachinesQueryKey() });

  const openEdit = (id: number) => {
    const m = machines?.find((x) => x.id === id);
    if (!m) return;
    setForm({ name: m.name, type: m.type, mowingCategory: m.mowingCategory ?? "", note: m.note ?? "", isActive: m.isActive, defaultAccessoryId: m.defaultAccessoryId ?? null, defaultOperatorId: m.defaultOperatorId ?? null });
    setEditId(id);
  };

  const resetForm = () => { setForm({ name: "", type: "", mowingCategory: "", note: "", isActive: true, defaultAccessoryId: null, defaultOperatorId: null }); setError(""); };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (!form.name.trim() || !form.type.trim()) { setError("Název a typ jsou povinné"); return; }
    try {
      await createMutation.mutateAsync({ data: { name: form.name.trim(), type: form.type.trim(), mowingCategory: form.mowingCategory || null, note: form.note.trim() || undefined, isActive: form.isActive, defaultAccessoryId: form.defaultAccessoryId, defaultOperatorId: form.defaultOperatorId } });
      await invalidate(); resetForm(); setShowAdd(false);
    } catch { setError("Chyba při ukládání"); }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (!editId || !form.name.trim() || !form.type.trim()) { setError("Název a typ jsou povinné"); return; }
    try {
      await updateMutation.mutateAsync({ id: editId, data: { name: form.name.trim(), type: form.type.trim(), mowingCategory: form.mowingCategory || null, note: form.note.trim() || undefined, isActive: form.isActive, defaultAccessoryId: form.defaultAccessoryId, defaultOperatorId: form.defaultOperatorId } as never });
      await invalidate(); setEditId(null); resetForm();
    } catch { setError("Chyba při ukládání"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{machines?.filter((m) => m.isActive !== false).length ?? 0} záznamů</p>
        <button onClick={() => { resetForm(); setShowAdd(true); }} className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm font-medium hover:opacity-90">
          + Přidat stroj
        </button>
      </div>

      {showAdd && (
        <div className="bg-card border border-primary/30 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Nový stroj</h3>
          {error && <p className="text-destructive text-xs mb-2">{error}</p>}
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className={labelClass}>Název *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="Harvestor Ponsse Ergo" required />
            </div>
            <div>
              <label className={labelClass}>Typ *</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputClass} required>
                <option value="">-- Vyberte typ --</option>
                <option value="kácení">Kácení</option>
                <option value="sečení">Sečení</option>
                <option value="svahové sečení">Svahové sečení</option>
                <option value="transport">Transport</option>
                <option value="ostatní">Ostatní</option>
              </select>
            </div>
            <div><label className={labelClass}>Zařazení pro ruční sečení</label><select value={form.mowingCategory} onChange={(e) => setForm({ ...form, mowingCategory: e.target.value })} className={inputClass}><option value="">Běžný stroj</option><option value="slope_mower">Svahová sekačka</option></select></div>
            <div>
              <label className={labelClass}>Poznámka</label>
              <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={inputClass} placeholder="Volitelně" />
            </div>
            <div>
              <label className={labelClass}>Výchozí příslušenství</label>
              <select value={form.defaultAccessoryId ?? ""} onChange={(e) => setForm({ ...form, defaultAccessoryId: e.target.value ? Number(e.target.value) : null })} className={inputClass}>
                <option value="">-- Bez výchozího příslušenství --</option>
                {(accessories ?? []).filter((item) => item.isActive !== false).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Výchozí obsluha</label>
              <select value={form.defaultOperatorId ?? ""} onChange={(e) => setForm({ ...form, defaultOperatorId: e.target.value ? Number(e.target.value) : null })} className={inputClass}>
                <option value="">-- Bez výchozí obsluhy --</option>
                {(workers ?? []).filter((item) => item.isActive !== false).map((item) => <option key={item.id} value={item.id}>{item.firstName} {item.lastName}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:opacity-90 disabled:opacity-60">
                {createMutation.isPending ? "Ukládám..." : "Uložit"}
              </button>
              <button type="button" onClick={() => { setShowAdd(false); resetForm(); }} className="px-4 py-2 bg-secondary text-secondary-foreground border border-border rounded text-sm font-medium">Zrušit</button>
            </div>
          </form>
        </div>
      )}

      <CodebookTable
        items={machines?.filter((m) => m.isActive !== false).map((m) => ({ id: m.id, name: m.name, badge: m.mowingCategory === "slope_mower" ? "Svahová sekačka" : m.type, subtitle: m.note ?? undefined, isActive: m.isActive })) ?? []}
        isLoading={isLoading}
        onEdit={openEdit}
        onToggle={async (id, isActive) => { await updateMutation.mutateAsync({ id, data: { name: "", type: "", isActive: !isActive } as never }); await invalidate(); }}
        onDelete={async (id) => { await deleteMutation.mutateAsync({ id }); await invalidate(); }}
        emptyMessage="Žádné stroje. Přidejte první."
      />

      {editId !== null && (
        <EditModal title="Upravit stroj" onClose={() => { setEditId(null); resetForm(); }}>
          {error && <p className="text-destructive text-xs mb-3">{error}</p>}
          <form onSubmit={handleUpdate} className="space-y-3">
            <div>
              <label className={labelClass}>Název *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Typ *</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputClass} required>
                  <option value="">-- Vyberte --</option>
                  <option value="kácení">Kácení</option>
                  <option value="sečení">Sečení</option>
                  <option value="svahové sečení">Svahové sečení</option>
                  <option value="transport">Transport</option>
                  <option value="ostatní">Ostatní</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Poznámka</label>
                <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={inputClass} />
              </div>
            </div>
            <div><label className={labelClass}>Zařazení pro ruční sečení</label><select value={form.mowingCategory} onChange={(e) => setForm({ ...form, mowingCategory: e.target.value })} className={inputClass}><option value="">Běžný stroj</option><option value="slope_mower">Svahová sekačka</option></select></div>
            <div>
              <label className={labelClass}>Výchozí příslušenství</label>
              <select value={form.defaultAccessoryId ?? ""} onChange={(e) => setForm({ ...form, defaultAccessoryId: e.target.value ? Number(e.target.value) : null })} className={inputClass}>
                <option value="">-- Bez výchozího příslušenství --</option>
                {(accessories ?? []).filter((item) => item.isActive !== false).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Výchozí obsluha</label>
              <select value={form.defaultOperatorId ?? ""} onChange={(e) => setForm({ ...form, defaultOperatorId: e.target.value ? Number(e.target.value) : null })} className={inputClass}>
                <option value="">-- Bez výchozí obsluhy --</option>
                {(workers ?? []).filter((item) => item.isActive !== false).map((item) => <option key={item.id} value={item.id}>{item.firstName} {item.lastName}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="machine-active" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
              <label htmlFor="machine-active" className="text-sm text-foreground">Aktivní</label>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={updateMutation.isPending} className="flex-1 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:opacity-90 disabled:opacity-60">
                {updateMutation.isPending ? "Ukládám..." : "Uložit změny"}
              </button>
              <button type="button" onClick={() => { setEditId(null); resetForm(); }} className="px-4 py-2 bg-secondary text-secondary-foreground border border-border rounded text-sm font-medium">Zrušit</button>
            </div>
          </form>
        </EditModal>
      )}
    </div>
  );
}

function AccessoriesTab() {
  const queryClient = useQueryClient();
  const { data: accessories, isLoading } = useListAccessories();
  const createMutation = useCreateAccessory();
  const updateMutation = useUpdateAccessory();
  const deleteMutation = useDeleteAccessory();
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", type: "", serialNumber: "", note: "", isActive: true });
  const [error, setError] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListAccessoriesQueryKey() });

  const openEdit = (id: number) => {
    const a = accessories?.find((x) => x.id === id);
    if (!a) return;
    setForm({ name: a.name, type: a.type ?? "", serialNumber: a.serialNumber ?? "", note: a.note ?? "", isActive: a.isActive });
    setEditId(id);
  };

  const resetForm = () => { setForm({ name: "", type: "", serialNumber: "", note: "", isActive: true }); setError(""); };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (!form.name.trim()) { setError("Název je povinný"); return; }
    try {
      await createMutation.mutateAsync({ data: { name: form.name.trim(), type: form.type.trim() || undefined, serialNumber: form.serialNumber.trim() || undefined, note: form.note.trim() || undefined, isActive: form.isActive } });
      await invalidate(); resetForm(); setShowAdd(false);
    } catch { setError("Chyba při ukládání"); }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (!editId || !form.name.trim()) { setError("Název je povinný"); return; }
    try {
      await updateMutation.mutateAsync({ id: editId, data: { name: form.name.trim(), type: form.type.trim() || undefined, serialNumber: form.serialNumber.trim() || undefined, note: form.note.trim() || undefined, isActive: form.isActive } as never });
      await invalidate(); setEditId(null); resetForm();
    } catch { setError("Chyba při ukládání"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{accessories?.filter((a) => a.isActive !== false).length ?? 0} záznamů</p>
        <button onClick={() => { resetForm(); setShowAdd(true); }} className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm font-medium hover:opacity-90">
          + Přidat příslušenství
        </button>
      </div>

      {showAdd && (
        <div className="bg-card border border-primary/30 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Nové příslušenství / sestava</h3>
          {error && <p className="text-destructive text-xs mb-2">{error}</p>}
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className={labelClass}>Název *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="Hydraulická ruka Tajfun RCA 480" required />
            </div>
            <div>
              <label className={labelClass}>Typ / Kategorie</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputClass}>
                <option value="">-- Vyberte --</option>
                <option value="nakládač">Nakládač</option>
                <option value="lanovka">Lanovka</option>
                <option value="štěpkování">Štěpkování</option>
                <option value="navijak">Navijak</option>
                <option value="transport">Transport</option>
                <option value="OOPP">OOPP</option>
                <option value="ostatní">Ostatní</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Sériové číslo</label>
              <input value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} className={inputClass} placeholder="SN-12345" />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Poznámka</label>
              <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={inputClass} placeholder="Nosnost, dosah, specifikace..." />
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:opacity-90 disabled:opacity-60">
                {createMutation.isPending ? "Ukládám..." : "Uložit"}
              </button>
              <button type="button" onClick={() => { setShowAdd(false); resetForm(); }} className="px-4 py-2 bg-secondary text-secondary-foreground border border-border rounded text-sm font-medium">Zrušit</button>
            </div>
          </form>
        </div>
      )}

      <CodebookTable
        items={accessories?.filter((a) => a.isActive !== false).map((a) => ({ id: a.id, name: a.name, badge: a.type ?? undefined, subtitle: [a.serialNumber, a.note].filter(Boolean).join(" • ") || undefined, isActive: a.isActive })) ?? []}
        isLoading={isLoading}
        onEdit={openEdit}
        onToggle={async (id, isActive) => { await updateMutation.mutateAsync({ id, data: { name: "", isActive: !isActive } as never }); await invalidate(); }}
        onDelete={async (id) => { await deleteMutation.mutateAsync({ id }); await invalidate(); }}
        emptyMessage="Žádné příslušenství. Přidejte první."
      />

      {editId !== null && (
        <EditModal title="Upravit příslušenství" onClose={() => { setEditId(null); resetForm(); }}>
          {error && <p className="text-destructive text-xs mb-3">{error}</p>}
          <form onSubmit={handleUpdate} className="space-y-3">
            <div>
              <label className={labelClass}>Název *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Typ</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputClass}>
                  <option value="">-- Vyberte --</option>
                  <option value="nakládač">Nakládač</option>
                  <option value="lanovka">Lanovka</option>
                  <option value="štěpkování">Štěpkování</option>
                  <option value="navijak">Navijak</option>
                  <option value="transport">Transport</option>
                  <option value="OOPP">OOPP</option>
                  <option value="ostatní">Ostatní</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Sériové číslo</label>
                <input value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Poznámka</label>
              <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={inputClass} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="acc-active" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
              <label htmlFor="acc-active" className="text-sm text-foreground">Aktivní</label>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={updateMutation.isPending} className="flex-1 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:opacity-90 disabled:opacity-60">
                {updateMutation.isPending ? "Ukládám..." : "Uložit změny"}
              </button>
              <button type="button" onClick={() => { setEditId(null); resetForm(); }} className="px-4 py-2 bg-secondary text-secondary-foreground border border-border rounded text-sm font-medium">Zrušit</button>
            </div>
          </form>
        </EditModal>
      )}
    </div>
  );
}

function RegionsTab() {
  const queryClient = useQueryClient();
  const { data: regions, isLoading } = useListRegions();
  const createMutation = useCreateRegion();
  const updateMutation = useUpdateRegion();
  const deleteMutation = useDeleteRegion();
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", code: "", note: "", isActive: true });
  const [error, setError] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListRegionsQueryKey() });

  const openEdit = (id: number) => {
    const r = regions?.find((x) => x.id === id);
    if (!r) return;
    setForm({ name: r.name, code: r.code ?? "", note: r.note ?? "", isActive: r.isActive });
    setEditId(id);
  };

  const resetForm = () => { setForm({ name: "", code: "", note: "", isActive: true }); setError(""); };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (!form.name.trim()) { setError("Název je povinný"); return; }
    try {
      await createMutation.mutateAsync({ data: { name: form.name.trim(), code: form.code.trim() || undefined, note: form.note.trim() || undefined, isActive: form.isActive } });
      await invalidate(); resetForm(); setShowAdd(false);
    } catch { setError("Chyba při ukládání"); }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (!editId || !form.name.trim()) { setError("Název je povinný"); return; }
    try {
      await updateMutation.mutateAsync({ id: editId, data: { name: form.name.trim(), code: form.code.trim() || undefined, note: form.note.trim() || undefined, isActive: form.isActive } as never });
      await invalidate(); setEditId(null); resetForm();
    } catch { setError("Chyba při ukládání"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{regions?.filter((r) => r.isActive !== false).length ?? 0} záznamů</p>
        <button onClick={() => { resetForm(); setShowAdd(true); }} className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm font-medium hover:opacity-90">
          + Přidat kraj / revír
        </button>
      </div>

      {showAdd && (
        <div className="bg-card border border-primary/30 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Nový kraj / revír</h3>
          {error && <p className="text-destructive text-xs mb-2">{error}</p>}
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className={labelClass}>Název *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="Revír 5 - Hora" required />
            </div>
            <div>
              <label className={labelClass}>Kód / Zkratka</label>
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className={inputClass} placeholder="R05" />
            </div>
            <div>
              <label className={labelClass}>Poznámka</label>
              <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={inputClass} placeholder="Volitelně" />
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:opacity-90 disabled:opacity-60">
                {createMutation.isPending ? "Ukládám..." : "Uložit"}
              </button>
              <button type="button" onClick={() => { setShowAdd(false); resetForm(); }} className="px-4 py-2 bg-secondary text-secondary-foreground border border-border rounded text-sm font-medium">Zrušit</button>
            </div>
          </form>
        </div>
      )}

      <CodebookTable
        items={regions?.filter((r) => r.isActive !== false).map((r) => ({ id: r.id, name: r.name, badge: r.code ?? undefined, subtitle: r.note ?? undefined, isActive: r.isActive })) ?? []}
        isLoading={isLoading}
        onEdit={openEdit}
        onToggle={async (id, isActive) => { await updateMutation.mutateAsync({ id, data: { name: "", isActive: !isActive } as never }); await invalidate(); }}
        onDelete={async (id) => { await deleteMutation.mutateAsync({ id }); await invalidate(); }}
        emptyMessage="Žádné kraje/revíry. Přidejte první."
      />

      {editId !== null && (
        <EditModal title="Upravit kraj / revír" onClose={() => { setEditId(null); resetForm(); }}>
          {error && <p className="text-destructive text-xs mb-3">{error}</p>}
          <form onSubmit={handleUpdate} className="space-y-3">
            <div>
              <label className={labelClass}>Název *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Kód</label>
                <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Poznámka</label>
                <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={inputClass} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="region-active" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
              <label htmlFor="region-active" className="text-sm text-foreground">Aktivní</label>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={updateMutation.isPending} className="flex-1 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:opacity-90 disabled:opacity-60">
                {updateMutation.isPending ? "Ukládám..." : "Uložit změny"}
              </button>
              <button type="button" onClick={() => { setEditId(null); resetForm(); }} className="px-4 py-2 bg-secondary text-secondary-foreground border border-border rounded text-sm font-medium">Zrušit</button>
            </div>
          </form>
        </EditModal>
      )}
    </div>
  );
}

function WeatherTab() {
  const queryClient = useQueryClient();
  const { data: types, isLoading } = useListWeatherTypes();
  const createMutation = useCreateWeatherType();
  const updateMutation = useUpdateWeatherType();
  const deleteMutation = useDeleteWeatherType();
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", icon: "", isActive: true });
  const [error, setError] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListWeatherTypesQueryKey() });

  const openEdit = (id: number) => {
    const t = types?.find((x) => x.id === id);
    if (!t) return;
    setForm({ name: t.name, icon: t.icon ?? "", isActive: t.isActive });
    setEditId(id);
  };

  const resetForm = () => { setForm({ name: "", icon: "", isActive: true }); setError(""); };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (!form.name.trim()) { setError("Název je povinný"); return; }
    try {
      await createMutation.mutateAsync({ data: { name: form.name.trim(), icon: form.icon.trim() || undefined, isActive: form.isActive } });
      await invalidate(); resetForm(); setShowAdd(false);
    } catch { setError("Chyba při ukládání"); }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (!editId || !form.name.trim()) { setError("Název je povinný"); return; }
    try {
      await updateMutation.mutateAsync({ id: editId, data: { name: form.name.trim(), icon: form.icon.trim() || undefined, isActive: form.isActive } as never });
      await invalidate(); setEditId(null); resetForm();
    } catch { setError("Chyba při ukládání"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{types?.filter((t) => t.isActive !== false).length ?? 0} záznamů</p>
        <button onClick={() => { resetForm(); setShowAdd(true); }} className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm font-medium hover:opacity-90">
          + Přidat typ počasí
        </button>
      </div>

      {showAdd && (
        <div className="bg-card border border-primary/30 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Nový typ počasí</h3>
          {error && <p className="text-destructive text-xs mb-2">{error}</p>}
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Název *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="Slunečno" required />
            </div>
            <div>
              <label className={labelClass}>Ikona (kód)</label>
              <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className={inputClass} placeholder="sun, cloud-rain..." />
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:opacity-90 disabled:opacity-60">
                {createMutation.isPending ? "Ukládám..." : "Uložit"}
              </button>
              <button type="button" onClick={() => { setShowAdd(false); resetForm(); }} className="px-4 py-2 bg-secondary text-secondary-foreground border border-border rounded text-sm font-medium">Zrušit</button>
            </div>
          </form>
        </div>
      )}

      <CodebookTable
        items={types?.filter((t) => t.isActive !== false).map((t) => ({ id: t.id, name: t.name, badge: t.icon ?? undefined, isActive: t.isActive })) ?? []}
        isLoading={isLoading}
        onEdit={openEdit}
        onToggle={async (id, isActive) => { await updateMutation.mutateAsync({ id, data: { name: "", isActive: !isActive } as never }); await invalidate(); }}
        onDelete={async (id) => { await deleteMutation.mutateAsync({ id }); await invalidate(); }}
        emptyMessage="Žádné typy počasí. Přidejte první."
      />

      {editId !== null && (
        <EditModal title="Upravit typ počasí" onClose={() => { setEditId(null); resetForm(); }}>
          {error && <p className="text-destructive text-xs mb-3">{error}</p>}
          <form onSubmit={handleUpdate} className="space-y-3">
            <div>
              <label className={labelClass}>Název *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} required />
            </div>
            <div>
              <label className={labelClass}>Ikona (kód)</label>
              <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className={inputClass} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="weather-active" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
              <label htmlFor="weather-active" className="text-sm text-foreground">Aktivní</label>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={updateMutation.isPending} className="flex-1 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:opacity-90 disabled:opacity-60">
                {updateMutation.isPending ? "Ukládám..." : "Uložit změny"}
              </button>
              <button type="button" onClick={() => { setEditId(null); resetForm(); }} className="px-4 py-2 bg-secondary text-secondary-foreground border border-border rounded text-sm font-medium">Zrušit</button>
            </div>
          </form>
        </EditModal>
      )}
    </div>
  );
}
