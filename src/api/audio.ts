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
  signal?: AbortSignal,
  onFirstByte?: () => void
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

  if (!res.body) return res.arrayBuffer();

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value.length === 0) continue;
    if (total === 0) onFirstByte?.();
    chunks.push(value);
    total += value.length;
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out.buffer;
}

export interface VoiceTurnRow {
  session_id: string | null;
  kiosk: boolean;
  outcome: "spoken" | "silent" | "interrupted" | "stopped" | "error";
  tool_turn: boolean;
  engine: string | null;
  utterance_ms: number | null;
  endpoint_ms: number | null;
  stt_ms: number | null;
  setup_ms: number | null;
  llm_ttft_ms: number | null;
  first_text_ms: number | null;
  tts_first_byte_ms: number | null;
  tts_first_sound_ms: number | null;
  first_sound_ms: number | null;
  filler_ms: number | null;
}

export async function postVoiceTurn(row: VoiceTurnRow): Promise<void> {
  try {
    const key = getKey();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (key) headers["X-API-Key"] = key;
    await fetch(`${getBase().replace(/\/$/, "")}/voice/turns`, {
      method: "POST",
      headers,
      body: JSON.stringify(row),
    });
  } catch {}
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

export async function transcribeAudio(audioBlob: Blob, signal?: AbortSignal): Promise<string> {
  const base = getBase();
  const key = getKey();
  const headers: Record<string, string> = { "Content-Type": audioBlob.type || "audio/wav" };
  if (key) headers["X-API-Key"] = key;

  const res = await fetch(`${base.replace(/\/$/, "")}/audio/transcribe`, {
    method: "POST",
    headers,
    body: audioBlob,
    signal,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }

  const data = (await res.json()) as { text: string };
  return data.text;
}
