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

function formatWorkerTimeEntries(entries?: Array<{
  workerId: number;
  startTime?: string | null;
  endTime?: string | null;
  shiftType?: "morning" | "evening" | "custom" | null;
  worker?: { firstName: string; lastName: string } | null;
}>) {
  if (!entries?.length) return "";
  return entries.map((entry) => {
    const name = entry.worker ? `${entry.worker.firstName} ${entry.worker.lastName}` : `Pracovník #${entry.workerId}`;
    const time = entry.startTime && entry.endTime ? `${entry.startTime}-${entry.endTime}` : "bez času";
    const shift = entry.shiftType === "morning" ? "ranní" : entry.shiftType === "evening" ? "odpolední" : entry.shiftType === "custom" ? "vlastní" : null;
    return `${name} (${shift ? `${shift}, ` : ""}${time})`;
  }).join(", ");
}

function formatMachineMthEntries(entries?: Array<{
  machineId: number;
  startTime?: string | null;
  endTime?: string | null;
  mthStart?: number | string | null;
  mthEnd?: number | string | null;
  mthTotal?: number | string | null;
  fuelConsumption?: number | string | null;
  refueling?: number | string | null;
  machine?: { name: string } | null;
  accessory?: { name: string } | null;
  operator?: { firstName: string; lastName: string } | null;
}>) {
  if (!entries?.length) return "";
  return entries.map((entry) => {
    const name = entry.machine?.name ?? `Stroj #${entry.machineId}`;
    const accessory = entry.accessory?.name ?? "bez příslušenství";
    const operator = entry.operator ? `${entry.operator.firstName} ${entry.operator.lastName}` : "bez obsluhy";
    const time = entry.startTime && entry.endTime ? `${entry.startTime}-${entry.endTime}` : "bez času";
    return `${name} + ${accessory}, obsluha ${operator}: ${time}, ${entry.mthStart ?? "?"} -> ${entry.mthEnd ?? "?"} = ${entry.mthTotal ?? "?"}, spotřeba ${entry.fuelConsumption ?? "?"}, tankování ${entry.refueling ?? "?"}`;
  }).join(", ");
}

function formatVehicleEntries(entries?: Array<{
  vehicleId: number;
  kmStart?: number | string | null;
  kmEnd?: number | string | null;
  kmTotal?: number | string | null;
  refueling?: number | string | null;
  vehicle?: { name: string; licensePlate?: string | null } | null;
}>) {
  if (!entries?.length) return "";
  return entries.map((entry, index) => {
    const name = entry.vehicle ? `${entry.vehicle.name}${entry.vehicle.licensePlate ? ` (${entry.vehicle.licensePlate})` : ""}` : `Auto #${entry.vehicleId}`;
    return `${index + 1}. ${name}: ${entry.kmStart ?? "?"} -> ${entry.kmEnd ?? "?"} km, celkem ${entry.kmTotal ?? "?"} km, tankování ${entry.refueling ?? "?"} l`;
  }).join("; ");
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
    manualMowingKind?: string | null;
    contractorCompany?: { name: string; companyId?: string | null } | null;
    weatherType?: { name: string } | null;
    temperature?: number | null;
    workers: { firstName: string; lastName: string }[];
    workerTimeEntries?: { workerId: number; startTime?: string | null; endTime?: string | null; shiftType?: "morning" | "evening" | "custom" | null; worker?: { firstName: string; lastName: string } | null }[];
    vehicles: { name: string; licensePlate?: string | null }[];
    machines: { name: string }[];
    machineMthEntries?: { machineId: number; startTime?: string | null; endTime?: string | null; mthStart?: number | string | null; mthEnd?: number | string | null; mthTotal?: number | string | null; fuelConsumption?: number | string | null; refueling?: number | string | null; machine?: { name: string } | null }[];
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
    "Časy pracovníků",
    "Vozidla",
    "MTH po strojích",
    "Příslušenství",
    "MTH celkem",
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
    formatWorkerTimeEntries(r.workerTimeEntries),
    formatMachineMthEntries(r.machineMthEntries),
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
    { wch: 30 }, { wch: 32 }, { wch: 24 }, { wch: 32 },
    { wch: 20 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 30 },
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
    manualMowingKind?: string | null;
    contractorCompany?: { name: string; companyId?: string | null } | null;
    weatherType?: { name: string } | null;
    vehicle?: { name: string; licensePlate?: string | null } | null;
    vehicleEntries?: { vehicleId: number; kmStart?: number | null; kmEnd?: number | null; kmTotal?: number | null; refueling?: number | null; vehicle?: { name: string; licensePlate?: string | null } | null }[];
    workers: { firstName: string; lastName: string }[];
    workerTimeEntries?: { workerId: number; startTime?: string | null; endTime?: string | null; shiftType?: "morning" | "evening" | "custom" | null; worker?: { firstName: string; lastName: string } | null }[];
    machines: { name: string }[];
    machineMthEntries?: { machineId: number; startTime?: string | null; endTime?: string | null; mthStart?: number | null; mthEnd?: number | null; mthTotal?: number | null; fuelConsumption?: number | null; refueling?: number | null; machine?: { name: string } | null }[];
    accessories: { name: string }[];
    mthTotal?: number | null;
    fuelConsumption?: number | null;
    refueling?: number | null;
    brushcutterRefueling?: number | null;
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
    "Varianta ručního sečení",
    "Subdodavatelská firma",
    "Jízdy aut",
    "Pracovníci",
    "Časy pracovníků",
    "MTH po strojích",
    "Příslušenství",
    "MTH celkem",
    "Spotřeba (l)",
    "Tankování (l)",
    "Tankování křovinořezů (l)",
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
    r.manualMowingKind === "core" ? "Kmenoví zaměstnanci – křovinořezy" : r.manualMowingKind === "slope" ? "Svahové sekačky" : r.manualMowingKind === "subcontractor" ? "Subdodavatel" : "",
    r.contractorCompany ? `${r.contractorCompany.name}${r.contractorCompany.companyId ? ` (IČO ${r.contractorCompany.companyId})` : ""}` : "",
    formatVehicleEntries(r.vehicleEntries),
    r.workers.map((w) => `${w.firstName} ${w.lastName}`).join(", "),
    formatWorkerTimeEntries(r.workerTimeEntries),
    formatMachineMthEntries(r.machineMthEntries),
    r.accessories.map((a) => a.name).join(", "),
    r.mthTotal != null ? Number(r.mthTotal) : "",
    r.fuelConsumption != null ? Number(r.fuelConsumption) : "",
    r.refueling != null ? Number(r.refueling) : "",
    r.brushcutterRefueling != null ? Number(r.brushcutterRefueling) : "",
    r.note ?? "",
    formatDateTime(r.createdAt),
    formatDateTime(r.updatedAt),
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  ws["!cols"] = [
    { wch: 6 }, { wch: 12 }, { wch: 22 }, { wch: 18 }, { wch: 20 },
    { wch: 8 }, { wch: 8 }, { wch: 14 }, { wch: 20 }, { wch: 12 },
    { wch: 30 }, { wch: 32 }, { wch: 32 }, { wch: 20 },
    { wch: 14 },
    { wch: 12 }, { wch: 12 }, { wch: 30 },
    { wch: 18 }, { wch: 18 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sečení");

  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `seceni-seznam-${today}.xlsx`);
}
