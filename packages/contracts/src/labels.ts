/** Czech display labels. Stored codes and API values remain stable. */
export const workActivities = [
  ["SAWYER", "Pilař"],
  ["TRACTOR_DRIVER", "Řidič traktoru"],
  ["HANDLING", "Manipulace"],
  ["CLEANUP", "Úklid"],
  ["OTHER", "Ostatní"],
] as const;

const workStates: Record<string, string> = {
  DRAFT: "Rozpracováno",
  SUBMITTED: "Odesláno ke schválení",
  PARTIALLY_APPROVED: "Částečně schváleno",
  APPROVED: "Schváleno",
  RETURNED: "Vráceno k opravě",
};
const shifts: Record<string, string> = { MORNING: "Ranní směna", NIGHT: "Noční směna" };
const projects: Record<string, string> = { OPEN: "Otevřená", CLOSED: "Uzavřená" };
const roles: Record<string, string> = {
  WORKER: "Pracovník", LEADER: "Vedoucí", ADMIN: "Administrátor", ACCOUNTANT: "Účetní",
};
const lookup = (labels: Record<string, string>, code: string, fallback: string) =>
  Object.hasOwn(labels, code) ? labels[code]! : fallback;

export const workStateLabel = (code: string) => lookup(workStates, code, "Neznámý stav");
export const shiftLabel = (code: string) => lookup(shifts, code, "Neznámá směna");
export const projectStatusLabel = (code: string) => lookup(projects, code, "Neznámý stav zakázky");
export const roleLabel = (code: string) => lookup(roles, code, "Neznámá role");
export const fuelCategoryLabel = (code: string) => code === "BRUSHCUTTER" ? "Křovinořezy" : "Neznámá kategorie";
