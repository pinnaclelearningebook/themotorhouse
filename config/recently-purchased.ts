/**
 * Real cars we actually bought — nothing else goes in this array.
 * The section renders nothing while it is empty. See PENDING-INFO.md
 * ("Recently purchased cars").
 */
export interface PurchasedCar {
  model: string;
  year: number;
  mileage: number;
  /** Path under /public to a real photograph of this car. */
  image: string;
}

export const RECENTLY_PURCHASED: PurchasedCar[] = [];
