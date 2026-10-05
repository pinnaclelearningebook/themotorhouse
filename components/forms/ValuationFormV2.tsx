"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  completeLeadAction,
  patchCarAction,
  patchSaleAction,
  startLeadAction,
} from "@/app/actions/valuation";
import { IdentifyStep, type IdentifyResult } from "./IdentifyStep";
import { StepCar, type CarDetails } from "./StepCar";
import { StepSale, type SaleDetails } from "./StepSale";
import { StepYou, type ContactDetails } from "./StepYou";
import { PhoneStep } from "./PhoneStep";
import type { PendingPhoto } from "./PhotoUpload";
import { AgentWidget } from "@/components/agent/AgentWidget";
import { titleCaseVehicle } from "@/lib/format";

/**
 * The four-step form (CLAUDE.md section 9).
 *
 * Steps 2 and 3 are held here in component state. The lead row is
 * created when step 4 submits, because section 9 requires a confirmed
 * registration AND contact details before a lead exists. The cost of
 * that — a seller who abandons at step 3 leaves nothing — is recorded
 * in PENDING-INFO.md as a decision to revisit on real data.
 *
 * Photos upload to Blob during step 2 so the seller is not waiting at
 * the end; the photos rows are attached once the lead id exists.
 */

const EMPTY_CAR: CarDetails = {
  model: "",
  mileage: "",
  serviceHistory: "",
  keepers: "",
  condition: {},
  warningLights: "",
  knownFaults: "",
  modifications: "",
  photos: [],
};

const EMPTY_SALE: SaleDetails = {
  reasonForSale: "",
  timeline: "",
  financeOutstanding: "",
  settlementKnown: "",
  partExchangeInterest: "",
  fairPrice: "",
  othersApproached: "",
};

const EMPTY_CONTACT: ContactDetails = {
  name: "",
  phone: "",
  email: "",
  postcode: "",
  contactWindow: "",
  marketingConsent: false,
};

type Step = "identify" | "phone" | "car" | "sale" | "you" | "done";

/** Reads the current DOM values for an uncontrolled step before leaving it. */
function readFields(names: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of names) {
    const el = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(
      `[name="${name}"]`,
    );
    if (el) out[name] = el.value;
    const checked = document.querySelector<HTMLInputElement>(
      `input[name="${name}"]:checked`,
    );
    if (checked) out[name] = checked.value;
  }
  return out;
}

async function attachPhotos(leadId: string, photos: PendingPhoto[]) {
  if (photos.length === 0) return;
  try {
    await fetch("/api/photos/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        photos: photos.map((photo) => ({
          url: photo.url,
          shotType: photo.shotType,
          contentType: photo.contentType,
          bytes: photo.bytes,
          width: photo.width,
          height: photo.height,
          exifStripped: photo.exifStripped,
        })),
      }),
    });
  } catch {
    // The lead is already saved. A failed photo attach must not cost the
    // seller their submission; the auto-reply still invites photos by email.
  }
}

