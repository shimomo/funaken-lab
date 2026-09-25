export function percent(value: number | null, digits = 1): string {
  return value === null ? '—' : `${(value * 100).toFixed(digits)}%`;
}

export function yen(value: number): string {
  return `${Math.round(value).toLocaleString('ja-JP')}円`;
}

export function count(value: number): string {
  return value.toLocaleString('ja-JP');
}

export function signedYen(value: number): string {
  return value > 0 ? `+${yen(value)}` : yen(value);
}
