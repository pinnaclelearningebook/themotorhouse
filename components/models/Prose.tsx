import { Fragment } from "react";

/**
 * Renders copy from config, converting [[...]] tokens into mono spans.
 *
 * The design system requires vehicle data — years, mileages, prices,
 * percentages — to render in Geist Mono wherever it appears, including
 * mid-sentence in prose. Marking tokens in the copy keeps config/models.ts
 * plain serialisable data while the rendering concern stays here.
 */
export function renderCopy(text: string) {
  return text.split(/(\[\[[^\]]+\]\])/g).map((part, index) => {
    const match = part.match(/^\[\[([^\]]+)\]\]$/);
    return match ? (
      <span key={index} className="font-mono">
        {match[1]}
      </span>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    );
  });
}

export function Paragraphs({
  copy,
  className = "",
}: {
  copy: string[];
  className?: string;
}) {
  return (
    <>
      {copy.map((paragraph, index) => (
        <p key={index} className={`max-w-prose ${className}`}>
          {renderCopy(paragraph)}
        </p>
      ))}
    </>
  );
}
