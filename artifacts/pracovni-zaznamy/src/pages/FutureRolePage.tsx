import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { WorkerDailyWorkflow, ManagerDailyWorkflow } from "@/components/TeamDailyWorkflow";
import CoreWorkerMowingWorkflow from "@/components/CoreWorkerMowingWorkflow";
import FellingForm, { type FellingFormData } from "@/components/FellingForm";
import { getListFellingRecordsQueryKey, useCreateFellingRecord } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type PortalRole = "Pracovník" | "Vedoucí" | "Křovák";
type WorkSection = "machine-mowing" | "core" | "reprofiling" | "felling";

const WORK_SECTIONS: Array<{
  id: WorkSection;
  label: string;
  shortLabel: string;
  description: string;
  accent: string;
}> = [
  { id: "machine-mowing", label: "Strojní sečení", shortLabel: "Sečení", description: "Denní práce, stroje a výkony", accent: "from-emerald-500 to-cyan-600" },
  { id: "core", label: "Křováci kmenoví", shortLabel: "Křováci", description: "Ruční sečení křovinořezy", accent: "from-lime-500 to-emerald-600" },
  { id: "reprofiling", label: "Reprofilace", shortLabel: "Reprofilace", description: "Nový typ práce – připravujeme", accent: "from-amber-500 to-orange-600" },
  { id: "felling", label: "Kácení", shortLabel: "Kácení", description: "Denní záznamy práce a techniky", accent: "from-orange-500 to-rose-600" },
];

