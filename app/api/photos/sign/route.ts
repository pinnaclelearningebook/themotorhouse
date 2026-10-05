import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { isBlobConfigured, logBlobUnconfigured } from "@/lib/adapters/blob";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_PHOTO_BYTES,
  MAX_PHOTOS,
} from "@/config/photos";

/**
 * Issues a short-lived token so the browser uploads straight to Blob.
 * Image bytes never pass through a server function, which is both
 * cheaper and faster on a phone connection.
 *
 * Photos are taken at step 2 but the lead row does not exist until step
 * 4 (CLAUDE.md section 9), so uploads are keyed by a client-generated
 * draft id. The photos rows are written later by /api/photos/complete,
 * once there is a lead to attach them to.
 *
 * onUploadCompleted is deliberately not relied on: Vercel calls it by
 * webhook, which never reaches localhost, so the client confirms instead.
 */
export const dynamic = "force-dynamic";

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!isBlobConfigured()) {
    logBlobUnconfigured("A photo upload token request");
    return NextResponse.json(
      { error: "Photo upload is not available. You can send photos by email instead." },
      { status: 503 },
    );
  }

  // Generous enough for a full shot list in one sitting, tight enough
  // that the endpoint is not a free upload service.
  const limit = await checkRateLimit("photo_sign", clientIp(request), [
    { seconds: 60, max: MAX_PHOTOS * 2 },
    { seconds: 86_400, max: 200 },
  ]);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many uploads just now. Wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter ?? 60) } },
    );
  }

  try {
    const body = (await request.json()) as HandleUploadBody;
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [...ACCEPTED_IMAGE_TYPES],
        maximumSizeInBytes: MAX_PHOTO_BYTES,
        addRandomSuffix: true,
      }),
      // Fires only on a deployed URL, never locally. The client calling
      // /api/photos/complete is the path that actually runs.
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("photo sign failed", error);
    return NextResponse.json(
      { error: "Could not start the upload." },
      { status: 400 },
    );
  }
}
