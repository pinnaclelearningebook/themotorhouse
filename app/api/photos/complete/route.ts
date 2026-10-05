import { NextResponse } from "next/server";
import { z } from "zod";
import { db, isDatabaseConfigured } from "@/lib/db";
import { isBlobConfigured } from "@/lib/adapters/blob";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_PHOTO_BYTES,
  MAX_PHOTOS,
  shotType,
} from "@/config/photos";

/**
 * Attaches uploaded blobs to a lead. Called by the client once the lead
 * exists, because Blob's own completion webhook never reaches localhost.
 *
 * Everything here is re-validated server-side. The client has already
 * checked type and size before uploading, but a client check is a
 * convenience, not a control.
 */
export const dynamic = "force-dynamic";

const photoSchema = z.object({
  url: z.url(),
  shotType: z.string().min(1).max(40),
  contentType: z.string().min(1).max(60),
  bytes: z.number().int().positive().max(MAX_PHOTO_BYTES),
  width: z.number().int().positive().max(20000).nullish(),
  height: z.number().int().positive().max(20000).nullish(),
  /** True when the browser could not re-encode, so EXIF may survive. */
  exifStripped: z.boolean().default(true),
});

const bodySchema = z.object({
  leadId: z.uuid(),
  photos: z.array(photoSchema).min(1).max(MAX_PHOTOS),
});

/**
 * Only accept URLs that live in our own Blob store. Without this the
 * endpoint would happily record any URL a caller supplied.
 */
function isOwnBlobUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host.endsWith(".public.blob.vercel-storage.com") ||
      host.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!isBlobConfigured() || !isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Photo upload is not available." },
      { status: 503 },
    );
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  for (const photo of parsed.photos) {
    if (!isOwnBlobUrl(photo.url)) {
      return NextResponse.json(
        { error: "Unrecognised upload location." },
        { status: 400 },
      );
    }
    if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(photo.contentType)) {
      return NextResponse.json(
        { error: "Unsupported image type." },
        { status: 400 },
      );
    }
    if (!shotType(photo.shotType)) {
      return NextResponse.json({ error: "Unknown shot type." }, { status: 400 });
    }
  }

  const { data: existing } = await db()
    .from("photos")
    .select("id")
    .eq("lead_id", parsed.leadId);
  if ((existing?.length ?? 0) + parsed.photos.length > MAX_PHOTOS) {
    return NextResponse.json(
      { error: `A maximum of ${MAX_PHOTOS} photos.` },
      { status: 400 },
    );
  }

  const { error } = await db()
    .from("photos")
    .insert(
      parsed.photos.map((photo) => ({
        lead_id: parsed.leadId,
        blob_url: photo.url,
        shot_type: photo.shotType,
        width: photo.width ?? null,
        height: photo.height ?? null,
        bytes: photo.bytes,
      })),
    );

  if (error) {
    console.error("photo complete failed", error);
    return NextResponse.json({ error: "Could not save photos." }, { status: 500 });
  }

  // Worth knowing about: a browser that could not re-encode uploaded the
  // original file, so location metadata may still be attached.
  const withExif = parsed.photos.filter((photo) => !photo.exifStripped).length;
  if (withExif > 0) {
    console.warn(
      `${withExif} photo(s) on lead ${parsed.leadId} uploaded without EXIF stripping`,
    );
  }

  return NextResponse.json({ saved: parsed.photos.length });
}
