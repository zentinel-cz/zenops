import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function formatDate(iso: string) {
  if (!iso) return "—";
  const [year, month, day] = iso.split("T")[0].split("-");
  return `${day}/${month}/${year}`;
}

function formatDateTime(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

const GREEN = [52, 101, 52] as [number, number, number];
const LIGHT_GREEN = [236, 245, 236] as [number, number, number];
const GRAY_BORDER = [200, 210, 200] as [number, number, number];
const TEXT_DARK = [30, 40, 30] as [number, number, number];
const TEXT_MUTED = [100, 115, 100] as [number, number, number];

async function arrayBufferToBase64(buf: ArrayBuffer): Promise<string> {
  return new Promise((resolve) => {
    const blob = new Blob([buf]);
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.split(",")[1]);
    };
    reader.readAsDataURL(blob);
  });
}

async function loadFonts(doc: jsPDF) {
  const [regularBuf, boldBuf] = await Promise.all([
    fetch("/fonts/Roboto-Regular.ttf").then((r) => r.arrayBuffer()),
    fetch("/fonts/Roboto-Bold.ttf").then((r) => r.arrayBuffer()),
  ]);
  const [regularB64, boldB64] = await Promise.all([
    arrayBufferToBase64(regularBuf),
    arrayBufferToBase64(boldBuf),
  ]);
  doc.addFileToVFS("Roboto-Regular.ttf", regularB64);
  doc.addFileToVFS("Roboto-Bold.ttf", boldB64);
  doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
  doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");
  doc.setFont("Roboto", "normal");
}

function addHeader(doc: jsPDF, title: string, subtitle: string) {
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, 210, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("Roboto", "bold");
  doc.text(title, 14, 10);
  doc.setFontSize(9);
  doc.setFont("Roboto", "normal");
  doc.text(subtitle, 14, 17);
  doc.setTextColor(...TEXT_DARK);
}

function addSection(doc: jsPDF, y: number, title: string, rows: [string, string][]) {
  doc.setFillColor(...LIGHT_GREEN);
  doc.setDrawColor(...GRAY_BORDER);
  doc.roundedRect(12, y, 186, 7, 1, 1, "FD");
  doc.setFontSize(8);
  doc.setFont("Roboto", "bold");
  doc.setTextColor(...GREEN);
  doc.text(title.toUpperCase(), 15, y + 5);
  doc.setTextColor(...TEXT_DARK);

  let rowY = y + 10;
  rows.forEach(([label, value], i) => {
    if (i % 2 === 0) {
      doc.setFillColor(248, 252, 248);
      doc.rect(12, rowY - 3, 186, 7, "F");
    }
    doc.setFontSize(8.5);
    doc.setFont("Roboto", "bold");
    doc.setTextColor(...TEXT_MUTED);
    doc.text(label, 15, rowY + 1);
    doc.setFont("Roboto", "normal");
    doc.setTextColor(...TEXT_DARK);
    const lines = doc.splitTextToSize(value || "—", 115);
    doc.text(lines, 70, rowY + 1);
    rowY += Math.max(7, lines.length * 5);
  });

  doc.setDrawColor(...GRAY_BORDER);
  doc.roundedRect(12, y, 186, rowY - y, 1, 1);
  return rowY + 5;
}

function addFooter(doc: jsPDF) {
  const pageHeight = doc.internal.pageSize.height;
  doc.setDrawColor(...GRAY_BORDER);
  doc.line(12, pageHeight - 14, 198, pageHeight - 14);
  doc.setFontSize(7.5);
  doc.setFont("Roboto", "normal");
  doc.setTextColor(...TEXT_MUTED);
  doc.text(`Vygenerováno: ${formatDateTime(new Date().toISOString())}`, 14, pageHeight - 8);
  doc.text("Zenops by Zentinel.cz — důvěrný dokument", 198, pageHeight - 8, { align: "right" });
}

