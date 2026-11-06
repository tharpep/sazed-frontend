/** State colors. Only state gets color: neutral is the default, accent marks something in motion. */
export type Tone = "neutral" | "accent" | "ok" | "warn" | "err";

export const toneText: Record<Tone, string> = {
  neutral: "text-muted",
  accent: "text-primary",
  ok: "text-ok",
  warn: "text-warn",
  err: "text-err",
};

export const toneDot: Record<Tone, string> = {
  neutral: "bg-muted",
  accent: "bg-primary",
  ok: "bg-ok",
  warn: "bg-warn",
  err: "bg-err",
};
