// Money is calculated in integer cents and stored as numeric(10,2) strings.

export const toCents = (value: string | number | null | undefined): number => Math.round(Number(value ?? 0) * 100);

export const centsToDecimal = (cents: number): string => (cents / 100).toFixed(2);

export const decimalToNumber = (value: string | number | null | undefined): number =>
  value == null ? 0 : parseFloat(String(value));
