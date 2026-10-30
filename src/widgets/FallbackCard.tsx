interface FallbackCardProps {
  name: string;
  reason: string;
  data: unknown;
}

/** Stands in for a widget that can't render, so the data is never silently lost. */
export function FallbackCard({ name, reason, data }: FallbackCardProps) {
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 text-sm">
      <p className="text-ink">Couldn't show this card</p>
      <details className="mt-1 text-muted">
        <summary className="cursor-pointer text-xs">{name}</summary>
        <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs">{reason}</pre>
        <pre className="mt-2 max-h-48 overflow-auto font-mono text-xs">
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>
    </div>
  );
}
