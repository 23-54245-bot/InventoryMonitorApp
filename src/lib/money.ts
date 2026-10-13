/**
 * Philippine Peso (PHP) Money & Centavo Math Utilities
 * Prevents floating point errors when computing POS cart totals,
 * discounts, split payments, and credit balances.
 */

export function toCentavos(pesos: number): number {
  if (isNaN(pesos) || !isFinite(pesos)) return 0;
  return Math.round(pesos * 100);
}

export function fromCentavos(centavos: number): number {
  if (isNaN(centavos) || !isFinite(centavos)) return 0;
  return Math.round(centavos) / 100;
}

export function roundMoney(amount: number): number {
  if (isNaN(amount) || !isFinite(amount)) return 0;
  return fromCentavos(toCentavos(amount));
}

export function addMoney(...amounts: number[]): number {
  const sumCentavos = amounts.reduce((acc, curr) => acc + toCentavos(curr || 0), 0);
  return fromCentavos(sumCentavos);
}

export function subtractMoney(a: number, b: number): number {
  return fromCentavos(toCentavos(a || 0) - toCentavos(b || 0));
}

export function multiplyMoney(amount: number, multiplier: number): number {
  const centavos = toCentavos(amount || 0);
  return fromCentavos(Math.round(centavos * (multiplier || 0)));
}
