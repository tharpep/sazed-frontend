import { useSettingsStore } from "../store/settingsStore";

export interface SpeechOptions {
  text: string;
  voice?: string;
  engine?: "kokoro" | "fish";
  format?: "mp3" | "wav";
}

export interface VoiceInfo {
  id: string;
  name: string;
  gender: string;
}

export interface VoiceListResponse {
  engines: string[];
  default_engine: string;
  default_voice: string;
  kokoro_voices: VoiceInfo[];
}

function getBase(): string {
  return useSettingsStore.getState().getEffectiveBase() || "http://localhost:8000";
}

function getKey(): string {
  return useSettingsStore.getState().getEffectiveKey();
}

export async function fetchSpeechAudio(
  opts: SpeechOptions,
  signal?: AbortSignal
): Promise<ArrayBuffer> {
  const base = getBase();
  const key = getKey();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (key) headers["X-API-Key"] = key;

  const res = await fetch(`${base.replace(/\/$/, "")}/audio/speech`, {
    method: "POST",
    headers,
    body: JSON.stringify(opts),
    signal,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }

  return res.arrayBuffer();
}

export async function fetchVoices(): Promise<VoiceListResponse> {
  const base = getBase();
  const key = getKey();
  const headers: Record<string, string> = {};
  if (key) headers["X-API-Key"] = key;

  const res = await fetch(`${base.replace(/\/$/, "")}/audio/voices`, { headers });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json() as Promise<VoiceListResponse>;
}
