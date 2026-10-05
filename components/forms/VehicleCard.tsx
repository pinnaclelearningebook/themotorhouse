import type { MotTest, VehicleIdentity } from "@/lib/types";
import { formatReg } from "@/lib/reg";

/**
 * "Is this your car?" — the recognition moment (CLAUDE.md section 4,
 * lever 9). Everything factual here came from DVLA or DVSA, never from
 * us, and every value is in mono because it is vehicle data.
 *
 * Model and last-recorded mileage come from MOT history, which does not
 * exist for a vehicle under about three years old. That is a normal
 * state, not an error: the card shows what is known and asks for the
 * model in one field. See ARCHITECTURE.md section 3.
 */

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-line py-2.5 last:border-b-0">
      <dt className="text-sm text-structure">{label}</dt>
      <dd className="data-inline text-right text-sm">{value}</dd>
    </div>
  );
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b[a-z]/g, (character) => character.toUpperCase());
}

export function VehicleCard({
  vehicle,
  mot,
}: {
  vehicle: VehicleIdentity;
  mot: MotTest[];
}) {
  const latest = mot.find((test) => test.odometer !== null) ?? null;

  const rows: Array<{ label: string; value: string }> = [];
  if (vehicle.make) rows.push({ label: "Make", value: titleCase(vehicle.make) });
  if (vehicle.model) {
    rows.push({ label: "Model", value: titleCase(vehicle.model) });
  }
  if (vehicle.yearOfManufacture) {
    rows.push({ label: "Year", value: String(vehicle.yearOfManufacture) });
  }
  if (vehicle.colour) {
    rows.push({ label: "Colour", value: titleCase(vehicle.colour) });
  }
  if (vehicle.fuel) rows.push({ label: "Fuel", value: titleCase(vehicle.fuel) });
  if (vehicle.engineCc) {
    rows.push({ label: "Engine", value: `${vehicle.engineCc} cc` });
  }
  if (vehicle.motExpiry) {
    rows.push({ label: "MOT expires", value: vehicle.motExpiry });
  }
  if (latest?.odometer) {
    rows.push({
      label: latest.testDate
        ? `Mileage at last MOT (${latest.testDate})`
        : "Mileage at last MOT",
      value: `${latest.odometer.toLocaleString("en-GB")} ${
        latest.odometerUnit?.toLowerCase() === "km" ? "km" : "miles"
      }`,
    });
  }

  return (
    <div className="rounded border border-line bg-paper-warm p-6">
      <p className="data-inline text-sm text-structure">
        {formatReg(vehicle.reg)}
      </p>
      <dl className="mt-4">
        {rows.map((row) => (
          <Row key={row.label} label={row.label} value={row.value} />
        ))}
      </dl>
      {!vehicle.model && (
        <p className="mt-4 text-caption text-structure">
          The DVLA record does not include the model, and there is no MOT
          history to take it from yet. We will ask you for it next.
        </p>
      )}
    </div>
  );
}
