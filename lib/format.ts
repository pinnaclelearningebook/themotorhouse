/**
 * DVLA and DVSA return vehicle text in capitals ("LAND ROVER",
 * "SANTORINI BLACK"). Rendering that as-is shouts, which breaks the
 * sentence-case rule in CLAUDE.md section 4 and makes the site read like
 * a database dump rather than a person describing a car.
 */
const KEEP_UPPER = new Set([
  "BMW", "SUV", "AMG", "TDI", "GTI", "4X4", "GT",
  // Trim and spec acronyms. These turn up in derivative strings far more
  // than in make or model, so they only started mattering once
  // comparables began recording derivatives ("110 D300 X-DYNAMIC HSE").
  // Alphanumeric codes like D300 and P400 already survive capitalise().
  "HSE", "SE", "SVR", "HST", "RS", "ST", "VXR", "XS", "XSE",
  "TDV6", "SDV6", "SD4", "TD4", "TD5", "HDI", "CDI", "GTD",
  // Mercedes
  "GLE", "GLC", "GLA", "GLB", "GLS", "CLA", "CLS", "SLK",
  // Lexus
  "RX", "NX", "UX", "LX", "GX", "ES", "IS", "LS", "LC", "RC", "CT",
]);

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
