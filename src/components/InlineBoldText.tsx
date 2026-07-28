import { Fragment } from 'react';

/**
 * Renders `**bold**` runs from AI-generated chat text as <strong>, instead
 * of showing the literal asterisks — the model (gpt-4o-mini) writes plain
 * markdown-style emphasis in free-text replies, but this text was rendered
 * as a raw string with no parsing at all. Intentionally narrow: just bold,
 * not a full markdown renderer, since that's the only construct these
 * replies actually use.
 */
export default function InlineBoldText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        const m = /^\*\*([^*]+)\*\*$/.exec(part);
        return <Fragment key={i}>{m ? <strong>{m[1]}</strong> : part}</Fragment>;
      })}
    </>
  );
}
