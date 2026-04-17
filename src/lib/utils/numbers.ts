export function parseFrenchInteger(value: string): number {
  const cleaned = value.replace(/[^\d-]/g, "");
  return cleaned ? Number.parseInt(cleaned, 10) : 0;
}

export function formatInteger(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value);
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}