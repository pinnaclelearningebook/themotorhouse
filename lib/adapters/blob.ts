import "server-only";

/**
 * Vercel Blob. Seller photos are uploaded client-direct with a signed
 * token, so image bytes never pass through a server function.
 *
 * Without BLOB_READ_WRITE_TOKEN the upload is refused loudly rather than
 * silently accepting photos nobody will ever see — the same posture as
 * the submissions store and the email sender.
 */
export function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function logBlobUnconfigured(context: string): void {
  console.error(
    [
      "",
      "==============================================================",
      "  PHOTO UPLOAD UNAVAILABLE — BLOB_READ_WRITE_TOKEN MISSING",
      `  ${context} was refused. No photo was stored.`,
      "  Set BLOB_READ_WRITE_TOKEN. See PENDING-INFO.md.",
      "==============================================================",
      "",
    ].join("\n"),
  );
}