export async function exportFellingPdf(record: {
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
}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  await loadFonts(doc);

  const subtitle = `${formatDate(record.date)} — ${record.region.name}${record.region.code ? ` (${record.region.code})` : ""}`;
  addHeader(doc, "Záznam kácení", subtitle);

  let y = 28;

  y = addSection(doc, y, "Základní informace", [
    ["Datum", formatDate(record.date)],
    ["Kraj / Revír", record.region.name + (record.region.code ? ` (${record.region.code})` : "")],
    ["Místo", record.location ?? "—"],
    ["Autor záznamu", record.user.fullName],
  ]);

  y = addSection(doc, y, "Pracovní doba & Počasí", [
    ["Pracovní doba", record.startTime && record.endTime
      ? `${record.startTime} – ${record.endTime}`
      : record.startTime ? `od ${record.startTime}` : "—"],
    ["Počasí", record.weatherType?.name ?? "—"],
    ["Teplota", record.temperature != null ? `${record.temperature} °C` : "—"],
  ]);

  y = addSection(doc, y, "Obsluha / Pracovníci", [
    ["Pracovníci", record.workers.length
      ? record.workers.map((w) => `${w.firstName} ${w.lastName}`).join(", ")
      : "—"],
  ]);

  y = addSection(doc, y, "Technika", [
    ["Vozidla", record.vehicles.length
      ? record.vehicles.map((v) => v.name + (v.licensePlate ? ` (${v.licensePlate})` : "")).join(", ")
      : "—"],
    ["Stroje", record.machines.length ? record.machines.map((m) => m.name).join(", ") : "—"],
    ["Příslušenství", record.accessories.length ? record.accessories.map((a) => a.name).join(", ") : "—"],
  ]);

  y = addSection(doc, y, "Provozní hodnoty", [
    ["MTH", record.mth != null ? `${record.mth} mth` : "—"],
    ["Spotřeba", record.fuelConsumption != null ? `${record.fuelConsumption} l` : "—"],
    ["Tankování", record.refueling != null ? `${record.refueling} l` : "—"],
  ]);

  if (record.note) {
    y = addSection(doc, y, "Poznámka", [["Poznámka", record.note]]);
  }

  y = addSection(doc, y, "Meta", [
    ["Vytvořeno", formatDateTime(record.createdAt)],
    ["Upraveno", formatDateTime(record.updatedAt)],
    ["Číslo záznamu", `#${record.id}`],
  ]);

  addFooter(doc);
  doc.save(`kaceni-${record.id}-${record.date}.pdf`);
}

export async function exportMowingPdf(record: {
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
}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  await loadFonts(doc);

  const subtitle = `${formatDate(record.date)} — ${record.region.name}`;
  addHeader(doc, "Záznam sečení", subtitle);

  let y = 28;

  y = addSection(doc, y, "Základní informace", [
    ["Datum", formatDate(record.date)],
    ["Kraj / Revír", record.region.name],
    ["Místo", record.location ?? "—"],
    ["Autor záznamu", record.user.fullName],
  ]);

  y = addSection(doc, y, "Pracovní doba & Počasí", [
    ["Pracovní doba", record.startTime && record.endTime
      ? `${record.startTime} – ${record.endTime}`
      : record.startTime ?? record.endTime ?? "—"],
    ["Počasí", record.weatherType?.name ?? "—"],
  ]);

  y = addSection(doc, y, "Obsluha / Pracovníci", [
    ["Pracovníci", record.workers.length
      ? record.workers.map((w) => `${w.firstName} ${w.lastName}`).join(", ")
      : "—"],
    ["Stroj / Traktor", record.machines.length ? record.machines.map((m) => m.name).join(", ") : "—"],
    ["Příslušenství", record.accessories.length ? record.accessories.map((a) => a.name).join(", ") : "—"],
  ]);

  y = addSection(doc, y, "Motohodiny (MTH)", [
    ["Počáteční MTH", record.mthStart != null ? `${record.mthStart}` : "—"],
    ["Koncové MTH", record.mthEnd != null ? `${record.mthEnd}` : "—"],
    ["Celkové MTH", record.mthTotal != null ? `${record.mthTotal} hod` : "—"],
  ]);

  y = addSection(doc, y, "Provozní hodnoty", [
    ["Auto / Vozidlo", record.vehicle
      ? `${record.vehicle.name}${record.vehicle.licensePlate ? ` (${record.vehicle.licensePlate})` : ""}`
      : "—"],
    ["Spotřeba", record.fuelConsumption != null ? `${record.fuelConsumption} l` : "—"],
    ["Tankování", record.refueling != null ? `${record.refueling} l` : "—"],
  ]);

  if (record.note) {
    y = addSection(doc, y, "Poznámka / Porucha", [["Poznámka", record.note]]);
  }

  y = addSection(doc, y, "Meta", [
    ["Vytvořeno", formatDateTime(record.createdAt)],
    ["Upraveno", formatDateTime(record.updatedAt)],
    ["Číslo záznamu", `#${record.id}`],
  ]);

  addFooter(doc);
  doc.save(`seceni-${record.id}-${record.date}.pdf`);
}

