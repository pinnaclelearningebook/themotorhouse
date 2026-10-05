import { NextResponse } from "next/server";
import { z } from "zod";
import { db, isDatabaseConfigured } from "@/lib/db";
import { fetchDvla, isDvlaConfigured } from "@/lib/adapters/dvla";
import { fetchDvsa, isDvsaConfigured, mapDvsa } from "@/lib/adapters/dvsa";
import { checkRateLimit, pruneRateLimits } from "@/lib/rate-limit";
import { isPlausibleReg, normaliseReg } from "@/lib/reg";
import type { MotTest, VehicleIdentity, VehicleLookup } from "@/lib/types";

/**
 * POST { reg } → { vehicle, mot, source }
 *
 * Order of operations per ARCHITECTURE.md section 3: normalise, validate,
 * rate limit, serve from cache within 24h, then DVLA, then DVSA.
 *
 * Never returns an upstream error body or a key. A DVLA failure is a 502;
 * a DVSA failure is not, because MOT history is optional by design.
 */

export const dynamic = "force-dynamic";

const CACHE_HOURS = 24;

const bodySchema = z.object({ reg: z.string().min(1).max(16) });

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: Request): Promise<NextResponse> {
  let parsed: { reg: string };
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: "Send a registration." },
      { status: 400 },
    );
  }

  const reg = normaliseReg(parsed.reg);
  if (!isPlausibleReg(reg)) {
    return NextResponse.json(
      { error: "That does not look like a UK registration." },
      { status: 400 },
    );
  }

  const limit = await checkRateLimit("vehicle_lookup", clientIp(request));
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many lookups. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter ?? 60) } },
    );
  }

  // No keys: the form proceeds on manual entry and the dev banner shows.
  if (!isDvlaConfigured()) {
    return NextResponse.json({
      vehicle: null,
      mot: [],
      source: "stub",
    } satisfies VehicleLookup);
  }

  const cached = await readCache(reg);
  if (cached) return NextResponse.json(cached);

  let vehicle: VehicleIdentity;
  let rawDvla: unknown;
  try {
    const result = await fetchDvla(reg);
    if (!result) {
      return NextResponse.json(
        { error: "We could not find that registration." },
        { status: 404 },
      );
    }
    vehicle = result.vehicle;
    rawDvla = result.raw;
  } catch (error) {
    console.error("DVLA lookup failed", error);
    return NextResponse.json(
      { error: "Vehicle lookup is unavailable. Enter the details manually." },
      { status: 502 },
    );
  }

  // MOT history is where model and mileage come from, and it legitimately
  // does not exist for a vehicle under ~3 years old. A failure here
  // degrades the card, it does not fail the request.
  let mot: MotTest[] = [];
  let motUnavailable = false;
  if (isDvsaConfigured()) {
    try {
      const raw = await fetchDvsa(reg);
      if (raw) {
        const mapped = mapDvsa(raw);
        mot = mapped.tests;
        vehicle.model = mapped.model ?? vehicle.model;
        vehicle.make = vehicle.make ?? mapped.make;
        vehicle.colour = vehicle.colour ?? mapped.colour;
      }
    } catch (error) {
      console.error("DVSA lookup failed", error);
      motUnavailable = true;
    }
  } else {
    motUnavailable = true;
  }

  await writeCache(reg, vehicle, mot, rawDvla);
  void pruneRateLimits().catch(() => {});

  return NextResponse.json({
    vehicle,
    mot,
    source: "live",
    ...(motUnavailable ? { motUnavailable: true } : {}),
  } satisfies VehicleLookup);
}

async function readCache(reg: string): Promise<VehicleLookup | null> {
  if (!isDatabaseConfigured()) return null;

  const since = new Date(Date.now() - CACHE_HOURS * 3600 * 1000).toISOString();
  const { data } = await db()
    .from("vehicles")
    .select("*")
    .eq("reg", reg)
    .gte("fetched_at", since)
    .maybeSingle();

  if (!data) return null;

  const { data: tests } = await db()
    .from("mot_tests")
    .select("*")
    .eq("vehicle_id", data.id)
    .order("test_date", { ascending: false });

  return {
    vehicle: {
      reg,
      make: data.make,
      model: data.model,
      derivative: data.derivative,
      colour: data.colour,
      fuel: data.fuel,
      engineCc: data.engine_cc,
      yearOfManufacture: data.year_of_manufacture,
      firstRegistered: data.first_registered,
      taxStatus: data.tax_status,
      taxDue: data.tax_due,
      motStatus: data.mot_status,
      motExpiry: data.mot_expiry,
      co2: data.co2,
      euroStatus: data.euro_status,
      typeApproval: data.type_approval,
      wheelplan: data.wheelplan,
    },
    mot: (tests ?? []).map((t) => ({
      testDate: t.test_date,
      result: t.result,
      expiryDate: t.expiry_date,
      odometer: t.odometer,
      odometerUnit: t.odometer_unit,
      defects: t.defects ?? [],
    })),
    source: "cache",
  };
}

async function writeCache(
  reg: string,
  vehicle: VehicleIdentity,
  mot: MotTest[],
  rawDvla: unknown,
): Promise<void> {
  if (!isDatabaseConfigured()) return;

  const { data, error } = await db()
    .from("vehicles")
    .upsert(
      {
        reg,
        fetched_at: new Date().toISOString(),
        make: vehicle.make,
        model: vehicle.model,
        derivative: vehicle.derivative,
        colour: vehicle.colour,
        fuel: vehicle.fuel,
        engine_cc: vehicle.engineCc,
        year_of_manufacture: vehicle.yearOfManufacture,
        first_registered: vehicle.firstRegistered,
        tax_status: vehicle.taxStatus,
        tax_due: vehicle.taxDue,
        mot_status: vehicle.motStatus,
        mot_expiry: vehicle.motExpiry,
        co2: vehicle.co2,
        euro_status: vehicle.euroStatus,
        type_approval: vehicle.typeApproval,
        wheelplan: vehicle.wheelplan,
        raw_dvla: rawDvla as Record<string, unknown>,
      },
      { onConflict: "reg" },
    )
    .select("id")
    .single();

  if (error || !data) {
    console.error("vehicle cache write failed", error);
    return;
  }

  if (mot.length > 0) {
    await db().from("mot_tests").delete().eq("vehicle_id", data.id);
    await db()
      .from("mot_tests")
      .insert(
        mot.map((test) => ({
          vehicle_id: data.id,
          test_date: test.testDate,
          result: test.result,
          expiry_date: test.expiryDate,
          odometer: test.odometer,
          odometer_unit: test.odometerUnit,
          defects: test.defects,
        })),
      );
  }
}
