import { useEffect, useRef, useState } from "react";
import { MicVAD } from "@ricky0123/vad-web";

import { fetchSpeechAudio, fetchVoices, transcribeAudio, type VoiceListResponse } from "@/api/audio";
import { postMessageStream } from "@/api/chat";
import { encodeWav } from "@/lib/audioWav";
import { toolCallPending } from "@/lib/toolMap";
import type { ToolCall, UIBlock } from "@/mock/data";

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
const DEFAULT_VOICE_URI = "kokoro:am_adam";

function recognitionCtor(): (new () => ISpeechRecognition) | undefined {
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as (new () => ISpeechRecognition) | undefined;
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

export function useVoice() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [exchange, setExchange] = useState<Exchange | null>(null);
  const [conversation, setConversation] = useState(false);
  const [muted, setMuted] = useState(() => localStorage.getItem(MUTE_KEY) === "true");
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [voiceUri, setVoiceUri] = useState(() => localStorage.getItem(VOICE_KEY) ?? DEFAULT_VOICE_URI);

  const phaseRef = useRef<Phase>("idle");
  const sessionIdRef = useRef<string | null>(null);
  const ttsBufferRef = useRef("");
  const spokenRef = useRef(0);
  const finishedRef = useRef(0);
  const streamDoneRef = useRef(false);
  const finalizedRef = useRef(false);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const vadRef = useRef<MicVAD | null>(null);
  const cancelledRef = useRef(false);
  const conversationRef = useRef(false);
  const mutedRef = useRef(muted);
  const voiceUriRef = useRef(voiceUri);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef(0);
  const scheduledSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const abortCtrlRef = useRef<AbortController | null>(null);
  const lastExchangeAtRef = useRef(0);

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
      setVoices(options);

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

  function stopAudio() {
    abortCtrlRef.current?.abort();
    abortCtrlRef.current = null;
    nextPlayTimeRef.current = 0;
    for (const source of scheduledSourcesRef.current) {
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

  function finalize() {
    if (finalizedRef.current) return;
    finalizedRef.current = true;
    lastExchangeAtRef.current = Date.now();
    stopAudio();
    if (conversationRef.current) {
      setTimeout(() => {
        if (vadRef.current) {
          void vadRef.current.start();
        } else {
          listen();
        }
      }, 500);
    } else {
      setPhaseTracked("idle");
    }
  }

  async function enqueueSentence(sentence: string, signal: AbortSignal) {
    const raw = stripMarkdownForTts(sentence);
    if (!raw) return;

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

    if (engine === "browser") {
      if (typeof speechSynthesis !== "undefined") {
        const u = new SpeechSynthesisUtterance(raw);
        const all = speechSynthesis.getVoices();
        const match = all.find((v) => v.voiceURI === voiceId);
        if (match) u.voice = match;
        u.onstart = () => setPhaseTracked("speaking");
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
      const buf = await fetchSpeechAudio({ text: raw, voice: voiceId, engine, format: "mp3" }, signal);
      const ctx = getAudioContext();
      if (ctx.state === "suspended") {
        await ctx.resume();
      }
      const audioBuffer = await ctx.decodeAudioData(buf.slice(0));
      const now = ctx.currentTime;
      const startAt = Math.max(now, nextPlayTimeRef.current);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start(startAt);

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
    } catch {
      if (typeof speechSynthesis !== "undefined") {
        const u = new SpeechSynthesisUtterance(raw);
        u.onstart = () => setPhaseTracked("speaking");
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

    if (!abortCtrlRef.current) {
      abortCtrlRef.current = new AbortController();
    }
    const signal = abortCtrlRef.current.signal;

    for (const sentence of sentences) {
      spokenRef.current++;
      void enqueueSentence(sentence, signal);
    }
  }

  function update(fn: (e: Exchange) => Exchange) {
    setExchange((prev) => (prev ? fn(prev) : prev));
  }

  async function send(text: string) {
    setPhaseTracked("thinking");
    setExchange({ question: text, answer: "", tools: [], uiBlocks: [], error: null });
    ttsBufferRef.current = "";
    spokenRef.current = 0;
    finishedRef.current = 0;
    streamDoneRef.current = false;
    finalizedRef.current = false;
    stopAudio();

    await postMessageStream(
      {
        session_id: sessionIdRef.current ?? undefined,
        message: text,
        mode: "voice",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      {
        onSession: (id) => {
          sessionIdRef.current = id;
        },
        onToolStart: (name) => update((e) => ({ ...e, tools: [...e.tools, toolCallPending(name)] })),
        onToolDone: (name, status) =>
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
          update((e) => ({ ...e, answer: e.answer + delta }));
          if (!mutedRef.current) {
            ttsBufferRef.current += delta;
            speak(false);
          }
        },
        onUiBlock: ({ component, props }) =>
          update((e) => ({ ...e, uiBlocks: [...e.uiBlocks, { type: "ui", component, props }] })),
        onDone: () => {
          streamDoneRef.current = true;
          if (!mutedRef.current) speak(true);
          if (spokenRef.current === 0) {
            finalize();
          }
        },
        onError: (err) => {
          update((e) => ({ ...e, error: err.message }));
          setPhaseTracked("idle");
        },
      }
    );
  }

  async function handleSpeechEnd(audio: Float32Array) {
    if (!conversationRef.current && phaseRef.current !== "listening") {
      return;
    }

    setPhaseTracked("thinking");

    try {
      const wavBlob = encodeWav(audio, 16000);
      const text = await transcribeAudio(wavBlob);
      const clean = text.trim();

      if (!clean) {
        setPhaseTracked("idle");
        if (conversationRef.current && vadRef.current && !vadRef.current.listening) {
          void vadRef.current.start();
        }
        return;
      }

      const isFollowUp = Date.now() - lastExchangeAtRef.current < 30_000;
      const wakeMatch = clean.match(/^(?:hey\s+)?sazed[\s,.:!?]*(.*)$/i);

      let prompt = clean;
      if (conversationRef.current && !isFollowUp) {
        if (!wakeMatch) {
          setPhaseTracked("idle");
          if (vadRef.current && !vadRef.current.listening) {
            void vadRef.current.start();
          }
          return;
        }
        prompt = wakeMatch[1].trim() || "Hey Sazed";
      } else if (wakeMatch && wakeMatch[1].trim()) {
        prompt = wakeMatch[1].trim();
      }

      if (vadRef.current?.listening) {
        await vadRef.current.pause();
      }

      await send(prompt);
    } catch {
      setPhaseTracked("idle");
      if (conversationRef.current && vadRef.current && !vadRef.current.listening) {
        void vadRef.current.start();
      }
    }
  }

  useEffect(() => {
    let active = true;

    async function initVad() {
      try {
        const vad = await MicVAD.new({
          baseAssetPath: "/vad/",
          onnxWASMBasePath: "/vad/",
          startOnLoad: false,
          onSpeechStart: () => {
            if (!active) return;
            if (phaseRef.current === "speaking") {
              stopSpeaking();
            }
            setPhaseTracked("listening");
          },
          onVADMisfire: () => {
            if (!active) return;
            if (phaseRef.current === "listening") {
              setPhaseTracked("idle");
            }
          },
          onSpeechEnd: (audio) => {
            if (!active) return;
            void handleSpeechEnd(audio);
          },
        });

        if (!active) {
          void vad.destroy();
          return;
        }

        vadRef.current = vad;
      } catch {
        vadRef.current = null;
      }
    }

    void initVad();

    return () => {
      active = false;
      if (vadRef.current) {
        void vadRef.current.destroy();
        vadRef.current = null;
      }
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
    stopAudio();
    finalizedRef.current = true;
    lastExchangeAtRef.current = Date.now();
    if (conversationRef.current && vadRef.current) {
      void vadRef.current.start();
    } else {
      setPhaseTracked("idle");
    }
  }

  function tapMic() {
    if (phase === "speaking") {
      stopSpeaking();
      return;
    }
    if (phase === "listening") {
      cancelledRef.current = true;
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
      void vadRef.current.start();
    } else if (canListen) {
      listen();
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && phase === "speaking") {
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
    setConversation(conversationRef.current);
    if (conversationRef.current) {
      if (vadRef.current && !vadRef.current.listening && phase === "idle") {
        void vadRef.current.start();
      }
    } else {
      if (vadRef.current?.listening && phase !== "speaking") {
        void vadRef.current.pause();
      }
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

  function dismiss() {
    if (phase === "idle") setExchange(null);
  }

  return {
    phase,
    exchange,
    conversation,
    muted,
    voices,
    voiceUri,
    canListen,
    tapMic,
    stopSpeaking,
    ask,
    dismiss,
    toggleConversation,
    toggleMute,
    chooseVoice,
  };
}
