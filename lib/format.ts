/**
 * DVLA and DVSA return vehicle text in capitals ("LAND ROVER",
 * "SANTORINI BLACK"). Rendering that as-is shouts, which breaks the
 * sentence-case rule in CLAUDE.md section 4 and makes the site read like
 * a database dump rather than a person describing a car.
 */
const KEEP_UPPER = new Set(["BMW", "GLE", "GLC", "GLA", "SUV", "AMG", "TDI", "GTI", "4X4"]);

function capitalise(word: string): string {
  if (KEEP_UPPER.has(word.toUpperCase())) return word.toUpperCase();
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

export function titleCaseVehicle(value: string): string {
  return value
    .split(/\s+/)
    // Hyphenated makes are common ("MERCEDES-BENZ", "ROLLS-ROYCE") and
    // each part needs capitalising, not just the first.
    .map((word) => word.split("-").map(capitalise).join("-"))
    .join(" ");
}
