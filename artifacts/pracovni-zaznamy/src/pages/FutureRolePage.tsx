import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { WorkerDailyWorkflow, ManagerDailyWorkflow } from "@/components/TeamDailyWorkflow";
import CoreWorkerMowingWorkflow from "@/components/CoreWorkerMowingWorkflow";

type PortalRole = "Pracovník" | "Vedoucí" | "Křovák";
type ManagerSection = "sheep" | "core";

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
  const [managerSection, setManagerSection] = useState<ManagerSection>("sheep");
  const role: PortalRole = user?.role === "manager" ? "Vedoucí" : user?.role === "brushcutter" ? "Křovák" : "Pracovník";

  return (
    <div className="zenops-shell zenops-grid relative min-h-screen overflow-hidden px-4 py-4 sm:px-6 sm:py-6">
      <div className="zenops-orb zenops-orb-cyan -left-16 -top-16 h-72 w-72 opacity-70" />
      <div className="zenops-orb zenops-orb-ice -right-20 top-20 h-80 w-80 opacity-60" />
      <div className="relative mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-6xl flex-col gap-6 sm:min-h-[calc(100vh-3rem)]">
        <BrandHeader fullName={user?.fullName} role={role} onLogout={() => void logout()} />
        <main className="flex flex-1 justify-center py-4">
          {user?.role === "manager" ? (
            <div className="w-full space-y-5">
              <div className="flex flex-wrap gap-2 rounded-2xl border border-white/75 bg-white/85 p-2 shadow-sm">
                <button type="button" onClick={() => setManagerSection("sheep")} className={`rounded-xl px-4 py-2.5 text-sm font-bold ${managerSection === "sheep" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>Ovečky</button>
                <button type="button" onClick={() => setManagerSection("core")} className={`rounded-xl px-4 py-2.5 text-sm font-bold ${managerSection === "core" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>Křováci · Kmenoví</button>
              </div>
              {managerSection === "sheep" ? <ManagerDailyWorkflow /> : <CoreWorkerMowingWorkflow managerMode />}
            </div>
          ) : user?.role === "brushcutter" ? (
            <div className="w-full"><CoreWorkerMowingWorkflow /></div>
          ) : (
            <div className="w-full"><WorkerDailyWorkflow /></div>
          )}
        </main>
        <footer className="pb-1 text-center text-xs text-slate-400">Zenops · pracovní záznamy a provozní evidence</footer>
      </div>
    </div>
  );
}
