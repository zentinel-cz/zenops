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
    default: "bg-card border-card-border",
    green: "bg-primary/5 border-primary/20",
    blue: "bg-blue-50 border-blue-200",
    amber: "bg-amber-50 border-amber-200",
  };
  const iconColorMap = {
    default: "bg-secondary text-secondary-foreground",
    green: "bg-primary/10 text-primary",
    blue: "bg-blue-100 text-blue-700",
    amber: "bg-amber-100 text-amber-700",
  };

  return (
    <div className={`border rounded-xl p-4 ${colorMap[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide leading-none">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-2 leading-none">
            {value}
            {unit && <span className="text-sm font-normal text-muted-foreground ml-1.5">{unit}</span>}
          </p>
        </div>
        <div className={`p-2 rounded-lg ${iconColorMap[color]}`}>{icon}</div>
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
      className={`flex items-center gap-4 p-4 rounded-xl border transition-all hover:scale-[1.02] active:scale-[0.99] ${
        variant === "primary"
          ? "bg-primary text-primary-foreground border-primary/20 hover:bg-primary/90"
          : "bg-card text-foreground border-card-border hover:bg-accent/30"
      }`}
    >
      <div className={`p-2.5 rounded-lg shrink-0 ${variant === "primary" ? "bg-white/10" : "bg-secondary/50"}`}>
        {icon}
      </div>
      <div>
        <p className="font-semibold text-sm">{label}</p>
        <p className={`text-xs mt-0.5 ${variant === "primary" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
          {description}
        </p>
      </div>
      <svg className="w-4 h-4 ml-auto shrink-0 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: recent, isLoading: recentLoading } = useGetRecentRecords();
  const { isAdmin, user } = useAuth();

  return (
    <div className="space-y-7 max-w-2xl mx-auto">
      {/* Uvítání */}
      <div>
        <h1 className="text-xl font-bold text-foreground">
          Dobrý den{user?.fullName ? `, ${user.fullName.split(" ")[0]}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Přehled pracovních záznamů z lesa</p>
      </div>

      {/* Rychlé akce */}
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
          description="Zaznamenat dnešní práci v lese"
        />
        <QuickAction
          href="/seceni/novy"
          variant="secondary"
          icon={
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          }
          label="Nový záznam sečení"
          description="Zaznamenat sečení travních ploch"
        />
      </div>

      {/* Statistiky */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Statistiky</h2>
        {statsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-card border border-card-border rounded-xl p-4 h-20 animate-pulse" />
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
              value={(stats as { totalFellingMth?: number })?.totalFellingMth != null
                ? Number((stats as { totalFellingMth?: number })?.totalFellingMth ?? 0).toFixed(1)
                : "0.0"}
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
              value={(stats as { totalMowingMth?: number })?.totalMowingMth != null
                ? Number((stats as { totalMowingMth?: number })?.totalMowingMth ?? 0).toFixed(1)
                : "0.0"}
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

      {/* Poslední záznamy */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Poslední záznamy</h2>
          <div className="flex gap-3">
            <Link href="/kaceni" className="text-xs text-primary hover:underline">Kácení →</Link>
            <Link href="/seceni" className="text-xs text-primary hover:underline">Sečení →</Link>
          </div>
        </div>
        {recentLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-card border border-card-border rounded-xl animate-pulse" />
            ))}
          </div>
        ) : !recent?.records.length ? (
          <div className="bg-card border border-card-border rounded-xl p-10 text-center">
            <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div className="bg-card border border-card-border rounded-xl divide-y divide-border overflow-hidden">
            {recent.records.map((r) => {
              const isFelling = r.type === "kaceni";
              return (
                <Link
                  key={`${r.type}-${r.id}`}
                  href={isFelling ? `/kaceni/${r.id}` : `/seceni/${r.id}`}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-accent/30 transition-colors"
                >
                  <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                    isFelling ? "bg-primary/10 text-primary" : "bg-blue-100 text-blue-700"
                  }`}>
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

      {/* Admin sekce */}
      {isAdmin && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Správa systému</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              href="/admin/uzivatele"
              className="flex items-center gap-3 p-3.5 bg-card border border-card-border rounded-xl hover:bg-accent/30 transition-colors"
            >
              <div className="p-2 bg-secondary rounded-lg">
                <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              className="flex items-center gap-3 p-3.5 bg-card border border-card-border rounded-xl hover:bg-accent/30 transition-colors"
            >
              <div className="p-2 bg-secondary rounded-lg">
                <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              className="flex items-center gap-3 p-3.5 bg-card border border-card-border rounded-xl hover:bg-accent/30 transition-colors"
            >
              <div className="p-2 bg-secondary rounded-lg">
                <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
