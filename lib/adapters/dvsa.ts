import "server-only";
import type { MotDefect, MotDefectType, MotTest } from "@/lib/types";

/**
 * DVSA MOT History API (the current OAuth2 one — the older
 * beta.check-mot.service.gov.uk API was retired in September 2025).
 *
 * Auth is OAuth2 client credentials against a Microsoft tenant endpoint
 * that DVSA issues at registration, so the token URL is configuration
 * rather than a constant. Tokens last 60 minutes and are cached in
 * module scope; worst case on a cold start is one extra token fetch.
 */

const TOKEN_URL = process.env.DVSA_MOT_TOKEN_URL ?? "";
const API_BASE =
  process.env.DVSA_MOT_API_BASE ?? "https://history.mot.api.gov.uk";
const SCOPE = process.env.DVSA_MOT_SCOPE ?? "https://tapi.dvsa.gov.uk/.default";

export function isDvsaConfigured(): boolean {
  return Boolean(
    process.env.DVSA_MOT_CLIENT_ID &&
      process.env.DVSA_MOT_CLIENT_SECRET &&
      process.env.DVSA_MOT_API_KEY &&
      TOKEN_URL,
  );
}

let cachedToken: { value: string; expiresAt: number } | null = null;

/** Exported for tests; resets the module-scope token cache. */
export function resetTokenCache(): void {
  cachedToken = null;
}

async function accessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now) return cachedToken.value;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: process.env.DVSA_MOT_CLIENT_ID as string,
    client_secret: process.env.DVSA_MOT_CLIENT_SECRET as string,
    scope: SCOPE,
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`DVSA token failed: ${response.status}`);

  const json = (await response.json()) as {
    access_token: string;
    expires_in?: number;
  };
  // Expire a minute early so a token never dies mid-request.
  const ttl = ((json.expires_in ?? 3600) - 60) * 1000;
  cachedToken = { value: json.access_token, expiresAt: now + ttl };
  return cachedToken.value;
}

interface DvsaDefect {
  type?: string;
  text?: string;
}

interface DvsaTest {
  completedDate?: string;
  testResult?: string;
  expiryDate?: string;
  odometerValue?: string | number;
  odometerUnit?: string;
  defects?: DvsaDefect[];
}

export interface DvsaResponse {
  make?: string;
  model?: string;
  primaryColour?: string;
  fuelType?: string;
  firstUsedDate?: string;
  motTests?: DvsaTest[];
}

const DEFECT_TYPES: MotDefectType[] = [
  "advisory",
  "minor",
  "major",
  "dangerous",
  "fail",
];

function mapDefect(defect: DvsaDefect): MotDefect {
  const type = (defect.type ?? "").toLowerCase() as MotDefectType;
  return {
    type: DEFECT_TYPES.includes(type) ? type : "advisory",
    text: defect.text ?? "",
  };
}

export function mapDvsa(raw: DvsaResponse): {
  make: string | null;
  model: string | null;
  colour: string | null;
  tests: MotTest[];
} {
  const tests = (raw.motTests ?? []).map((test) => ({
    testDate: test.completedDate ?? null,
    result: test.testResult ?? null,
    expiryDate: test.expiryDate ?? null,
    odometer:
      test.odometerValue === undefined || test.odometerValue === null
        ? null
        : Number(test.odometerValue) || null,
    odometerUnit: test.odometerUnit ?? null,
    defects: (test.defects ?? []).map(mapDefect),
  }));

  // Newest first, so "last recorded mileage" is tests[0].
  tests.sort((a, b) => (b.testDate ?? "").localeCompare(a.testDate ?? ""));

  return {
    make: raw.make ?? null,
    model: raw.model ?? null,
    colour: raw.primaryColour ?? null,
    tests,
  };
}

export async function fetchDvsa(reg: string): Promise<DvsaResponse | null> {
  if (!isDvsaConfigured()) return null;

  const token = await accessToken();
  const response = await fetch(
    `${API_BASE}/v1/trade/vehicles/registration/${encodeURIComponent(reg)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-API-Key": process.env.DVSA_MOT_API_KEY as string,
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );

  // No MOT record is the normal case for a vehicle under ~3 years old.
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`DVSA lookup failed: ${response.status}`);

  return (await response.json()) as DvsaResponse;
}
