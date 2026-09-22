import { useState } from "react";
import { useListAuditLogs, useListUsers } from "@workspace/api-client-react";

const TABLE_LABELS: Record<string, string> = {
  felling_records: "Kácení",
  mowing_records: "Sečení",
  users: "Uživatelé",
  workers: "Pracovníci",
  vehicles: "Vozidla",
  machines: "Stroje",
  accessories: "Příslušenství",
  regions: "Revíry",
  weather_types: "Počasí",
  team_daily_records: "Denní záznamy strojního sečení",
  team_daily_entries: "Zápisy pracovníků strojního sečení",
  subcontractor_daily_records: "Denní záznamy subdodavatelů",
};

const ACTION_LABELS: Record<string, string> = {
  create: "Vytvoření",
  update: "Úprava",
  delete: "Smazání",
};

const ACTION_COLORS: Record<string, string> = {
  create: "bg-green-100 text-green-800",
  update: "bg-blue-100 text-blue-800",
  delete: "bg-red-100 text-red-800",
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function formatAuditText(value: string) {
  return value
    .replaceAll("Zaměstnance", "Pracovníka")
    .replaceAll("zaměstnance", "pracovníka")
    .replaceAll("Zaměstnanecký", "Pracovní")
    .replaceAll("zaměstnanecký", "pracovní")
    .replaceAll("Zaměstnanci", "Pracovníci")
    .replaceAll("zaměstnanci", "pracovníci")
    .replaceAll("Zaměstnanec", "Pracovník")
    .replaceAll("zaměstnanec", "pracovník")
    .replaceAll("zaměstnanců", "pracovníků")
    .replaceAll("zaměstnancům", "pracovníkům");
}

function formatAuditData(value: unknown, key?: string): unknown {
  if (key === "role" && value === "employee") return "Pracovník";
  if (key === "role" && value === "subcontractor") return "Subdodavatel";
  if (key === "role" && value === "brushcutter") return "Křovák";
  if (typeof value === "string") return formatAuditText(value);
  if (Array.isArray(value)) return value.map((item) => formatAuditData(item));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([nestedKey, nestedValue]) => [nestedKey, formatAuditData(nestedValue, nestedKey)]));
  return value;
}

export default function AdminAuditLogPage() {
  const [tableName, setTableName] = useState("");
  const [userId, setUserId] = useState<number | null>(null);
  const [action, setAction] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: users } = useListUsers();

  const params = {
    ...(tableName && { tableName }),
    ...(userId && { userId }),
    ...(action && { action }),
    ...(dateFrom && { dateFrom }),
    ...(dateTo && { dateTo }),
  };

  const { data: logs, isLoading } = useListAuditLogs(params as Record<string, never>);

  const hasFilter = tableName || userId || action || dateFrom || dateTo;
  const clearFilter = () => {
    setTableName(""); setUserId(null); setAction(""); setDateFrom(""); setDateTo("");
  };

  const selectClass = "px-2 py-1.5 border border-input rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Audit log</h1>
        {logs && (
          <span className="text-sm text-muted-foreground">{logs.length} záznamů</span>
        )}
      </div>

      {/* Filtry */}
      <div className="bg-card border border-card-border rounded-xl p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase mb-3 tracking-wide">Filtr</p>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Entita:</label>
            <select value={tableName} onChange={(e) => setTableName(e.target.value)} className={selectClass}>
              <option value="">Vše</option>
              {Object.entries(TABLE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Akce:</label>
            <select value={action} onChange={(e) => setAction(e.target.value)} className={selectClass}>
              <option value="">Vše</option>
              {Object.entries(ACTION_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Uživatel:</label>
            <select
              value={userId ?? ""}
              onChange={(e) => setUserId(e.target.value ? Number(e.target.value) : null)}
              className={selectClass}
            >
              <option value="">Vše</option>
              {users?.map((u) => (
                <option key={u.id} value={u.id}>{u.fullName}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Od:</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={selectClass} />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Do:</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={selectClass} />
          </div>
          {hasFilter && (
            <button onClick={clearFilter} className="text-sm text-muted-foreground hover:text-foreground underline">
              Zrušit filtr
            </button>
          )}
        </div>
      </div>

      {/* Tabulka */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-14 bg-card border border-card-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : !logs?.length ? (
        <div className="bg-card border border-card-border rounded-xl p-8 text-center text-muted-foreground text-sm">
          {hasFilter ? "Žádné záznamy pro daný filtr." : "Audit log je prázdný."}
        </div>
      ) : (
        <div className="bg-card border border-card-border rounded-xl divide-y divide-border overflow-hidden">
          {logs.map((log) => {
            const isExpanded = expandedId === log.id;
            const hasChanges = log.oldData || log.newData;
            return (
              <div key={log.id}>
                <button
                  onClick={() => hasChanges && setExpandedId(isExpanded ? null : log.id)}
                  className={`w-full text-left px-4 py-3 transition-colors ${hasChanges ? "hover:bg-accent/20 cursor-pointer" : "cursor-default"}`}
                >
                  <div className="flex items-start gap-3">
                    {/* Akce badge */}
                    <span className={`shrink-0 mt-0.5 px-2 py-0.5 rounded text-xs font-semibold ${ACTION_COLORS[log.action] ?? "bg-secondary text-secondary-foreground"}`}>
                      {ACTION_LABELS[log.action] ?? log.action}
                    </span>

                    {/* Obsah */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">
                        <span className="font-medium text-primary">
                          {TABLE_LABELS[log.tableName] ?? log.tableName}
                          {log.recordId != null ? ` #${log.recordId}` : ""}
                        </span>
                        {" — "}
                        {formatAuditText(log.description)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {log.userFullName ?? log.userUsername ?? `uid:${log.userId}`}
                        {" • "}
                        {formatDateTime(log.createdAt)}
                        {hasChanges && (
                          <span className="ml-2 text-primary/70">
                            {isExpanded ? "▲ skrýt změny" : "▼ zobrazit změny"}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </button>

                {/* Expandovatelné JSON změny */}
                {isExpanded && hasChanges && (
                  <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {log.oldData && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Před</p>
                        <pre className="text-xs bg-red-50 border border-red-200 rounded-lg p-3 overflow-auto max-h-48 whitespace-pre-wrap break-words text-red-900">
                          {JSON.stringify(formatAuditData(log.oldData), null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.newData && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Po</p>
                        <pre className="text-xs bg-green-50 border border-green-200 rounded-lg p-3 overflow-auto max-h-48 whitespace-pre-wrap break-words text-green-900">
                          {JSON.stringify(formatAuditData(log.newData), null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
