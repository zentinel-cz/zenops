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
    r.manualMowingKind === "core" ? "Kmenoví pracovníci – křovinořezy" : r.manualMowingKind === "slope" ? "Svahové sekačky" : r.manualMowingKind === "subcontractor" ? "Subdodavatel" : "",
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

type TeamDailyExportRecord = {
  id: number;
  date: string;
  location: string | null;
  temperature: number | null;
  status: "draft" | "open" | "closed";
  createdAt: string;
  updatedAt: string;
  region: { name: string; code?: string | null } | null;
  weather: { name: string } | null;
  creator: { fullName: string } | null;
  assignments: Array<{ workerId: number; firstName: string; lastName: string }>;
  entries: Array<{
    workerId: number;
    fullName: string;
    machineEntries: Array<{ machineId: number | ""; mthStart: number | ""; mthEnd: number | ""; mthTotal?: number | null; fuelConsumption: number | ""; refueling: number | "" }>;
    vehicleEntries: Array<{ vehicleId: number | ""; kmStart: number | ""; kmEnd: number | ""; kmTotal?: number | null; refueling: number | "" }>;
    note: string | null;
    updatedAt: string;
  }>;
};

export function exportTeamDailyExcel(
  records: TeamDailyExportRecord[],
  names: { machines: Array<{ id: number; name: string }>; vehicles: Array<{ id: number; name: string; licensePlate?: string | null }> },
) {
  const statusName = (status: TeamDailyExportRecord["status"]) => status === "draft" ? "Rozpracovaný" : status === "open" ? "Otevřený" : "Uzavřený";
  const machineName = (id: number | "") => names.machines.find((item) => item.id === id)?.name ?? `Stroj #${id}`;
  const vehicleName = (id: number | "") => {
    const vehicle = names.vehicles.find((item) => item.id === id);
    return vehicle ? `${vehicle.name}${vehicle.licensePlate ? ` (${vehicle.licensePlate})` : ""}` : `Auto #${id}`;
  };

  const summaryHeaders = ["ID", "Datum", "Revír", "Místo", "Vedoucí", "Stav", "Přiřazeno", "Vyplněno", "Počasí", "Teplota (°C)", "Vytvořeno", "Naposledy upraveno"];
  const summaryRows = records.map((record) => [
    record.id,
    formatDate(record.date),
    record.region?.name ?? "",
    record.location ?? "",
    record.creator?.fullName ?? "",
    statusName(record.status),
    record.assignments.length,
    record.entries.length,
    record.weather?.name ?? "",
    record.temperature ?? "",
    formatDateTime(record.createdAt),
    formatDateTime(record.updatedAt),
  ]);
  const summarySheet = XLSX.utils.aoa_to_sheet([summaryHeaders, ...summaryRows]);
  summarySheet["!cols"] = [{ wch: 7 }, { wch: 12 }, { wch: 24 }, { wch: 24 }, { wch: 24 }, { wch: 15 }, { wch: 12 }, { wch: 11 }, { wch: 16 }, { wch: 13 }, { wch: 19 }, { wch: 19 }];
  summarySheet["!autofilter"] = { ref: `A1:L${Math.max(1, summaryRows.length + 1)}` };

  const detailHeaders = ["ID záznamu", "Datum", "Revír", "Pracovník", "Stav zápisu", "Stroje a MTH", "Spotřeba (l)", "Tankování strojů (l)", "Auta a km", "Tankování aut (l)", "Poznámka", "Zápis upraven"];
  const detailRows = records.flatMap((record) => record.assignments.map((assignment) => {
    const entry = record.entries.find((item) => item.workerId === assignment.workerId);
    return [
      record.id,
      formatDate(record.date),
      record.region?.name ?? "",
      `${assignment.firstName} ${assignment.lastName}`,
      entry ? "Vyplněno" : "Čeká na zápis",
      entry?.machineEntries.map((item) => `${machineName(item.machineId)}: ${item.mthStart}–${item.mthEnd} MTH (${item.mthTotal ?? Number(item.mthEnd) - Number(item.mthStart)})`).join("; ") ?? "",
      entry?.machineEntries.reduce((sum, item) => sum + (Number(item.fuelConsumption) || 0), 0) || "",
      entry?.machineEntries.reduce((sum, item) => sum + (Number(item.refueling) || 0), 0) || "",
      entry?.vehicleEntries.map((item) => `${vehicleName(item.vehicleId)}: ${item.kmStart}–${item.kmEnd} km (${item.kmTotal ?? Number(item.kmEnd) - Number(item.kmStart)})`).join("; ") ?? "",
      entry?.vehicleEntries.reduce((sum, item) => sum + (Number(item.refueling) || 0), 0) || "",
      entry?.note ?? "",
      entry ? formatDateTime(entry.updatedAt) : "",
    ];
  }));
  const detailSheet = XLSX.utils.aoa_to_sheet([detailHeaders, ...detailRows]);
  detailSheet["!cols"] = [{ wch: 11 }, { wch: 12 }, { wch: 24 }, { wch: 26 }, { wch: 16 }, { wch: 44 }, { wch: 14 }, { wch: 21 }, { wch: 44 }, { wch: 18 }, { wch: 34 }, { wch: 19 }];
  detailSheet["!autofilter"] = { ref: `A1:L${Math.max(1, detailRows.length + 1)}` };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Přehled");
  XLSX.utils.book_append_sheet(workbook, detailSheet, "Výkony pracovníků");
  const month = records.map((record) => record.date.slice(0, 7)).filter((value, index, all) => all.indexOf(value) === index);
  XLSX.writeFile(workbook, `ovecky-${month.length === 1 ? month[0] : new Date().toISOString().slice(0, 10)}.xlsx`);
}

type SubcontractorDailyExportRecord = {
  id: number;
  date: string;
  companyName?: string;
  location: string;
  workerCount: number;
  startTime: string;
  endTime: string;
  creatorName?: string;
  createdAt: string;
  updatedAt: string;
};

function durationHours(startTime: string, endTime: string) {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  return Math.max(0, (endHour * 60 + endMinute - startHour * 60 - startMinute) / 60);
}

export function exportSubcontractorDailyExcel(records: SubcontractorDailyExportRecord[]) {
  const headers = ["ID", "Datum", "Subdodavatel", "Místo zakázky", "Počet lidí", "Od", "Do", "Hodiny", "Člověkohodiny", "Vložil", "Vytvořeno", "Upraveno"];
  const rows = records.map((record) => {
    const hours = durationHours(record.startTime, record.endTime);
    return [
      record.id,
      formatDate(record.date),
      record.companyName ?? "",
      record.location,
      record.workerCount,
      record.startTime,
      record.endTime,
      hours,
      hours * record.workerCount,
      record.creatorName ?? "",
      formatDateTime(record.createdAt),
      formatDateTime(record.updatedAt),
    ];
  });
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  sheet["!cols"] = [{ wch: 7 }, { wch: 12 }, { wch: 28 }, { wch: 32 }, { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 11 }, { wch: 17 }, { wch: 24 }, { wch: 19 }, { wch: 19 }];
  sheet["!autofilter"] = { ref: `A1:L${Math.max(1, rows.length + 1)}` };
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Subdodavatelé");
  const months = records.map((record) => record.date.slice(0, 7)).filter((value, index, all) => all.indexOf(value) === index);
  XLSX.writeFile(workbook, `subdodavatele-${months.length === 1 ? months[0] : new Date().toISOString().slice(0, 10)}.xlsx`);
}
