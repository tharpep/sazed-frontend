interface FallbackCardProps {
  name: string;
  reason: string;
}

/** Stands in for a widget that can't render. One line only: the data goes to console.warn, never the chat. */
export function FallbackCard({ name, reason }: FallbackCardProps) {
  return (
    <p className="break-words rounded-md border border-border bg-surface px-3 py-2 text-sm text-muted">
      Couldn't show the {name || "unnamed"} card: {reason}
    </p>
  );
}
