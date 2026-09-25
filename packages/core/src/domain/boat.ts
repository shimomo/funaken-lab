/** 枠番（1〜6）。1 号艇は `1`。 */
export const BOAT_NUMBERS = [1, 2, 3, 4, 5, 6] as const;

export type BoatNumber = (typeof BOAT_NUMBERS)[number];

export function isBoatNumber(value: unknown): value is BoatNumber {
  return typeof value === 'number' && (BOAT_NUMBERS as readonly number[]).includes(value);
}
