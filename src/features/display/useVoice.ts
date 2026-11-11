import { useEffect, useRef, useState } from "react";
import { MicVAD } from "@ricky0123/vad-web";

import { fetchSpeechAudio, fetchVoices, transcribeAudio, type VoiceListResponse } from "@/api/audio";
import { postMessageStream } from "@/api/chat";
import { encodeWav } from "@/lib/audioWav";
import { toolCallPending } from "@/lib/toolMap";
import type { ToolCall, UIBlock } from "@/mock/data";
import { createFillerStore } from "./fillers";
import {
  newTurn,
  postTurn,
  stampFetchStart,
  stampFiller,
  stampFirstByte,
  stampFirstSound,
  TYPED_TURN,
  type TurnSeed,
  type TurnTiming,
} from "./voiceTiming";

export type Phase = "idle" | "listening" | "thinking" | "speaking";

export interface Exchange {
  question: string;
  answer: string;
  tools: ToolCall[];
  uiBlocks: UIBlock[];
  error: string | null;
}

export interface VoiceOption {
  voiceURI: string;
  name: string;
  engine: "kokoro" | "fish" | "browser";
}

export interface CustomVoiceProfile {
  id: string;
  name: string;
  referenceId: string;
  engine: "fish";
}

interface ISpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: { results: { 0: { 0: { transcript: string } } } }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}

const VOICE_KEY = "sazed-voice-uri";
const MUTE_KEY = "sazed-mute";
const CONVERSATION_KEY = "sazed-conversation";
const CUSTOM_VOICES_KEY = "sazed-custom-voices";
const INTERRUPTS_KEY = "sazed-voice-interrupts";
const DEFAULT_MIN_SPEECH_MS = 400;
// Speaker bleed is short; a real interruption lasts longer than this.
const BARGE_IN_MIN_SPEECH_MS = 500;
const NO_SPEECH_TIMEOUT_MS = 8_000;
const SESSION_IDLE_MS = 10 * 60_000;
const MIC_CONSTRAINTS: MediaStreamConstraints = {
  audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
};
const DEFAULT_VOICE_URI = "kokoro:am_adam";
const SPEECH_FRAME_THRESHOLD = 0.3;

function loadCustomProfiles(): CustomVoiceProfile[] {
  try {
    const raw = localStorage.getItem(CUSTOM_VOICES_KEY);
    return raw ? (JSON.parse(raw) as CustomVoiceProfile[]) : [];
  } catch {
    return [];
  }
}

function saveCustomProfiles(profiles: CustomVoiceProfile[]) {
  try {
    localStorage.setItem(CUSTOM_VOICES_KEY, JSON.stringify(profiles));
  } catch {}
}

function recognitionCtor(): (new () => ISpeechRecognition) | undefined {
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as (new () => ISpeechRecognition) | undefined;
}

const WAKE_NAME = "sazed|saws|said|sayzed|saz\\s*it|says\\s*it|sized|say\\s*zed|sa[sz]ed|zed";
const WAKE_EDGE = /^[\s,.:;!?-]+|[\s,.:;!?-]+$/g;
const WAKE_RE = new RegExp(
  `^[\\s,.:;!?-]*(?:(?:um+|uh+)[\\s,.]+)?(?:(?:hey|hi|ok(?:ay)?)[\\s,.]+)?(?:${WAKE_NAME})\\b(.*)$`,
  "is"
);

export function matchWake(transcript: string): string | null {
  const m = WAKE_RE.exec(transcript);
  return m ? m[1].replace(WAKE_EDGE, "") : null;
}

