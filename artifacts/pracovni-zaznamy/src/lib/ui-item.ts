export function itemString<T extends object>(item: T, key: string): string {
  const value = (item as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : '';
}

export function itemNullableString<T extends object>(item: T, key: string): string | null {
  const value = (item as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : null;
}
