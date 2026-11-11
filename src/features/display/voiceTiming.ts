import { postVoiceTurn, type VoiceTurnRow } from "@/api/audio";
import type { StreamTiming } from "@/api/chat";

type Outcome = VoiceTurnRow["outcome"];

export interface TurnSeed {
  speechEndAt: number | null;
  utteranceMs: number | null;
  endpointMs: number | null;
  sttMs: number | null;
}

export const TYPED_TURN: TurnSeed = { speechEndAt: null, utteranceMs: null, endpointMs: null, sttMs: null };

export interface TurnTiming extends TurnSeed {
  toolTurn: boolean;
  engine: string | null;
  stream: StreamTiming | null;
  ttsFetchAt: number | null;
  ttsFirstByteMs: number | null;
  ttsFirstSoundMs: number | null;
  firstSoundMs: number | null;
  played: boolean;
}

export function newTurn(seed: TurnSeed): TurnTiming {
  return {
    ...seed,
    toolTurn: false,
    engine: null,
    stream: null,
    ttsFetchAt: null,
    ttsFirstByteMs: null,
    ttsFirstSoundMs: null,
    firstSoundMs: null,
    played: false,
  };
}

export function stampFetchStart(t: TurnTiming, engine: string) {
  t.engine = engine;
  t.ttsFetchAt = performance.now();
}

export function stampFirstByte(t: TurnTiming) {
  if (t.ttsFetchAt !== null) t.ttsFirstByteMs = Math.round(performance.now() - t.ttsFetchAt);
}

export function stampFirstSound(t: TurnTiming, soundAt: number) {
  if (t.ttsFetchAt !== null) t.ttsFirstSoundMs = Math.max(0, Math.round(soundAt - t.ttsFetchAt));
  if (t.speechEndAt !== null) t.firstSoundMs = Math.max(0, Math.round(soundAt - t.speechEndAt));
}

export function postTurn(t: TurnTiming, outcome: Outcome, sessionId: string | null, kiosk: boolean) {
  void postVoiceTurn({
    session_id: sessionId,
    kiosk,
    outcome,
    tool_turn: t.toolTurn,
    engine: t.engine,
    utterance_ms: t.utteranceMs,
    endpoint_ms: t.endpointMs,
    stt_ms: t.sttMs,
    setup_ms: t.stream?.setup_ms ?? null,
    llm_ttft_ms: t.stream?.llm_ttft_ms ?? null,
    first_text_ms: t.stream?.first_text_ms ?? null,
    tts_first_byte_ms: t.ttsFirstByteMs,
    tts_first_sound_ms: t.ttsFirstSoundMs,
    first_sound_ms: t.firstSoundMs,
  });
}