function stripMarkdownForTts(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*{1,3}([^*\n]+)\*{1,3}/g, "$1")
    .replace(/_{1,3}([^_\n]+)_{1,3}/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^>\s*/gm, "")
    .replace(/^[-*_]{3,}\s*$/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function useVoice({
  kiosk = false,
  screen,
}: { kiosk?: boolean; screen?: () => string[] } = {}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [exchange, setExchange] = useState<Exchange | null>(null);
  const [conversation, setConversation] = useState(() => {
    const stored = localStorage.getItem(CONVERSATION_KEY);
    return stored === null ? kiosk : stored === "true";
  });
  const [micBlocked, setMicBlocked] = useState(false);
  const [interrupts, setInterrupts] = useState(() => localStorage.getItem(INTERRUPTS_KEY) !== "false");
  const [muted, setMuted] = useState(() => localStorage.getItem(MUTE_KEY) === "true");
  const [customVoices, setCustomVoices] = useState<CustomVoiceProfile[]>(loadCustomProfiles);
  const [builtinVoices, setBuiltinVoices] = useState<VoiceOption[]>([]);
  const [voiceUri, setVoiceUri] = useState(() => localStorage.getItem(VOICE_KEY) ?? DEFAULT_VOICE_URI);

  const voices: VoiceOption[] = [
    ...customVoices.map((cv) => ({
      voiceURI: `fish:${cv.referenceId}`,
      name: `${cv.name} (Fish)`,
      engine: "fish" as const,
    })),
    ...builtinVoices,
  ];

  const phaseRef = useRef<Phase>("idle");
  const sessionIdRef = useRef<string | null>(null);
  const ttsBufferRef = useRef("");
  const spokenRef = useRef(0);
  const finishedRef = useRef(0);
  const streamDoneRef = useRef(false);
  const finalizedRef = useRef(false);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const vadRef = useRef<MicVAD | null>(null);
  const vadInitRef = useRef<Promise<MicVAD> | null>(null);
  const vadCtxRef = useRef<AudioContext | null>(null);
  const vadGenRef = useRef(0);
  const inFlightRef = useRef(false);
  const cancelledRef = useRef(false);
  const conversationRef = useRef(conversation);
  const screenRef = useRef(screen);
  screenRef.current = screen;
  const interruptsRef = useRef(interrupts);
  const mutedRef = useRef(muted);
  const voiceUriRef = useRef(voiceUri);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef(0);
  const scheduledSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const sentenceIndexRef = useRef(0);
  const nextPlayIndexRef = useRef(0);
  const decodedBuffersRef = useRef<Map<number, AudioBuffer>>(new Map());
  const abortCtrlRef = useRef<AbortController | null>(null);
  const lastExchangeAtRef = useRef(0);
  const exchangeRef = useRef<AbortController | null>(null);
  const epochRef = useRef(0);
  const speechActiveRef = useRef(false);
  const noSpeechTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const turnRef = useRef<TurnTiming | null>(null);
  const lastSpeechFrameAtRef = useRef<number | null>(null);
  const fillerPlayedRef = useRef(false);
  const fillersRef = useRef<ReturnType<typeof createFillerStore> | null>(null);
  fillersRef.current ??= createFillerStore({
    getContext: getAudioContext,
    busy: () => inFlightRef.current || phaseRef.current !== "idle",
  });

  function setPhaseTracked(p: Phase) {
    phaseRef.current = p;
    setPhase(p);
  }

  function getAudioContext(): AudioContext {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtxRef.current = new Ctx();
    }
    return audioCtxRef.current;
  }

  useEffect(() => {
    let active = true;

    async function loadVoices() {
      const options: VoiceOption[] = [];

      try {
        const res: VoiceListResponse = await fetchVoices();
        for (const kv of res.kokoro_voices) {
          options.push({
            voiceURI: `kokoro:${kv.id}`,
            name: `${kv.name} (Kokoro)`,
            engine: "kokoro",
          });
        }
      } catch {
        options.push(
          { voiceURI: "kokoro:am_adam", name: "Adam (Kokoro Butler)", engine: "kokoro" },
          { voiceURI: "kokoro:af_bella", name: "Bella (Kokoro Warm)", engine: "kokoro" }
        );
      }

      if (typeof speechSynthesis !== "undefined") {
        const sys = speechSynthesis.getVoices().filter((v) => v.lang.startsWith("en"));
        for (const sv of sys) {
          options.push({
            voiceURI: `browser:${sv.voiceURI}`,
            name: `${sv.name} (Browser)`,
            engine: "browser",
          });
        }
      }

      if (!active) return;
      setBuiltinVoices(options);

      const saved = localStorage.getItem(VOICE_KEY);
      if (!saved && options.length > 0) {
        const initial = options[0].voiceURI;
        voiceUriRef.current = initial;
        setVoiceUri(initial);
        localStorage.setItem(VOICE_KEY, initial);
      }
    }

    void loadVoices();

    if (typeof speechSynthesis !== "undefined") {
      speechSynthesis.addEventListener("voiceschanged", loadVoices);
    }

    return () => {
      active = false;
      if (typeof speechSynthesis !== "undefined") {
        speechSynthesis.removeEventListener("voiceschanged", loadVoices);
      }
    };
  }, []);

  useEffect(() => {
    fillersRef.current?.prime(voiceUri);
  }, [voiceUri]);

  function stopAudio() {
    abortCtrlRef.current?.abort();
    abortCtrlRef.current = null;
    nextPlayTimeRef.current = 0;
    sentenceIndexRef.current = 0;
    nextPlayIndexRef.current = 0;
    decodedBuffersRef.current.clear();
    for (const source of scheduledSourcesRef.current) {
      source.onended = null;
      try {
        source.stop();
        source.disconnect();
      } catch {}
    }
    scheduledSourcesRef.current = [];
    if (typeof speechSynthesis !== "undefined") {
      speechSynthesis.cancel();
    }
  }

  function clearNoSpeechTimer() {
    if (noSpeechTimerRef.current) clearTimeout(noSpeechTimerRef.current);
    noSpeechTimerRef.current = null;
  }

  function endTurn() {
    inFlightRef.current = false;
    clearNoSpeechTimer();
    speechActiveRef.current = false;
    const vad = vadRef.current;
    vad?.setOptions({ minSpeechMs: DEFAULT_MIN_SPEECH_MS });
    setPhaseTracked("idle");
    if (conversationRef.current) {
      setTimeout(() => {
        if (phaseRef.current !== "idle") return;
        if (vadRef.current) {
          if (!vadRef.current.listening) void startMic();
        } else {
          listen();
        }
      }, 500);
    } else if (vad?.listening) {
      void vad.pause();
    }
  }

  function postTurnRecord(outcome: Parameters<typeof postTurn>[1]) {
    const turn = turnRef.current;
    if (!turn) return;
    turnRef.current = null;
    postTurn(turn, outcome, sessionIdRef.current, kiosk);
  }

  function abortExchange() {
    inFlightRef.current = false;
    exchangeRef.current?.abort();
    stopAudio();
    ttsBufferRef.current = "";
    spokenRef.current = 0;
    finishedRef.current = 0;
    finalizedRef.current = true;
    epochRef.current++;
  }

  function finalize() {
    if (finalizedRef.current) return;
    finalizedRef.current = true;
    postTurnRecord(turnRef.current?.played ? "spoken" : "silent");
    lastExchangeAtRef.current = Date.now();
    stopAudio();
    endTurn();
  }

  function schedulePendingSentences() {
    const ctx = getAudioContext();
    while (decodedBuffersRef.current.has(nextPlayIndexRef.current)) {
      const idx = nextPlayIndexRef.current;
      const audioBuffer = decodedBuffersRef.current.get(idx)!;
      decodedBuffersRef.current.delete(idx);
      nextPlayIndexRef.current++;

      const now = ctx.currentTime;
      const startAt = Math.max(now, nextPlayTimeRef.current);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start(startAt);
      const turn = turnRef.current;
      if (turn) {
        turn.played = true;
        if (idx === 0) stampFirstSound(turn, performance.now() + (startAt - ctx.currentTime) * 1000);
      }

      setPhaseTracked("speaking");
      scheduledSourcesRef.current.push(source);
      nextPlayTimeRef.current = startAt + audioBuffer.duration + 0.08;

      source.onended = () => {
        finishedRef.current++;
        scheduledSourcesRef.current = scheduledSourcesRef.current.filter((s) => s !== source);
        if (streamDoneRef.current && finishedRef.current >= spokenRef.current) {
          finalize();
        }
      };
    }
  }

  function playFiller(name: string, signal: AbortSignal) {
    if (fillerPlayedRef.current || signal.aborted || mutedRef.current) return;
    if (spokenRef.current !== 0 || ttsBufferRef.current.trim()) return;
    const audioBuffer = fillersRef.current?.buffer(voiceUriRef.current, name);
    if (!audioBuffer) return;
    fillerPlayedRef.current = true;

    const ctx = getAudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    const startAt = Math.max(ctx.currentTime, nextPlayTimeRef.current);
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.start(startAt);
    if (turnRef.current) {
      stampFiller(turnRef.current, performance.now() + (startAt - ctx.currentTime) * 1000);
    }

    setPhaseTracked("speaking");
    scheduledSourcesRef.current.push(source);
    nextPlayTimeRef.current = startAt + audioBuffer.duration + 0.08;

    source.onended = () => {
      scheduledSourcesRef.current = scheduledSourcesRef.current.filter((s) => s !== source);
      if (
        phaseRef.current === "speaking" &&
        scheduledSourcesRef.current.length === 0 &&
        inFlightRef.current
      ) {
        setPhaseTracked("thinking");
      }
    };
  }

  async function enqueueSentence(sentence: string, index: number, signal: AbortSignal) {
    const raw = stripMarkdownForTts(sentence);
    if (!raw) return;

    const turn = turnRef.current;
    const uri = voiceUriRef.current;
    let engine: "kokoro" | "fish" | "browser" = "kokoro";
    let voiceId = "am_adam";

    if (uri.startsWith("kokoro:")) {
      engine = "kokoro";
      voiceId = uri.slice(7);
    } else if (uri.startsWith("fish:")) {
      engine = "fish";
      voiceId = uri.slice(5);
    } else if (uri.startsWith("browser:")) {
      engine = "browser";
      voiceId = uri.slice(8);
    }

    if (turn && index === 0) stampFetchStart(turn, engine);

    function stampBrowserStart() {
      if (!turn) return;
      turn.played = true;
      if (index === 0) stampFirstSound(turn, performance.now());
    }

    if (engine === "browser") {
      if (typeof speechSynthesis !== "undefined") {
        const u = new SpeechSynthesisUtterance(raw);
        const all = speechSynthesis.getVoices();
        const match = all.find((v) => v.voiceURI === voiceId);
        if (match) u.voice = match;
        u.onstart = () => {
          stampBrowserStart();
          setPhaseTracked("speaking");
        };
        u.onend = () => {
          finishedRef.current++;
          if (streamDoneRef.current && finishedRef.current >= spokenRef.current) finalize();
        };
        speechSynthesis.speak(u);
      } else {
        finishedRef.current++;
        if (streamDoneRef.current && finishedRef.current >= spokenRef.current) finalize();
      }
      return;
    }

    try {
      const buf = await fetchSpeechAudio(
        { text: raw, voice: voiceId, engine, format: "mp3" },
        signal,
        turn && index === 0 ? () => stampFirstByte(turn) : undefined
      );
      if (signal.aborted) return;

      const ctx = getAudioContext();
      if (ctx.state === "suspended") {
        await ctx.resume();
      }
      const audioBuffer = await ctx.decodeAudioData(buf.slice(0));
      if (signal.aborted) return;

      decodedBuffersRef.current.set(index, audioBuffer);
      schedulePendingSentences();
    } catch {
      if (typeof speechSynthesis !== "undefined") {
        const u = new SpeechSynthesisUtterance(raw);
        u.onstart = () => {
          stampBrowserStart();
          setPhaseTracked("speaking");
        };
        u.onend = () => {
          finishedRef.current++;
          if (streamDoneRef.current && finishedRef.current >= spokenRef.current) finalize();
        };
        speechSynthesis.speak(u);
      } else {
        finishedRef.current++;
        if (streamDoneRef.current && finishedRef.current >= spokenRef.current) finalize();
      }
    }
  }

  function speak(isFinal: boolean) {
    const buffer = ttsBufferRef.current;
    const boundary = /[.!?]+[\s\n]+/g;
    const sentences: string[] = [];
    let last = 0;
    let match: RegExpExecArray | null;

    while ((match = boundary.exec(buffer)) !== null) {
      const sentence = buffer.slice(last, match.index + match[0].length).trim();
      if (sentence) sentences.push(sentence);
      last = match.index + match[0].length;
    }

    if (isFinal) {
      const rest = buffer.slice(last).trim();
      if (rest) sentences.push(rest);
      ttsBufferRef.current = "";
    } else {
      ttsBufferRef.current = buffer.slice(last);
    }

    if (exchangeRef.current?.signal.aborted) return;
    if (!abortCtrlRef.current) {
      abortCtrlRef.current = new AbortController();
    }
    const signal = abortCtrlRef.current.signal;

    for (const sentence of sentences) {
      spokenRef.current++;
      const idx = sentenceIndexRef.current++;
      void enqueueSentence(sentence, idx, signal);
    }
  }

  function update(fn: (e: Exchange) => Exchange) {
    setExchange((prev) => (prev ? fn(prev) : prev));
  }

  async function send(text: string, seed: TurnSeed = TYPED_TURN) {
    if (lastExchangeAtRef.current && Date.now() - lastExchangeAtRef.current > SESSION_IDLE_MS) {
      sessionIdRef.current = null;
    }
    postTurnRecord("interrupted");
    turnRef.current = newTurn(seed);
    exchangeRef.current?.abort();
    const ctrl = new AbortController();
    exchangeRef.current = ctrl;
    inFlightRef.current = true;
    const { signal } = ctrl;
    clearNoSpeechTimer();
    setPhaseTracked("thinking");
    setExchange({ question: text, answer: "", tools: [], uiBlocks: [], error: null });
    ttsBufferRef.current = "";
    spokenRef.current = 0;
    finishedRef.current = 0;
    streamDoneRef.current = false;
    finalizedRef.current = false;
    fillerPlayedRef.current = false;
    sentenceIndexRef.current = 0;
    nextPlayIndexRef.current = 0;
    decodedBuffersRef.current.clear();
    stopAudio();

    await postMessageStream(
      {
        session_id: sessionIdRef.current ?? undefined,
        message: text,
        mode: "voice",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        screen: screenRef.current?.(),
      },
      {
        onSession: (id) => {
          sessionIdRef.current = id;
        },
        onToolIntent: (name) => playFiller(name, signal),
        onToolStart: (name) => {
          if (signal.aborted) return;
          if (turnRef.current) turnRef.current.toolTurn = true;
          update((e) => ({ ...e, tools: [...e.tools, toolCallPending(name)] }));
        },
        onToolDone: (name, status) =>
          !signal.aborted &&
          update((e) => {
            let marked = false;
            return {
              ...e,
              tools: e.tools.map((t) => {
                if (marked || t.name !== name || t.done) return t;
                marked = true;
                return { ...t, done: true, status };
              }),
            };
          }),
        onText: (delta) => {
          if (signal.aborted) return;
          update((e) => ({ ...e, answer: e.answer + delta }));
          if (!mutedRef.current) {
            ttsBufferRef.current += delta;
            speak(false);
          }
        },
        onUiBlock: ({ component, props }) =>
          !signal.aborted &&
          update((e) => ({ ...e, uiBlocks: [...e.uiBlocks, { type: "ui", component, props }] })),
        onDone: (data) => {
          if (signal.aborted) return;
          if (turnRef.current) turnRef.current.stream = data?.timing ?? null;
          streamDoneRef.current = true;
          if (!mutedRef.current) speak(true);
          if (spokenRef.current === 0) {
            finalize();
          }
        },
        onError: (err) => {
          if (signal.aborted) return;
          update((e) => ({ ...e, error: err.message }));
          postTurnRecord("error");
          endTurn();
        },
      },
      signal
    );
  }

  async function handleSpeechEnd(audio: Float32Array, speechEndAt: number, endpointMs: number | null) {
    if (phaseRef.current === "speaking") return;
    if (!conversationRef.current && phaseRef.current !== "listening") {
      return;
    }

    const epoch = epochRef.current;
    setPhaseTracked("thinking");

    try {
      const wavBlob = encodeWav(audio, 16000);
      const sttStart = performance.now();
      const text = await transcribeAudio(wavBlob);
      const sttMs = Math.round(performance.now() - sttStart);
      if (epoch !== epochRef.current) return;
      const clean = text.trim();

      if (!clean) {
        endTurn();
        return;
      }

      const isFollowUp = Date.now() - lastExchangeAtRef.current < 30_000;
      const woke = matchWake(clean);

      let prompt = clean;
      if (conversationRef.current && !isFollowUp) {
        if (woke === null) {
          endTurn();
          return;
        }
        prompt = woke || "Hey Sazed";
      } else if (woke) {
        prompt = woke;
      }

      const vad = vadRef.current;
      if (vad?.listening) {
        if (interruptsRef.current) {
          vad.setOptions({ minSpeechMs: BARGE_IN_MIN_SPEECH_MS });
        } else {
          await vad.pause();
        }
      }

      await send(prompt, {
        speechEndAt,
        utteranceMs: Math.round(audio.length / 16),
        endpointMs,
        sttMs,
      });
    } catch {
      if (epoch === epochRef.current) endTurn();
    }
  }

  function interrupt() {
    postTurnRecord("interrupted");
    abortExchange();
    lastExchangeAtRef.current = Date.now();
    vadRef.current?.setOptions({ minSpeechMs: DEFAULT_MIN_SPEECH_MS });
    setPhaseTracked("listening");
  }

  function vadAudioContext(): AudioContext {
    if (!vadCtxRef.current || vadCtxRef.current.state === "closed") {
      const ctx = new AudioContext();
      ctx.onstatechange = () => {
        if (ctx.state === "running") setMicBlocked(false);
        else if (vadRef.current?.listening) setMicBlocked(true);
      };
      vadCtxRef.current = ctx;
    }
    return vadCtxRef.current;
  }

  function ensureVad(): Promise<MicVAD> {
    const gen = vadGenRef.current;
    vadInitRef.current ??= MicVAD.new({
      baseAssetPath: "/vad/",
      onnxWASMBasePath: "/vad/",
      startOnLoad: false,
      audioContext: vadAudioContext(),
      getStream: () => navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS),
      resumeStream: () => navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS),
      minSpeechMs: DEFAULT_MIN_SPEECH_MS,
      onSpeechStart: () => {
        if (gen !== vadGenRef.current) return;
        speechActiveRef.current = true;
        clearNoSpeechTimer();
        if (phaseRef.current === "idle") setPhaseTracked("listening");
      },
      onSpeechRealStart: () => {
        if (gen !== vadGenRef.current) return;
        const p = phaseRef.current;
        if ((p === "speaking" || p === "thinking") && interruptsRef.current && inFlightRef.current) interrupt();
      },
      onVADMisfire: () => {
        if (gen !== vadGenRef.current) return;
        speechActiveRef.current = false;
        if (phaseRef.current === "listening") endTurn();
      },
      onFrameProcessed: (probs) => {
        if (probs.isSpeech >= SPEECH_FRAME_THRESHOLD) lastSpeechFrameAtRef.current = performance.now();
      },
      onSpeechEnd: (audio) => {
        if (gen !== vadGenRef.current) return;
        speechActiveRef.current = false;
        const speechEndAt = performance.now();
        const lastFrame = lastSpeechFrameAtRef.current;
        void handleSpeechEnd(audio, speechEndAt, lastFrame === null ? null : Math.round(speechEndAt - lastFrame));
      },
    }).then(
      (vad) => {
        if (gen !== vadGenRef.current) {
          void vad.destroy().catch(() => {});
          throw new Error("unmounted");
        }
        vadRef.current = vad;
        return vad;
      },
      (err) => {
        vadInitRef.current = null;
        throw err;
      }
    );
    return vadInitRef.current;
  }

  async function startMic() {
    try {
      const vad = await ensureVad();
      await vad.start();
      const ctx = vadAudioContext();
      void ctx.resume();
      setMicBlocked(ctx.state !== "running");
    } catch {
      if (vadRef.current) void vadRef.current.destroy().catch(() => {});
      vadRef.current = null;
      vadInitRef.current = null;
      setMicBlocked(true);
    }
  }

  useEffect(() => {
    if (conversationRef.current) void startMic();
    else void ensureVad().catch(() => {});

    function resumeOnGesture() {
      if (vadCtxRef.current?.state === "suspended") void vadCtxRef.current.resume();
    }
    window.addEventListener("pointerdown", resumeOnGesture, true);

    return () => {
      window.removeEventListener("pointerdown", resumeOnGesture, true);
      vadGenRef.current++;
      if (vadRef.current) void vadRef.current.destroy().catch(() => {});
      vadRef.current = null;
      vadInitRef.current = null;
      void vadCtxRef.current?.close();
      vadCtxRef.current = null;
    };
  }, []);

  function listen() {
    const SR = recognitionCtor();
    if (!SR) return;
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    let transcript = "";
    recognition.onresult = (e) => {
      transcript = e.results[0][0].transcript;
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      if (cancelledRef.current || !transcript.trim()) {
        setPhaseTracked("idle");
        return;
      }
      void send(transcript.trim());
    };
    recognition.onerror = () => {
      recognitionRef.current = null;
      setPhaseTracked("idle");
    };
    cancelledRef.current = false;
    recognitionRef.current = recognition;
    setPhaseTracked("listening");
    recognition.start();
  }

  const canListen =
    typeof window !== "undefined" &&
    Boolean(
      (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) ||
        recognitionCtor()
    );

  function stopSpeaking() {
    lastExchangeAtRef.current = Date.now();
    postTurnRecord("stopped");
    abortExchange();
    endTurn();
  }

  function tapMic() {
    if (phase === "speaking" || phase === "thinking") {
      stopSpeaking();
      return;
    }
    if (phase === "listening") {
      cancelledRef.current = true;
      clearNoSpeechTimer();
      if (vadRef.current?.listening) {
        void vadRef.current.pause();
      }
      recognitionRef.current?.stop();
      setPhaseTracked("idle");
      return;
    }
    if (phase !== "idle") return;

    if (vadRef.current) {
      cancelledRef.current = false;
      setPhaseTracked("listening");
      void startMic();
      if (!conversationRef.current) {
        clearNoSpeechTimer();
        noSpeechTimerRef.current = setTimeout(() => {
          if (phaseRef.current === "listening" && !speechActiveRef.current) endTurn();
        }, NO_SPEECH_TIMEOUT_MS);
      }
    } else if (canListen) {
      listen();
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && (phase === "speaking" || phase === "thinking")) {
        stopSpeaking();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase]);

  function ask(text: string) {
    if (text.trim() && phase === "idle") void send(text.trim());
  }

  function toggleConversation() {
    conversationRef.current = !conversationRef.current;
    localStorage.setItem(CONVERSATION_KEY, String(conversationRef.current));
    setConversation(conversationRef.current);
    if (conversationRef.current) {
      if (vadRef.current && !vadRef.current.listening && phase === "idle") {
        void startMic();
      }
    } else {
      if (vadRef.current?.listening && phase !== "speaking") {
        void vadRef.current.pause();
      }
    }
  }

  function toggleInterrupts() {
    interruptsRef.current = !interruptsRef.current;
    localStorage.setItem(INTERRUPTS_KEY, String(interruptsRef.current));
    setInterrupts(interruptsRef.current);
    const p = phaseRef.current;
    if (!interruptsRef.current && (p === "speaking" || p === "thinking") && vadRef.current?.listening) {
      void vadRef.current.pause();
    }
  }

  function toggleMute() {
    mutedRef.current = !mutedRef.current;
    localStorage.setItem(MUTE_KEY, String(mutedRef.current));
    setMuted(mutedRef.current);
    if (mutedRef.current) stopAudio();
  }

  function chooseVoice(uri: string) {
    voiceUriRef.current = uri;
    setVoiceUri(uri);
    localStorage.setItem(VOICE_KEY, uri);
  }

  function addCustomVoice(name: string, referenceId: string) {
    const trimmedName = name.trim();
    const trimmedId = referenceId.trim();
    if (!trimmedName || !trimmedId) return;
    const profile: CustomVoiceProfile = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      name: trimmedName,
      referenceId: trimmedId,
      engine: "fish",
    };
    const next = [...customVoices.filter((v) => v.referenceId !== trimmedId), profile];
    setCustomVoices(next);
    saveCustomProfiles(next);
    chooseVoice(`fish:${trimmedId}`);
  }

  function removeCustomVoice(id: string) {
    const target = customVoices.find((v) => v.id === id);
    const next = customVoices.filter((v) => v.id !== id);
    setCustomVoices(next);
    saveCustomProfiles(next);
    if (target && voiceUriRef.current === `fish:${target.referenceId}`) {
      chooseVoice(DEFAULT_VOICE_URI);
    }
  }

  function dismiss() {
    if (phase === "idle") setExchange(null);
  }

  return {
    phase,
    exchange,
    conversation,
    micBlocked,
    retryMic: startMic,
    interrupts,
    muted,
    voices,
    voiceUri,
    customVoices,
    canListen,
    tapMic,
    stopSpeaking,
    ask,
    dismiss,
    toggleConversation,
    toggleInterrupts,
    toggleMute,
    chooseVoice,
    addCustomVoice,
    removeCustomVoice,
  };
}
