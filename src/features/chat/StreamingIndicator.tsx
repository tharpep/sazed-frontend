export function StreamingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1" role="status" aria-label="Sazed is responding">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 animate-pulse rounded-full bg-muted"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}