function WorkChooser({ selected, onSelect, manager, sections = WORK_SECTIONS }: { selected: WorkSection | null; onSelect: (section: WorkSection) => void; manager: boolean; sections?: typeof WORK_SECTIONS }) {
  return (
    <section className="space-y-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-700">Výběr práce</p>
        <h1 className="font-display mt-1 text-3xl font-bold text-slate-900">Co dnes budeme zapisovat?</h1>
        <p className="mt-2 text-sm text-slate-500">{manager ? "Vyberte sekci pro založení nebo správu denního záznamu." : "Vyberte druh práce pro dnešní zápis."}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {sections.map((item) => {
          const isSelected = selected === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`group min-h-44 rounded-[1.7rem] border p-4 text-left transition-all hover:-translate-y-1 hover:shadow-xl ${isSelected ? "border-slate-900 bg-slate-900 text-white shadow-xl" : "border-white/80 bg-white/85 text-slate-900 shadow-sm"}`}
            >
              <span className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${item.accent} text-sm font-black text-white shadow-lg`}>{item.shortLabel.slice(0, 2).toUpperCase()}</span>
              <strong className="mt-5 block font-display text-lg">{item.label}</strong>
              <span className={`mt-1 block text-xs leading-5 ${isSelected ? "text-white/65" : "text-slate-500"}`}>{item.description}</span>
              <span className={`mt-4 inline-flex text-xs font-bold ${isSelected ? "text-cyan-300" : "text-cyan-700"}`}>{isSelected ? "Vybráno" : "Otevřít →"}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function EmptyWorkSection({ title, manager }: { title: string; manager: boolean }) {
  return (
    <section className="rounded-[1.9rem] border border-dashed border-amber-300/80 bg-amber-50/75 p-8 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-2xl">↗</div>
      <h2 className="font-display mt-4 text-2xl font-bold text-slate-900">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">Sekce je v systému zavedená. {manager ? "Formulář denního záznamu doplníme v dalším kroku." : "Pracovní zápis pro tuto činnost právě připravujeme."}</p>
    </section>
  );
}

function ManagerFellingWorkflow() {
  const queryClient = useQueryClient();
  const createMutation = useCreateFellingRecord();
  const [formKey, setFormKey] = useState(0);

  const handleSubmit = async (data: FellingFormData) => {
    try {
      await createMutation.mutateAsync({ data: { ...data } });
      await queryClient.invalidateQueries({ queryKey: getListFellingRecordsQueryKey() });
      toast.success("Denní záznam kácení byl uložen");
      setFormKey((value) => value + 1);
    } catch {
      toast.error("Nepodařilo se uložit záznam kácení");
    }
  };

  return (
    <section className="space-y-4">
      <div><h2 className="font-display text-2xl font-bold text-slate-900">Nový denní záznam kácení</h2><p className="mt-1 text-sm text-slate-500">Stejný provozní princip jako u strojního sečení – lidé, technika, časy a výkon.</p></div>
      <div className="zenops-form-shell rounded-[1.9rem] p-5 md:p-6 xl:p-7"><FellingForm key={formKey} onSubmit={handleSubmit} onCancel={() => setFormKey((value) => value + 1)} isLoading={createMutation.isPending} /></div>
    </section>
  );
}

function BrandHeader({ fullName, role, onLogout }: { fullName?: string; role: PortalRole; onLogout: () => void }) {
  const portalLabel = role === "Vedoucí" ? "portál vedoucího" : role === "Křovák" ? "portál křováka" : "portál pracovníka";
  return (
    <header className="flex flex-col gap-4 rounded-[1.7rem] border border-white/70 bg-[linear-gradient(135deg,rgba(15,39,58,0.96),rgba(17,70,98,0.88))] p-5 text-white shadow-[0_20px_55px_rgba(7,24,38,0.24)] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500 text-lg font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">Z</div>
        <div><p className="font-display text-xl font-bold leading-none">Zenops</p><p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-cyan-100/65">{portalLabel}</p></div>
      </div>
      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <div className="min-w-0 sm:text-right"><p className="text-[10px] uppercase tracking-[0.18em] text-white/45">přihlášený {role.toLowerCase()}</p><p className="truncate text-sm font-semibold text-white/90">{fullName}</p></div>
        <button type="button" onClick={onLogout} className="shrink-0 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-white/85 transition-colors hover:bg-white/20 hover:text-white">Odhlásit</button>
      </div>
    </header>
  );
}

export default function FutureRolePage() {
  const { user, logout } = useAuth();
  const [workSection, setWorkSection] = useState<WorkSection | null>(null);
  const role: PortalRole = user?.role === "manager" ? "Vedoucí" : user?.role === "brushcutter" ? "Křovák" : "Pracovník";
  const manager = user?.role === "manager";
  const sections = user?.role === "brushcutter" ? WORK_SECTIONS.filter((section) => section.id === "core") : WORK_SECTIONS;

  return (
    <div className="zenops-shell zenops-grid relative min-h-screen overflow-hidden px-4 py-4 sm:px-6 sm:py-6">
      <div className="zenops-orb zenops-orb-cyan -left-16 -top-16 h-72 w-72 opacity-70" />
      <div className="zenops-orb zenops-orb-ice -right-20 top-20 h-80 w-80 opacity-60" />
      <div className="relative mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-6xl flex-col gap-6 sm:min-h-[calc(100vh-3rem)]">
        <BrandHeader fullName={user?.fullName} role={role} onLogout={() => void logout()} />
        <main className="flex flex-1 justify-center py-4">
          <div className="w-full space-y-6">
            <WorkChooser selected={workSection} onSelect={setWorkSection} manager={manager} sections={sections} />
            {workSection && <div className="flex items-center gap-3"><div className="h-px flex-1 bg-slate-200/80" /><button type="button" onClick={() => setWorkSection(null)} className="rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-white">Zpět na výběr</button><div className="h-px flex-1 bg-slate-200/80" /></div>}
            {workSection === "machine-mowing" && (manager ? <ManagerDailyWorkflow /> : <WorkerDailyWorkflow />)}
            {workSection === "core" && (manager ? <CoreWorkerMowingWorkflow managerMode /> : user?.role === "brushcutter" ? <CoreWorkerMowingWorkflow /> : <EmptyWorkSection title="Křováci kmenoví" manager={false} />)}
            {workSection === "reprofiling" && <EmptyWorkSection title="Reprofilace" manager={manager} />}
            {workSection === "felling" && (manager ? <ManagerFellingWorkflow /> : <EmptyWorkSection title="Kácení" manager={false} />)}
          </div>
        </main>
        <footer className="pb-1 text-center text-xs text-slate-400">Zenops · pracovní záznamy a provozní evidence</footer>
      </div>
    </div>
  );
}
