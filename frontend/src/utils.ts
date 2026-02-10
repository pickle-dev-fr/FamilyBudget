export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function formatAmount(value?: number | null) {
  const safeValue = typeof value === "number" ? value : 0;

  return safeValue.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function reorderIds<T extends { id: string }>(items: T[]): string[] {
    return items.map(i => i.id);
}
