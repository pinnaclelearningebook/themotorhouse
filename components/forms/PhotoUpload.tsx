"use client";

import { useCallback, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { stripExif } from "@/lib/strip-exif";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_PHOTOS,
  MAX_PHOTO_BYTES,
  SHOT_TYPES,
} from "@/config/photos";

/**
 * Guided photo capture. Each shot is a prompt rather than a file input,
 * so the seller is told what to point the camera at instead of being
 * handed an empty box.
 *
 * Every file is re-encoded in the browser before upload, which removes
 * EXIF — including the GPS coordinates of the seller's driveway. That
 * data never reaches us at all.
 *
 * Uploads happen here, at step 2, but the photos rows are written later
 * once the lead exists (CLAUDE.md section 9), so these are held as a
 * list and handed over at step 4.
 */

export interface PendingPhoto {
  key: string;
  shotType: string;
  url: string;
  contentType: string;
  bytes: number;
  width: number | null;
  height: number | null;
  exifStripped: boolean;
  previewUrl: string;
}

type Status =
  | { state: "idle" }
  | { state: "working"; shot: string }
  | { state: "error"; message: string };

export function PhotoUpload({
  photos,
  onChange,
}: {
  photos: PendingPhoto[];
  onChange: (photos: PendingPhoto[]) => void;
}) {
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleFile = useCallback(
    async (shotTypeId: string, file: File) => {
      if (photos.length >= MAX_PHOTOS) {
        setStatus({ state: "error", message: `That is the ${MAX_PHOTOS} photo limit.` });
        return;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        setStatus({
          state: "error",
          message: "That photo is over 10MB. Try a smaller one.",
        });
        return;
      }

      setStatus({ state: "working", shot: shotTypeId });
      try {
        const prepared = await stripExif(file);
        const blob = await upload(
          `seller-photos/${shotTypeId}/${prepared.file.name}`,
          prepared.file,
          { access: "public", handleUploadUrl: "/api/photos/sign" },
        );

        onChange([
          ...photos,
          {
            key: `${shotTypeId}-${Date.now()}`,
            shotType: shotTypeId,
            url: blob.url,
            contentType: prepared.file.type,
            bytes: prepared.file.size,
            width: prepared.width,
            height: prepared.height,
            exifStripped: prepared.stripped,
            previewUrl: URL.createObjectURL(prepared.file),
          },
        ]);
        setStatus({ state: "idle" });
      } catch {
        setStatus({
          state: "error",
          message:
            "That upload did not go through. You can try again, or send photos by email later.",
        });
      }
    },
    [photos, onChange],
  );

  function remove(key: string) {
    const target = photos.find((photo) => photo.key === key);
    if (target) URL.revokeObjectURL(target.previewUrl);
    onChange(photos.filter((photo) => photo.key !== key));
  }

  return (
    <div>
      <p className="text-sm text-structure">
        Photos are the difference between a number we can hold and a number we
        have to revisit. Twelve at most, and you can skip any of them.
      </p>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {SHOT_TYPES.map((shot) => {
          const taken = photos.filter((photo) => photo.shotType === shot.id);
          const full = taken.length > 0 && !shot.repeatable;
          const busy = status.state === "working" && status.shot === shot.id;

          return (
            <li key={shot.id} className="rounded border border-line p-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium">{shot.label}</span>
                {taken.length > 0 && (
                  <span className="data-inline text-caption text-structure">
                    {taken.length}
                  </span>
                )}
              </div>
              <p className="mt-1 text-caption text-structure">{shot.prompt}</p>

              {taken.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {taken.map((photo) => (
                    <li key={photo.key} className="relative">
                      {/* Local object URL, not a remote image: next/image
                          would add nothing and cannot optimise a blob. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.previewUrl}
                        alt={`${shot.label} preview`}
                        className="h-16 w-20 rounded border border-line object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => remove(photo.key)}
                        aria-label={`Remove ${shot.label} photo`}
                        className="mt-1 block w-full text-caption text-oxblood underline"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <input
                ref={(element) => {
                  inputs.current[shot.id] = element;
                }}
                type="file"
                accept={ACCEPTED_IMAGE_TYPES.join(",")}
                capture="environment"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void handleFile(shot.id, file);
                }}
              />
              {!full && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => inputs.current[shot.id]?.click()}
                  className="mt-3 rounded border border-line px-4 py-2 text-sm transition-colors duration-200 hover:border-oxblood disabled:opacity-60"
                >
                  {busy
                    ? "Uploading…"
                    : taken.length > 0
                      ? "Add another"
                      : "Add photo"}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {status.state === "error" && (
        <p role="alert" className="mt-4 text-sm font-medium text-oxblood">
          {status.message}
        </p>
      )}

      <p className="mt-6 text-caption text-structure">
        <span className="data-inline">{photos.length}</span> of{" "}
        <span className="data-inline">{MAX_PHOTOS}</span> added. Location data is
        removed from every photo on your device before it is uploaded.
      </p>
    </div>
  );
}
