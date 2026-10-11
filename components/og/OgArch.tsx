/**
 * The arch, drawn for Satori.
 *
 * next/og renders through Satori, which supports a subset of CSS and no
 * SVG paths — so the mark is a box with a fully rounded top, square
 * sides and an oxblood bottom border. That is the same three strokes
 * the real {@link Arch} draws, and at icon sizes it is indistinguishable.
 */
export function OgArch({
  size,
  stroke = "#F5F4F0",
  threshold = "#5C1A1F",
}: {
  size: number;
  stroke?: string;
  threshold?: string;
}) {
  const weight = Math.max(2, Math.round(size / 11));
  return (
    <div
      style={{
        display: "flex",
        width: size,
        height: size * 0.92,
        borderStyle: "solid",
        borderColor: stroke,
        borderWidth: weight,
        borderBottomColor: threshold,
        borderTopLeftRadius: size,
        borderTopRightRadius: size,
      }}
    />
  );
}
