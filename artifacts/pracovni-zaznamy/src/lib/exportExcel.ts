import * as XLSX from "xlsx";

function formatDate(iso: string) {
  if (!iso) return "";
  const [year, month, day] = iso.split("T")[0].split("-");
  return `${day}/${month}/${year}`;
}

function formatDateTime(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export function exportFellingExcel(
  records: {
    id: number;
    date: string;
    region: { name: string; code?: string | null };
    location?: string | null;
    user: { fullName: string };
    startTime?: string | null;
    endTime?: string | null;
    weatherType?: { name: string } | null;
    temperature?: number | null;
    workers: { firstName: string; lastName: string }[];
    vehicles: { name: string; licensePlate?: string | null }[];
    machines: { name: string }[];
    accessories: { name: string }[];
    mth?: number | string | null;
    fuelConsumption?: number | string | null;
    refueling?: number | string | null;
    note?: string | null;
    createdAt: string;
    updatedAt: string;
  }[],
) {
  const headers = [
    "ID",
    "Datum",
    "Kraj / Revír",
    "Kód revíru",
    "Místo",
    "Autor",
    "Čas od",
    "Čas do",
    "Počasí",
    "Teplota (°C)",
    "Pracovníci",
    "Vozidla",
    "Stroje",
    "Příslušenství",
    "MTH",
    "Spotřeba (l)",
    "Tankování (l)",
    "Poznámka",
    "Vytvořeno",
    "Upraveno",
  ];

  const rows = records.map((r) => [
    r.id,
    formatDate(r.date),
    r.region.name,
    r.region.code ?? "",
    r.location ?? "",
    r.user.fullName,
    r.startTime ?? "",
    r.endTime ?? "",
    r.weatherType?.name ?? "",
    r.temperature != null ? Number(r.temperature) : "",
    r.workers.map((w) => `${w.firstName} ${w.lastName}`).join(", "),
    r.vehicles.map((v) => v.name + (v.licensePlate ? ` (${v.licensePlate})` : "")).join(", "),
    r.machines.map((m) => m.name).join(", "),
    r.accessories.map((a) => a.name).join(", "),
    r.mth != null ? Number(r.mth) : "",
    r.fuelConsumption != null ? Number(r.fuelConsumption) : "",
    r.refueling != null ? Number(r.refueling) : "",
    r.note ?? "",
    formatDateTime(r.createdAt),
    formatDateTime(r.updatedAt),
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  ws["!cols"] = [
    { wch: 6 }, { wch: 12 }, { wch: 22 }, { wch: 12 }, { wch: 18 },
    { wch: 20 }, { wch: 8 }, { wch: 8 }, { wch: 14 }, { wch: 12 },
    { wch: 30 }, { wch: 24 }, { wch: 24 }, { wch: 20 },
    { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 30 },
    { wch: 18 }, { wch: 18 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Kácení");

  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `kaceni-seznam-${today}.xlsx`);
}

export function exportMowingExcel(
  records: {
    id: number;
    date: string;
    region: { name: string };
    location?: string | null;
    user: { fullName: string };
    startTime?: string | null;
    endTime?: string | null;
    weatherType?: { name: string } | null;
    vehicle?: { name: string; licensePlate?: string | null } | null;
    workers: { firstName: string; lastName: string }[];
    machines: { name: string }[];
    accessories: { name: string }[];
    mthStart?: number | null;
    mthEnd?: number | null;
    mthTotal?: number | null;
    fuelConsumption?: number | null;
    refueling?: number | null;
    note?: string | null;
    createdAt: string;
    updatedAt: string;
  }[],
) {
  const headers = [
    "ID",
    "Datum",
    "Kraj / Revír",
    "Místo",
    "Autor",
    "Čas od",
    "Čas do",
    "Počasí",
    "Auto / Vozidlo",
    "SPZ",
    "Pracovníci",
    "Stroje / Traktory",
    "Příslušenství",
    "MTH počáteční",
    "MTH koncové",
    "MTH celkem",
    "Spotřeba (l)",
    "Tankování (l)",
    "Poznámka / Porucha",
    "Vytvořeno",
    "Upraveno",
  ];

  const rows = records.map((r) => [
    r.id,
    formatDate(r.date),
    r.region.name,
    r.location ?? "",
    r.user.fullName,
    r.startTime ?? "",
    r.endTime ?? "",
    r.weatherType?.name ?? "",
    r.vehicle?.name ?? "",
    r.vehicle?.licensePlate ?? "",
    r.workers.map((w) => `${w.firstName} ${w.lastName}`).join(", "),
    r.machines.map((m) => m.name).join(", "),
    r.accessories.map((a) => a.name).join(", "),
    r.mthStart != null ? Number(r.mthStart) : "",
    r.mthEnd != null ? Number(r.mthEnd) : "",
    r.mthTotal != null ? Number(r.mthTotal) : "",
    r.fuelConsumption != null ? Number(r.fuelConsumption) : "",
    r.refueling != null ? Number(r.refueling) : "",
    r.note ?? "",
    formatDateTime(r.createdAt),
    formatDateTime(r.updatedAt),
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  ws["!cols"] = [
    { wch: 6 }, { wch: 12 }, { wch: 22 }, { wch: 18 }, { wch: 20 },
    { wch: 8 }, { wch: 8 }, { wch: 14 }, { wch: 20 }, { wch: 12 },
    { wch: 30 }, { wch: 24 }, { wch: 20 },
    { wch: 14 }, { wch: 14 }, { wch: 14 },
    { wch: 12 }, { wch: 12 }, { wch: 30 },
    { wch: 18 }, { wch: 18 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sečení");

  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `seceni-seznam-${today}.xlsx`);
}
