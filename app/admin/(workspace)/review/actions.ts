"use server";

import { revalidatePath } from "next/cache";
import { currentAdmin } from "@/lib/admin/auth";
import { seedVoiceTestLead } from "@/lib/admin/voice-test";

/**
 * Seed a car to test voice against, from the review page.
 *
 * Only an admin reaches this — the whole /admin tree is gated — and it is
 * checked again here rather than relied upon, because a Server Action is
 * an endpoint whatever page it appears on.
 */
export async function createVoiceTestLead(): Promise<void> {
  const admin = await currentAdmin();
  if (!admin) throw new Error("not signed in");

  const seeded = await seedVoiceTestLead(admin.email);
  if (!seeded) throw new Error("could not seed the test lead");

  revalidatePath("/admin/review");
  revalidatePath(`/admin/leads/${seeded.leadId}`);
}
