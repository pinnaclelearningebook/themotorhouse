"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { stepOneSchema, stepTwoSchema } from "@/lib/validation";
import { createSubmission, updateSubmission } from "@/lib/submissions";
import { sendOperatorAlert, sendSellerConfirmation } from "@/lib/email";

export type StepOneState =
  | { status: "idle" }
  | {
      status: "error";
      fieldErrors: Record<string, string[] | undefined>;
      formError?: string;
    }
  | { status: "success"; id: string; reg: string };

export type StepTwoState =
  | { status: "idle" }
  | {
      status: "error";
      fieldErrors: Record<string, string[] | undefined>;
      formError?: string;
    };

const TRY_AGAIN =
  "Something went wrong at our end. Please try again, or call us instead.";

export async function submitStepOne(
  _prev: StepOneState,
  formData: FormData,
): Promise<StepOneState> {
  const parsed = stepOneSchema.safeParse({
    reg: formData.get("reg"),
    mileage: formData.get("mileage"),
    postcode: formData.get("postcode"),
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    model: formData.get("model") ?? undefined,
    marketingConsent: formData.get("marketingConsent") === "on",
  });

  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  let id: string;
  try {
    ({ id } = await createSubmission(parsed.data));
  } catch (error) {
    console.error("createSubmission failed", error);
    return { status: "error", fieldErrors: {}, formError: TRY_AGAIN };
  }

  // The lead is stored — email failures must not fail the submission.
  const results = await Promise.allSettled([
    sendOperatorAlert({ ...parsed.data, id }),
    sendSellerConfirmation({ ...parsed.data, id }),
  ]);
  for (const result of results) {
    if (result.status === "rejected") {
      console.error("valuation email failed", result.reason);
    }
  }

  return { status: "success", id, reg: parsed.data.reg };
}

export async function submitStepTwo(
  _prev: StepTwoState,
  formData: FormData,
): Promise<StepTwoState> {
  const id = formData.get("submissionId");
  if (typeof id !== "string" || id.length === 0) {
    return { status: "error", fieldErrors: {}, formError: TRY_AGAIN };
  }

  const parsed = stepTwoSchema.safeParse({
    financeOutstanding: formData.get("financeOutstanding"),
    serviceHistory: formData.get("serviceHistory"),
    keepers: formData.get("keepers") || null,
    conditionNotes: formData.get("conditionNotes"),
    sellTimeline: formData.get("sellTimeline"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  try {
    await updateSubmission(id, parsed.data);
  } catch (error) {
    console.error("updateSubmission failed", error);
    return { status: "error", fieldErrors: {}, formError: TRY_AGAIN };
  }

  redirect("/valuation/thank-you");
}
