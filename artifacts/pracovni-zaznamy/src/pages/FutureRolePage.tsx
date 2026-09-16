import { useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { EmployeeDailyWorkflow, ManagerDailyWorkflow } from "@/components/TeamDailyWorkflow";

type EmployeeSection = "sheep" | "core" | "subcontractor";

const sections: Array<{
  id: EmployeeSection;
  title: string;
  subtitle: string;
  icon: ReactNode;
  accent: string;
}> = [
  {
    id: "sheep",
    title: "Ovečky",
    subtitle: "Strojní sečení",
    icon: "🐑",
    accent: "from-cyan-500/16 to-sky-100/60 border-cyan-400/45 hover:border-cyan-500",
  },
  {
    id: "core",
    title: "Křováci – Kmenoví",
    subtitle: "Kmenoví zaměstnanci",
    icon: (
      <svg viewBox="0 0 64 64" className="h-12 w-12 text-emerald-800" fill="none" aria-hidden="true">
        <path d="M15 49 46 18" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        <path d="m39 25-9-8M38 25l8 9" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M45 11h9a4 4 0 0 1 4 4v7a4 4 0 0 1-4 4h-8l-5-5v-5l4-5Z" fill="currentColor" opacity=".18" />
        <path d="M45 11h9a4 4 0 0 1 4 4v7a4 4 0 0 1-4 4h-8l-5-5v-5l4-5Z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
        <path d="M8 51h17M12 46a10 10 0 0 0-5 9" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M8 56c4-3 11-3 16 0" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    ),
    accent: "from-emerald-500/16 to-lime-100/55 border-emerald-400/45 hover:border-emerald-500",
  },
  {
    id: "subcontractor",
    title: "Subdodavatel",
    subtitle: "Práce subdodavatele",
    icon: "🤝",
    accent: "from-amber-500/16 to-orange-100/55 border-amber-400/45 hover:border-amber-500",
  },
];

function BrandHeader({ fullName, role, onLogout }: { fullName?: string; role: "Zaměstnanec" | "Vedoucí"; onLogout: () => void }) {
  return (
    <header className="flex flex-col gap-4 rounded-[1.7rem] border border-white/70 bg-[linear-gradient(135deg,rgba(15,39,58,0.96),rgba(17,70,98,0.88))] p-5 text-white shadow-[0_20px_55px_rgba(7,24,38,0.24)] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500 text-lg font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">Z</div>
        <div>
          <p className="font-display text-xl font-bold leading-none">Zenops</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-cyan-100/65">{role === "Vedoucí" ? "portál vedoucího" : "zaměstnanecký portál"}</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <div className="min-w-0 sm:text-right">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">přihlášený {role.toLowerCase()}</p>
          <p className="truncate text-sm font-semibold text-white/90">{fullName}</p>
        </div>
        <button type="button" onClick={onLogout} className="shrink-0 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-white/85 transition-colors hover:bg-white/20 hover:text-white">
          Odhlásit
        </button>
      </div>
    </header>
  );
}

export default function FutureRolePage() {
  const { user, logout } = useAuth();
  const [selected, setSelected] = useState<EmployeeSection | null>(null);

  const isManager = user?.role === "manager";
  const current = sections.find((item) => item.id === selected);

  return (
    <div className="zenops-shell zenops-grid relative min-h-screen overflow-hidden px-4 py-4 sm:px-6 sm:py-6">
      <div className="zenops-orb zenops-orb-cyan -left-16 -top-16 h-72 w-72 opacity-70" />
      <div className="zenops-orb zenops-orb-ice -right-20 top-20 h-80 w-80 opacity-60" />

      <div className="relative mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-6xl flex-col gap-6 sm:min-h-[calc(100vh-3rem)]">
        <BrandHeader fullName={user?.fullName} role={isManager ? "Vedoucí" : "Zaměstnanec"} onLogout={() => void logout()} />

        <main className="flex flex-1 items-center justify-center py-4">
          {isManager ? <div className="w-full"><ManagerDailyWorkflow /></div> : !current ? (
            <section className="w-full">
              <div className="mb-7 text-center">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Denní evidence</p>
                <h1 className="mt-2 font-display text-3xl font-bold text-slate-950 sm:text-4xl">Vyberte druh práce</h1>
                <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">Zvolte sekci, ve které chcete pokračovat.</p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
                {sections.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelected(item.id)}
                    className={`group min-h-56 rounded-[1.75rem] border-2 bg-gradient-to-br ${item.accent} p-6 text-left shadow-[0_18px_45px_rgba(11,36,56,0.08)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_24px_55px_rgba(11,36,56,0.15)] focus:outline-none focus:ring-4 focus:ring-primary/20`}
                  >
                    <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/80 bg-white/80 text-4xl shadow-sm transition-transform duration-200 group-hover:scale-105">{item.icon}</span>
                    <span className="mt-7 block font-display text-2xl font-bold text-slate-950">{item.title}</span>
                    <span className="mt-2 block text-sm font-medium text-slate-600">{item.subtitle}</span>
                    <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-slate-800">Otevřít <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span></span>
                  </button>
                ))}
              </div>
            </section>
          ) : current.id === "sheep" ? <div className="w-full"><EmployeeDailyWorkflow onBack={() => setSelected(null)} /></div> : (
            <section className="w-full max-w-2xl rounded-[2rem] border border-white/75 bg-white/88 p-7 text-center shadow-[0_24px_60px_rgba(11,36,56,0.12)] backdrop-blur-xl sm:p-10">
              <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-slate-200 bg-slate-50 text-5xl">{current.icon}</span>
              <p className="mt-6 text-xs font-bold uppercase tracking-[0.22em] text-primary">Vybraná sekce</p>
              <h1 className="mt-2 font-display text-3xl font-bold text-slate-950">{current.title}</h1>
              <p className="mt-2 text-muted-foreground">{current.subtitle}</p>
              <p className="mx-auto mt-6 max-w-md text-sm leading-6 text-slate-500">Výběr funguje. Obsah této sekce společně doplníme v dalším kroku.</p>
              <button type="button" onClick={() => setSelected(null)} className="mt-8 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50">
                ← Zpět na výběr
              </button>
            </section>
          )}
        </main>

        <footer className="pb-1 text-center text-xs text-slate-400">Zenops · pracovní záznamy a provozní evidence</footer>
      </div>
    </div>
  );
}