export async function exportFellingListPdf(
  records: {
    id: number;
    date: string;
    region: { name: string };
    location?: string | null;
    user: { fullName: string };
    startTime?: string | null;
    endTime?: string | null;
    weatherType?: { name: string } | null;
    workers: { firstName: string; lastName: string }[];
    vehicles: { name: string }[];
    machines: { name: string }[];
    mth?: number | string | null;
    fuelConsumption?: number | string | null;
  }[],
  filterDesc?: string,
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  await loadFonts(doc);

  doc.setFillColor(...GREEN);
  doc.rect(0, 0, 297, 20, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont("Roboto", "bold");
  doc.text("Záznamy kácení", 14, 9);
  doc.setFontSize(8);
  doc.setFont("Roboto", "normal");
  doc.text(filterDesc ? `Filtr: ${filterDesc}` : `Celkem záznamů: ${records.length}`, 14, 16);

  const tableData = records.map((r) => [
    formatDate(r.date),
    r.region.name,
    r.location ?? "—",
    r.user.fullName,
    r.startTime && r.endTime ? `${r.startTime}–${r.endTime}` : r.startTime ?? "—",
    r.weatherType?.name ?? "—",
    r.workers.map((w) => `${w.firstName} ${w.lastName}`).join(", ") || "—",
    r.vehicles.map((v) => v.name).join(", ") || "—",
    r.machines.map((m) => m.name).join(", ") || "—",
    r.mth != null ? `${r.mth}` : "—",
    r.fuelConsumption != null ? `${r.fuelConsumption} l` : "—",
  ]);

  autoTable(doc, {
    startY: 24,
    head: [["Datum", "Revír", "Místo", "Autor", "Doba", "Počasí", "Pracovníci", "Vozidla", "Stroje", "MTH", "Spotřeba"]],
    body: tableData,
    styles: { fontSize: 7.5, cellPadding: 2, textColor: TEXT_DARK, font: "Roboto" },
    headStyles: { fillColor: GREEN, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8, font: "Roboto" },
    alternateRowStyles: { fillColor: [248, 252, 248] },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 30 },
      2: { cellWidth: 22 },
      3: { cellWidth: 28 },
      4: { cellWidth: 18 },
      5: { cellWidth: 18 },
      6: { cellWidth: 38 },
      7: { cellWidth: 28 },
      8: { cellWidth: 28 },
      9: { cellWidth: 14 },
      10: { cellWidth: 16 },
    },
    didDrawPage: () => {
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(7);
      doc.setFont("Roboto", "normal");
      doc.setTextColor(...TEXT_MUTED);
      doc.text(`Vygenerováno: ${formatDateTime(new Date().toISOString())}`, 14, pageHeight - 5);
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  doc.save(`kaceni-seznam-${today}.pdf`);
}

export async function exportMowingListPdf(
  records: {
    id: number;
    date: string;
    region: { name: string };
    location?: string | null;
    user: { fullName: string };
    startTime?: string | null;
    endTime?: string | null;
    weatherType?: { name: string } | null;
    workers: { firstName: string; lastName: string }[];
    machines: { name: string }[];
    vehicle?: { name: string } | null;
    mthStart?: number | null;
    mthEnd?: number | null;
    mthTotal?: number | null;
    fuelConsumption?: number | null;
  }[],
  filterDesc?: string,
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  await loadFonts(doc);

  doc.setFillColor(...GREEN);
  doc.rect(0, 0, 297, 20, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont("Roboto", "bold");
  doc.text("Záznamy sečení", 14, 9);
  doc.setFontSize(8);
  doc.setFont("Roboto", "normal");
  doc.text(filterDesc ? `Filtr: ${filterDesc}` : `Celkem záznamů: ${records.length}`, 14, 16);

  const tableData = records.map((r) => [
    formatDate(r.date),
    r.region.name,
    r.location ?? "—",
    r.user.fullName,
    r.startTime && r.endTime ? `${r.startTime}–${r.endTime}` : r.startTime ?? "—",
    r.weatherType?.name ?? "—",
    r.workers.map((w) => `${w.firstName} ${w.lastName}`).join(", ") || "—",
    r.machines.map((m) => m.name).join(", ") || "—",
    r.vehicle?.name ?? "—",
    r.mthStart != null ? `${r.mthStart}` : "—",
    r.mthEnd != null ? `${r.mthEnd}` : "—",
    r.mthTotal != null ? `${r.mthTotal}` : "—",
    r.fuelConsumption != null ? `${r.fuelConsumption} l` : "—",
  ]);

  autoTable(doc, {
    startY: 24,
    head: [["Datum", "Revír", "Místo", "Autor", "Doba", "Počasí", "Pracovníci", "Stroje", "Vozidlo", "MTH zač.", "MTH konc.", "MTH cel.", "Spotřeba"]],
    body: tableData,
    styles: { fontSize: 7, cellPadding: 2, textColor: TEXT_DARK, font: "Roboto" },
    headStyles: { fillColor: GREEN, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.5, font: "Roboto" },
    alternateRowStyles: { fillColor: [248, 252, 248] },
    columnStyles: {
      0: { cellWidth: 19 },
      1: { cellWidth: 26 },
      2: { cellWidth: 20 },
      3: { cellWidth: 24 },
      4: { cellWidth: 16 },
      5: { cellWidth: 16 },
      6: { cellWidth: 34 },
      7: { cellWidth: 26 },
      8: { cellWidth: 22 },
      9: { cellWidth: 15 },
      10: { cellWidth: 15 },
      11: { cellWidth: 15 },
      12: { cellWidth: 15 },
    },
    didDrawPage: () => {
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(7);
      doc.setFont("Roboto", "normal");
      doc.setTextColor(...TEXT_MUTED);
      doc.text(`Vygenerováno: ${formatDateTime(new Date().toISOString())}`, 14, pageHeight - 5);
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  doc.save(`seceni-seznam-${today}.pdf`);
}
