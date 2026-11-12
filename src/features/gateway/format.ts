/** claude-haiku-5-5 → "Haiku 5.5", claude-sonnet-5 → "Sonnet 5"; anything else unchanged. */
export function modelName(id: string): string {
  const m = /^claude-([a-z]+)-(\d+)(?:-(\d+))?(?:-\d{8})?$/.exec(id);
  if (!m) return id;
  const family = m[1][0].toUpperCase() + m[1].slice(1);
  const minor = m[3] && m[3].length <= 2 ? `.${m[3]}` : "";
  return `${family} ${m[2]}${minor}`;
}

export function usd(n: number): string {
  if (n === 0) return "$0";
  return n < 0.01 ? `$${n.toFixed(3)}` : `$${n.toFixed(2)}`;
}

export function tokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return `${n}`;
}
