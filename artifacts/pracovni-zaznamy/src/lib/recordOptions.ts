export const FELLING_WORK_TYPE_OPTIONS = [
  { value: "kaceni", label: "Kácení" },
  { value: "odbodovani", label: "Odbodování" },
  { value: "kaceni_bezp", label: "Kácení BEZP" },
] as const;

export const MOWING_WORK_TYPE_OPTIONS = [
  { value: "seceni", label: "Sečení" },
  { value: "frezovani", label: "Frézování" },
  { value: "stavba", label: "Stavba" },
  { value: "seceni_kere", label: "Sečení keře" },
] as const;

export const MOWING_SECTION_OPTIONS = [
  { value: "sec_1", label: "SEČ. 1" },
  { value: "sec_2", label: "SEČ. 2" },
  { value: "sec_3", label: "SEČ. 3" },
] as const;

export const MOWING_KIND_OPTIONS = [
  { value: "strojni", label: "Strojní sečení" },
  { value: "rucni", label: "Ruční sečení" },
  { value: "svahove", label: "Svahové sekačky" },
] as const;

export function getOptionLabel(
  options: ReadonlyArray<{ value: string; label: string }>,
  value: string | null | undefined,
) {
  if (!value) return null;
  return options.find((option) => option.value === value)?.label ?? value;
}

export function formatHours(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return null;
  return `${value} h`;
}
