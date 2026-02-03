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
