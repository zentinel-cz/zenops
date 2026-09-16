import { useGetDashboardStats, useGetRecentRecords } from "@workspace/api-client-react";
import { Link } from "wouter";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

function StatCard({
  label,
  value,
  unit,
  icon,
  color = "default",
}: {
  label: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  color?: "default" | "green" | "blue" | "amber";
}) {
  const colorMap = {
    default: "bg-white/72 border-white/70",
    green: "bg-emerald-50/92 border-emerald-200/80",
    blue: "bg-cyan-50/92 border-cyan-200/80",
    amber: "bg-amber-50/92 border-amber-200/80",
  };
  const iconColorMap = {
    default: "bg-slate-900 text-white",
    green: "bg-emerald-500/12 text-emerald-700",
    blue: "bg-cyan-500/12 text-cyan-700",
    amber: "bg-amber-500/12 text-amber-700",
  };

  return (
    <div className={`border rounded-[1.5rem] p-4 zenops-panel ${colorMap[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.18em] leading-none">{label}</p>
          <p className="font-display text-3xl font-bold text-foreground mt-3 leading-none">
            {value}
            {unit && <span className="text-sm font-normal text-muted-foreground ml-1.5">{unit}</span>}
          </p>
        </div>
        <div className={`p-3 rounded-2xl ${iconColorMap[color]}`}>{icon}</div>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  label,
  description,
  variant = "primary",
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  variant?: "primary" | "secondary";
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-4 p-5 rounded-[1.65rem] border transition-all hover:translate-y-[-2px] active:scale-[0.99] zenops-panel ${
        variant === "primary"
          ? "bg-[linear-gradient(135deg,#0f2234,#1398c9)] text-primary-foreground border-cyan-300/15 hover:brightness-105"
          : "bg-white/72 text-foreground border-white/70 hover:bg-white/86"
      }`}
    >
      <div className={`p-3 rounded-2xl shrink-0 ${variant === "primary" ? "bg-white/10" : "bg-slate-900 text-white"}`}>
        {icon}
      </div>
      <div>
        <p className="font-display font-semibold text-base">{label}</p>
        <p className={`text-xs mt-1 leading-5 ${variant === "primary" ? "text-primary-foreground/74" : "text-muted-foreground"}`}>
          {description}
        </p>
      </div>
      <svg className="w-4 h-4 ml-auto shrink-0 opacity-60 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

function MetricChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[1.3rem] border border-white/10 bg-white/7 px-4 py-3 backdrop-blur-sm">
      <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-100/60">{label}</p>
      <p className="font-display mt-2 text-2xl text-white">{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: recent, isLoading: recentLoading } = useGetRecentRecords();
  const { isAdmin, user } = useAuth();

  const totalThisMonth = stats?.recordsThisMonth ?? 0;
  const activeWorkers = stats?.activeWorkers ?? 0;

  return (
    <div className="space-y-7 max-w-6xl mx-auto">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(135deg,rgba(10,27,41,0.96),rgba(17,67,94,0.92))] px-6 py-6 text-white shadow-[0_28px_80px_rgba(8,25,38,0.22)] md:px-8 md:py-8">
        <div className="zenops-orb zenops-orb-cyan h-72 w-72 -right-16 -top-10 opacity-90" />
        <div className="zenops-orb zenops-orb-ice h-56 w-56 bottom-[-3rem] left-[-2rem] opacity-60" />
        <div className="relative z-10 grid gap-6 md:grid-cols-[1.1fr_0.9fr] md:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/7 px-3 py-2 text-[11px] uppercase tracking-[0.2em] text-cyan-100/75">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(74,222,128,0.8)]" />
              přehled provozu
            </div>
            <h1 className="font-display mt-4 text-3xl leading-none sm:text-4xl">
              Dobrý den{user?.fullName ? `, ${user.fullName.split(" ")[0]}` : ""}.
              <span className="block text-cyan-300 mt-2">Terén, lidé i stroje pod jedním přehledem.</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-200/80">
              Tady máš rychlý vstup do dnešního provozu, posledních záznamů a správy systému bez přepínání mezi
              nudnými tabulkami.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1 xl:grid-cols-3">
            <MetricChip label="Tento měsíc" value={totalThisMonth} />
            <MetricChip label="Pracovníci" value={activeWorkers} />
            <MetricChip label="Stav" value="Live" />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <QuickAction
          href="/kaceni/novy"
          variant="primary"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          }
          label="Nový záznam kácení"
          description="Kácení, odbodování nebo BEZP"
        />
        <QuickAction
          href="/seceni/novy"
          variant="secondary"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          }
          label="Nový záznam sečení"
          description="Zaznamenat sečení"
        />
      </div>

      <div>
        <div className="flex items-end justify-between gap-3 mb-3">
          <div>
            <h2 className="font-display text-2xl text-foreground">Statistiky</h2>
            <p className="text-sm text-muted-foreground">Rychlý provozní puls aplikace</p>
          </div>
        </div>
        {statsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white/70 border border-white/70 rounded-[1.5rem] p-4 h-24 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatCard
              label="Záznamy kácení"
              value={stats?.totalFellingRecords ?? 0}
              color="green"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
                </svg>
              }
            />
            <StatCard
              label="Záznamy sečení"
              value={stats?.totalMowingRecords ?? 0}
              color="blue"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
                </svg>
              }
            />
            <StatCard
              label="MTH kácení"
              value={
                (stats as { totalFellingMth?: number })?.totalFellingMth != null
                  ? Number((stats as { totalFellingMth?: number }).totalFellingMth ?? 0).toFixed(1)
                  : "0.0"
              }
              unit="hod"
              color="default"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" strokeWidth={2} />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2" />
                </svg>
              }
            />
            <StatCard
              label="MTH sečení"
              value={
                (stats as { totalMowingMth?: number })?.totalMowingMth != null
                  ? Number((stats as { totalMowingMth?: number }).totalMowingMth ?? 0).toFixed(1)
                  : "0.0"
              }
              unit="hod"
              color="default"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" strokeWidth={2} />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2" />
                </svg>
              }
            />
            <StatCard
              label="Tento měsíc"
              value={stats?.recordsThisMonth ?? 0}
              unit="záznamů"
              color="amber"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
            />
            <StatCard
              label="Pracovníci"
              value={stats?.activeWorkers ?? 0}
              color="default"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            />
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3 gap-3">
          <div>
            <h2 className="font-display text-2xl text-foreground">Poslední záznamy</h2>
            <p className="text-sm text-muted-foreground">Poslední aktivita z terénu</p>
          </div>
          <div className="flex gap-3">
            <Link href="/kaceni" className="text-xs text-primary hover:underline">
              Kácení →
            </Link>
            <Link href="/seceni" className="text-xs text-primary hover:underline">
              Sečení →
            </Link>
          </div>
        </div>
        {recentLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-white/72 border border-white/70 rounded-[1.5rem] animate-pulse" />
            ))}
          </div>
        ) : !recent?.records.length ? (
          <div className="bg-white/74 border border-white/70 rounded-[1.8rem] p-10 text-center zenops-panel">
            <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-muted-foreground text-sm font-medium">Žádné záznamy</p>
            <p className="text-muted-foreground text-xs mt-1 mb-4">Začněte přidáním prvního záznamu</p>
            <Link
              href="/kaceni/novy"
              className="inline-flex px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90"
            >
              Přidat první záznam
            </Link>
          </div>
        ) : (
          <div className="bg-white/74 border border-white/70 rounded-[1.8rem] divide-y divide-slate-200/80 overflow-hidden zenops-panel">
            {recent.records.map((r) => {
              const isFelling = r.type === "kaceni";
              return (
                <Link
                  key={`${r.type}-${r.id}`}
                  href={isFelling ? `/kaceni/${r.id}` : `/seceni/${r.id}`}
                  className="flex items-center gap-3 px-4 py-4 hover:bg-white/70 transition-colors"
                >
                  <span
                    className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                      isFelling ? "bg-primary/10 text-primary" : "bg-cyan-100 text-cyan-700"
                    }`}
                  >
                    {isFelling ? "Kácení" : "Sečení"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{r.regionName}</p>
                    <p className="text-xs text-muted-foreground">{r.userFullName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium text-foreground">{formatDate(r.date)}</p>
                    {(r as { mth?: number | null }).mth != null && (
                      <p className="text-xs text-muted-foreground">{(r as { mth?: number | null }).mth} MTH</p>
                    )}
                  </div>
                  <svg className="w-4 h-4 text-muted-foreground shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {isAdmin && (
        <div>
          <div className="mb-3">
            <h2 className="font-display text-2xl text-foreground">Správa systému</h2>
            <p className="text-sm text-muted-foreground">Důležité administrativní vstupy na jednom místě</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              href="/admin/uzivatele"
              className="flex items-center gap-3 p-4 bg-white/74 border border-white/70 rounded-[1.5rem] hover:bg-white/86 transition-colors zenops-panel"
            >
              <div className="p-3 bg-slate-900 rounded-2xl">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Uživatelé</p>
                <p className="text-xs text-muted-foreground">{(stats as { totalUsers?: number })?.totalUsers ?? 0} účtů</p>
              </div>
            </Link>
            <Link
              href="/admin/ciselniky"
              className="flex items-center gap-3 p-4 bg-white/74 border border-white/70 rounded-[1.5rem] hover:bg-white/86 transition-colors zenops-panel"
            >
              <div className="p-3 bg-slate-900 rounded-2xl">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Číselníky</p>
                <p className="text-xs text-muted-foreground">Revíry, stroje, pracovníci</p>
              </div>
            </Link>
            <Link
              href="/admin/audit-log"
              className="flex items-center gap-3 p-4 bg-white/74 border border-white/70 rounded-[1.5rem] hover:bg-white/86 transition-colors zenops-panel"
            >
              <div className="p-3 bg-slate-900 rounded-2xl">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Audit log</p>
                <p className="text-xs text-muted-foreground">Historie změn</p>
              </div>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
