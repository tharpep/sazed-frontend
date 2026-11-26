import { CardFrame } from "./card/frame";

interface FallbackCardProps {
  name: string;
  reason: string;
}

const MAX_CHARS = 160;

/** The fallback's text: the name and reason both come from the payload, so the whole line is capped. */
export function fallbackLine(name: string, reason: string): string {
  const line = `Couldn't show the ${name || "unnamed"} card: ${reason}`;
  return line.length > MAX_CHARS ? `${line.slice(0, MAX_CHARS - 1)}…` : line;
}

/** Stands in for a widget that can't render. One line only: the data goes to console.warn, never the chat. */
export function FallbackCard({ name, reason }: FallbackCardProps) {
  return (
    <CardFrame>
      <p className="m-0 text-[13px] [overflow-wrap:anywhere] text-card-ink-3">{fallbackLine(name, reason)}</p>
    </CardFrame>
  );
}