export function ValuationFormV2({
  initialReg,
  onComplete,
  agentEnabled = false,
}: {
  initialReg?: string;
  onComplete?: (leadId: string) => void;
  /**
   * Whether to offer the assistant at all. Resolved on the server from the
   * agent_enabled setting, so when she is off the seller is not offered
   * something that would immediately fail — and the default is false, so a
   * call site that forgets the prop shows no widget rather than a broken
   * one.
   */
  agentEnabled?: boolean;
}) {
  const [step, setStep] = useState<Step>("identify");
  const [identified, setIdentified] = useState<IdentifyResult | null>(null);
  // Set the moment step 1 persists. Everything after this patches it.
  const [leadId, setLeadId] = useState<string | null>(null);
  const [car, setCar] = useState<CarDetails>(EMPTY_CAR);
  const [sale, setSale] = useState<SaleDetails>(EMPTY_SALE);
  const [contact, setContact] = useState<ContactDetails>(EMPTY_CONTACT);
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const lastMileage =
    identified?.mot.find((test) => test.odometer !== null)?.odometer ?? null;

  function leaveCar() {
    const read = readFields([
      "model", "mileage", "keepers", "serviceHistory",
      "warningLights", "knownFaults", "modifications",
    ]);
    setCar({
      ...car,
      model: read.model ?? car.model,
      mileage: read.mileage ?? car.mileage,
      keepers: read.keepers ?? car.keepers,
      serviceHistory: read.serviceHistory ?? car.serviceHistory,
      warningLights: read.warningLights ?? car.warningLights,
      knownFaults: read.knownFaults ?? car.knownFaults,
      modifications: read.modifications ?? car.modifications,
    });
    startTransition(async () => {
      if (!leadId) return;
      await patchCarAction(leadId, {
        mileage: read.mileage || null,
        serviceHistory: read.serviceHistory || null,
        keepers: read.keepers || null,
        condition: Object.keys(car.condition).length ? car.condition : null,
        warningLights: read.warningLights || null,
        knownFaults: read.knownFaults || null,
        modifications: read.modifications || null,
      });
    });
    setStep("sale");
  }

  function leaveSale() {
    const read = readFields([
      "timeline", "reasonForSale", "financeOutstanding", "settlementKnown",
      "partExchangeInterest", "fairPrice", "othersApproached",
    ]);
    const next = { ...sale, ...read } as SaleDetails;
    setSale(next);
    if (!next.timeline) {
      setErrors({ timeline: ["Tell us when you are looking to sell"] });
      return;
    }
    setErrors({});
    startTransition(async () => {
      if (!leadId) return;
      await patchSaleAction(leadId, {
        reasonForSale: next.reasonForSale || null,
        timeline: next.timeline,
        financeOutstanding: next.financeOutstanding || null,
        settlementKnown: next.settlementKnown
          ? next.settlementKnown === "yes"
          : null,
        partExchangeInterest: next.partExchangeInterest
          ? next.partExchangeInterest === "yes"
          : null,
        fairPrice: next.fairPrice || null,
        othersApproached: next.othersApproached || null,
      });
    });
    setStep("you");
  }

  async function startWithPhone(enteredPhone: string) {
    setPhone(enteredPhone);
    const result = await startLeadAction({
      reg: identified?.reg ?? "",
      phone: enteredPhone,
      model: car.model || undefined,
    });
    if (result.status === "error") {
      setErrors(result.fieldErrors);
      setFormError(result.formError);
      return;
    }
    if (result.status === "created") {
      setLeadId(result.id);
      setErrors({});
      setFormError(undefined);
      setStep("car");
    }
  }

  function submit() {
    const read = readFields(["name", "email", "postcode", "contactWindow"]);
    const next = { ...contact, ...read } as ContactDetails;
    setContact(next);

    startTransition(async () => {
      if (!leadId) return;
      const result = await completeLeadAction(
        leadId,
        {
          name: next.name,
          email: next.email,
          postcode: next.postcode,
          contactWindow: next.contactWindow || null,
          marketingConsent: next.marketingConsent,
        },
        {
          reg: identified?.reg ?? "",
          phone: phone,
          mileage: car.mileage ? Number(car.mileage) : null,
        },
      );
      if (result.status === "error") {
        setErrors(result.fieldErrors);
        setFormError(result.formError);
        return;
      }
      await attachPhotos(leadId, car.photos);
      setErrors({});
      setFormError(undefined);
      setStep("done");
      onComplete?.(leadId);
      router.push("/valuation/thank-you");
    });
  }

  /**
   * The assistant sits below whichever step is showing, from the moment
   * the car is identified (CLAUDE.md section 10) — never on the
   * registration step, where the only thing asked for is one field.
   */
  function withAgent(node: React.ReactNode) {
    if (!agentEnabled || !identified) return node;
    const name = [identified.vehicle?.make, identified.vehicle?.model]
      .filter(Boolean)
      .map((part) => titleCaseVehicle(part as string))
      .join(" ");
    return (
      <>
        {node}
        <AgentWidget
          leadId={leadId}
          reg={identified.reg}
          vehicleName={name || null}
        />
      </>
    );
  }

  if (step === "identify" || !identified) {
    return (
      <IdentifyStep
        initialReg={initialReg}
        onIdentified={(result) => {
          setIdentified(result);
          setStep("phone");
        }}
      />
    );
  }

  if (step === "phone") {
    return withAgent(
      <PhoneStep
        reg={identified.reg}
        vehicle={identified.vehicle}
        value={phone}
        onContinue={(entered) =>
          startTransition(() => {
            void startWithPhone(entered);
          })
        }
        pending={pending}
        error={errors.phone?.[0]}
        formError={formError}
      />
    );
  }

  if (step === "car") {
    return withAgent(
      <StepCar
        vehicle={identified.vehicle}
        reg={identified.reg}
        initialMileage={lastMileage}
        value={car}
        onChange={setCar}
        onContinue={leaveCar}
      />
    );
  }

  if (step === "sale") {
    return withAgent(
      <StepSale
        value={sale}
        onBack={() => setStep("car")}
        onContinue={leaveSale}
        error={errors.timeline?.[0]}
      />
    );
  }

  if (step === "you") {
    return withAgent(
      <StepYou
        value={contact}
        onChange={setContact}
        onBack={() => setStep("sale")}
        onSubmit={submit}
        pending={pending}
        errors={errors}
        formError={formError}
      />
    );
  }

  // step === "done": the redirect to /valuation/thank-you is in flight.
  return (
    <p className="step-in text-structure" role="status">
      Sending your request…
    </p>
  );
}
