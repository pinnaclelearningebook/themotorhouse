/**
 * Removes EXIF by re-encoding in the browser before upload.
 *
 * A phone photo carries GPS coordinates — frequently the seller's home
 * address. Drawing the image to a canvas and exporting it produces a
 * fresh JPEG with no metadata at all, and it happens before the bytes
 * ever leave the device. No server round trip, no re-upload, no Blob
 * cost, and the sensitive data never reaches us in the first place.
 *
 * Canvas also silently applies the EXIF orientation flag, so the
 * re-encoded image is the right way up without carrying the tag.
 *
 * If any of it fails — an unsupported format, a very large image, a
 * browser without createImageBitmap — the original file is returned
 * with `stripped: false` so the caller can flag the row rather than
 * silently losing the photo.
 */

export interface StripResult {
  file: File;
  stripped: boolean;
  width: number | null;
  height: number | null;
}

/** Long edge cap. Keeps uploads quick without visibly hurting the photo. */
const MAX_EDGE = 2400;
const JPEG_QUALITY = 0.85;

export async function stripExif(file: File): Promise<StripResult> {
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") {
    return { file, stripped: false, width: null, height: null };
  }

  try {
    // imageOrientation: "from-image" applies the EXIF rotation, so the
    // output is upright even though the tag is about to be discarded.
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });

    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return { file, stripped: false, width: null, height: null };
    }
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (!blob) return { file, stripped: false, width: null, height: null };

    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return {
      file: new File([blob], name, { type: "image/jpeg" }),
      stripped: true,
      width,
      height,
    };
  } catch {
    // A HEIC that this browser cannot decode, an image too large to
    // rasterise, or a canvas that refused. Upload the original and let
    // the caller record that metadata may still be attached.
    return { file, stripped: false, width: null, height: null };
  }
}
