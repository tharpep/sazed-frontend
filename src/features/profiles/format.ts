/** Phone tap targets for the small buttons in the profile and server forms. */
export const TOUCH = "max-sm:h-11 max-sm:px-4";
export const TOUCH_ICON = "max-sm:size-11";
export const TOUCH_BACK = "max-sm:min-h-11 max-sm:px-2";

export const DASH = "–";

export function budget(usd: number | null): string {
  if (usd === null) return "no cap";
  return `$${usd < 1 ? usd.toFixed(2) : String(Number(usd.toFixed(2)))}`;
}

export const effort = (value: string | null) => value ?? DASH;

export const toolCalls = (n: number | null) => (n === null ? "no cap" : String(n));

export function timeout(seconds: number): string {
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}
