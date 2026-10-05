/**
 * UK registration handling.
 *
 * Normalisation is strict; validation is deliberately loose. Current,
 * prefix, suffix, dateless and personalised plates all have different
 * shapes, and policing them tightly loses real sellers over edge cases.
 * A wrong-looking reg simply returns no vehicle from DVLA, which the
 * form already handles via "not my car".
 */

/** Strip all whitespace and uppercase. "lm70 xyz" → "LM70XYZ". */
export function normaliseReg(input: string): string {
  return input.replace(/\s+/g, "").toUpperCase();
}

/** Plausible as a UK registration: 2-8 alphanumerics, at least one digit. */
export function isPlausibleReg(input: string): boolean {
  const reg = normaliseReg(input);
  return /^[A-Z0-9]{2,8}$/.test(reg) && /\d/.test(reg);
}

/** Display form: "LM70XYZ" → "LM70 XYZ" for current-style plates. */
export function formatReg(input: string): string {
  const reg = normaliseReg(input);
  const current = /^([A-Z]{2}\d{2})([A-Z]{3})$/.exec(reg);
  return current ? `${current[1]} ${current[2]}` : reg;
}
