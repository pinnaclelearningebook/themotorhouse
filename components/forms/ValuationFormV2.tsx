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
import { FormProgress } from "./FormProgress";
import type { PendingPhoto } from "./PhotoUpload";
import { AgentWidget } from "@/components/agent/AgentWidget";

/**
 * The four-step form (CLAUDE.md section 9).
 *
 * The lead row is created the moment the car is confirmed, and steps
 * 2, 3 and 4 patch it. Every contact detail arrives at step 4, so a
 * row carries nobody to ring until that step submits — the inbox calls
 * those rows incomplete and hides them, and /admin counts them as
 * drop-off.
 *
 * That is the owner's decision of 15 October 2026, and it is a
 * trade: the old flow took a number at the end of step 1, so every
 * abandoned form still left someone callable. The first step is one
 * field again, which is what lever 4 in section 4 actually asks for.
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
  preferredContactMethod: "",
  phone: "",
  email: "",
  postcode: "",
  contactWindow: "",
  marketingConsent: false,
};

type Step = "identify" | "car" | "sale" | "you" | "done";

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
  agentPreview = false,
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
  /** An admin is previewing her while she is off for the public. */
  agentPreview?: boolean;
}) {
  const [step, setStep] = useState<Step>("identify");
  const [identified, setIdentified] = useState<IdentifyResult | null>(null);
  // Set the moment step 1 persists. Everything after this patches it.
  const [leadId, setLeadId] = useState<string | null>(null);
  const [car, setCar] = useState<CarDetails>(EMPTY_CAR);
  const [sale, setSale] = useState<SaleDetails>(EMPTY_SALE);
  const [contact, setContact] = useState<ContactDetails>(EMPTY_CONTACT);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();
  /*
   * Step 4's own pending state, separate from the shared transition.
   *
   * `pending` is true while *any* step is saving, and leaveSale starts
   * its patch and advances in the same breath — so for about two
   * seconds after arriving at step 4 the submit button sat disabled
   * reading "Sending your request…" when nothing had been submitted.
   * A seller reaching straight for it found it dead and lying. The
   * save in the background does not concern them; their own submit
   * does.
   */
  const [submitting, setSubmitting] = useState(false);
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

  /** Step 1 confirmed: create the row, then straight on to the car. */
  async function startFromReg(result: IdentifyResult) {
    const created = await startLeadAction({
      reg: result.reg,
      model: car.model || undefined,
    });
    if (created.status === "error") {
      setErrors(created.fieldErrors);
      setFormError(created.formError);
      return;
    }
    if (created.status === "created") {
      setLeadId(created.id);
      setErrors({});
      setFormError(undefined);
      setStep("car");
    }
  }

  function submit() {
    const read = readFields([
      "name", "phone", "email", "postcode", "contactWindow",
    ]);
    const next = { ...contact, ...read } as ContactDetails;
    setContact(next);
    setSubmitting(true);

    startTransition(async () => {
      if (!leadId) {
        setSubmitting(false);
        return;
      }
      const result = await completeLeadAction(
        leadId,
        {
          name: next.name,
          preferredContactMethod: next.preferredContactMethod,
          phone: next.phone,
          email: next.email,
          postcode: next.postcode,
          contactWindow: next.contactWindow || null,
          marketingConsent: next.marketingConsent,
        },
        {
          reg: identified?.reg ?? "",
          mileage: car.mileage ? Number(car.mileage) : null,
        },
      );
      if (result.status === "error") {
        setErrors(result.fieldErrors);
        setFormError(result.formError);
        setSubmitting(false);
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
   * Everything a step is wrapped in: the progress indicator above it,
   * and the assistant beside it.
   *
   * The assistant is a floating launcher, from the moment the car is
   * identified (CLAUDE.md section 10) — never on the registration step,
   * where the only thing asked for is one field. It is rendered beside
   * the step rather than inside it so remounting a step cannot restart
   * the conversation, and positions itself.
   *
   * The car's name is not passed: the server resolves it from the
   * registration when it writes the opening line, so there is one place
   * that decides what she says first.
   */
  function withAgent(node: React.ReactNode, progress: number) {
    return (
      <>
        <FormProgress current={progress} />
        {node}
        {agentEnabled && identified && (
          <AgentWidget
            leadId={leadId}
            reg={identified.reg}
            preview={agentPreview}
          />
        )}
      </>
    );
  }

  if (step === "identify" || !identified) {
    return withAgent(
      <IdentifyStep
        initialReg={initialReg}
        onIdentified={(result) => {
          setIdentified(result);
          // Confirming the car is the whole of step 1 now. The row is
          // written here and the seller goes straight to step 2; there
          // is nothing left to ask on this screen.
          startTransition(() => {
            void startFromReg(result);
          });
        }}
      />,
      0,
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
      />,
      1,
    );
  }

  if (step === "sale") {
    return withAgent(
      <StepSale
        value={sale}
        onBack={() => setStep("car")}
        onContinue={leaveSale}
        error={errors.timeline?.[0]}
      />,
      2,
    );
  }

  if (step === "you") {
    return withAgent(
      <StepYou
        value={contact}
        onChange={setContact}
        onBack={() => setStep("sale")}
        onSubmit={submit}
        pending={submitting}
        errors={errors}
        formError={formError}
      />,
      3,
    );
  }

  // step === "done": the redirect to /valuation/thank-you is in flight.
  return (
    <p className="step-in text-structure" role="status">
      Sending your request…
    </p>
  );
}
