export function budget(usd: number): string {
  return `$${usd < 1 ? usd.toFixed(2) : String(Number(usd.toFixed(2)))}`;
}

export function timeout(seconds: number): string {
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}
