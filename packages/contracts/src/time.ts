export const businessTimeZone = "Europe/Prague";

const inputFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: businessTimeZone, year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

export function businessDateTimeInput(value: string | Date = new Date()): string {
  const parts = Object.fromEntries(inputFormatter.formatToParts(new Date(value)).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function businessDate(value: string | Date = new Date()): string {
  return businessDateTimeInput(value).slice(0, 10);
}

export function businessTime(value: string | Date): string {
  return new Date(value).toLocaleTimeString("cs-CZ", { timeZone: businessTimeZone, hour: "2-digit", minute: "2-digit" });
}

export function businessDateTimeCandidates(value: string): string[] {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return [];
  const nominal = Date.parse(`${value}:00Z`);
  if (!Number.isFinite(nominal)) return [];
  const candidates = new Set<string>();
  for (const hours of [-36, 0, 36]) {
    const sample = nominal + hours * 3_600_000;
    const offset = Date.parse(`${businessDateTimeInput(new Date(sample))}:00Z`) - sample;
    const candidate = new Date(nominal - offset);
    if (businessDateTimeInput(candidate) === value) candidates.add(candidate.toISOString());
  }
  return [...candidates].sort();
}

export function resolveBusinessDateTime(value: string, occurrence?: string): string {
  const candidates = businessDateTimeCandidates(value);
  if (!candidates.length) throw new RangeError("Tento čas v pásmu Europe/Prague neexistuje. Zkontrolujte datum a změnu letního času.");
  if (candidates.length > 1 && occurrence !== "earlier" && occurrence !== "later") {
    throw new RangeError("Tato hodina nastává dvakrát. Vyberte první nebo druhý výskyt času.");
  }
  return candidates[occurrence === "later" ? candidates.length - 1 : 0]!;
}
