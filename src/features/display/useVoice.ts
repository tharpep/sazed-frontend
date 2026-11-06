import { useEffect, useRef, useState } from "react";

import { postMessageStream } from "@/api/chat";
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

/** Talk to Sazed: speech in (Web Speech recognition), the streamed answer, and speech out sentence
 * by sentence as it streams. Conversation mode listens again after each answer. One session per
 * page load, so follow-ups have context. */
export function useVoice() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [exchange, setExchange] = useState<Exchange | null>(null);
  const [conversation, setConversation] = useState(false);
  const [muted, setMuted] = useState(() => localStorage.getItem(MUTE_KEY) === "true");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceUri, setVoiceUri] = useState(() => localStorage.getItem(VOICE_KEY) ?? "");

  const sessionIdRef = useRef<string | null>(null);
  const ttsBufferRef = useRef("");
  const spokenRef = useRef(0);
  const finishedRef = useRef(0);
  const streamDoneRef = useRef(false);
  const finalizedRef = useRef(false);
  const pollRef = useRef<number | null>(null);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const cancelledRef = useRef(false);
  const conversationRef = useRef(false);
  const mutedRef = useRef(muted);
  const voiceUriRef = useRef(voiceUri);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof speechSynthesis === "undefined") return;
    function load() {
      const en = speechSynthesis
        .getVoices()
        .filter((v) => v.lang.startsWith("en"))
        .sort((a, b) => Number(a.localService) - Number(b.localService));
      if (!en.length) return;
      setVoices(en);
      voicesRef.current = en;
      if (!localStorage.getItem(VOICE_KEY)) {
        voiceUriRef.current = en[0].voiceURI;
        setVoiceUri(en[0].voiceURI);
        localStorage.setItem(VOICE_KEY, en[0].voiceURI);
      }
    }
    load();
    speechSynthesis.addEventListener("voiceschanged", load);
    return () => speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  function stopPoll() {
    if (pollRef.current !== null) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function finalize() {
    if (finalizedRef.current) return;
    finalizedRef.current = true;
    stopPoll();
    if (conversationRef.current) setTimeout(listen, 600);
    else setPhase("idle");
  }

  function speak(isFinal: boolean) {
    const buffer = ttsBufferRef.current;
    const boundary = /[.!?]+[\s\n]+/g;
    const sentences: string[] = [];
    let last = 0;
    let match;
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
    const voice = voicesRef.current.find((v) => v.voiceURI === voiceUriRef.current) ?? null;
    for (const sentence of sentences) {
      spokenRef.current++;
      const u = new SpeechSynthesisUtterance(stripMarkdownForTts(sentence));
      if (voice) u.voice = voice;
      u.onstart = () => setPhase("speaking");
      u.onend = () => {
        finishedRef.current++;
        if (streamDoneRef.current && finishedRef.current >= spokenRef.current) finalize();
      };
      speechSynthesis.speak(u);
    }
  }

  function update(fn: (e: Exchange) => Exchange) {
    setExchange((prev) => (prev ? fn(prev) : prev));
  }

  async function send(text: string) {
    setPhase("thinking");
    setExchange({ question: text, answer: "", tools: [], uiBlocks: [], error: null });
    ttsBufferRef.current = "";
    spokenRef.current = 0;
    finishedRef.current = 0;
    streamDoneRef.current = false;
    finalizedRef.current = false;
    stopPoll();

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
            return;
          }
          pollRef.current = window.setInterval(() => {
            if (!speechSynthesis.speaking && !speechSynthesis.pending) finalize();
          }, 250);
        },
        onError: (err) => {
          update((e) => ({ ...e, error: err.message }));
          setPhase("idle");
        },
      }
    );
  }

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
        setPhase("idle");
        return;
      }
      void send(transcript.trim());
    };
    recognition.onerror = () => {
      recognitionRef.current = null;
      setPhase("idle");
    };
    cancelledRef.current = false;
    recognitionRef.current = recognition;
    setPhase("listening");
    recognition.start();
  }

  const canListen = typeof window !== "undefined" && Boolean(recognitionCtor());

  function tapMic() {
    if (phase === "speaking") {
      speechSynthesis.cancel();
      finalizedRef.current = true;
      stopPoll();
      setPhase("idle");
      return;
    }
    if (phase === "listening") {
      cancelledRef.current = true;
      recognitionRef.current?.stop();
      setPhase("idle");
      return;
    }
    if (phase !== "idle" || !canListen) return;
    if (!mutedRef.current) {
      // Chrome only lets speech play after a user gesture; an empty utterance here unlocks it.
      const unlock = new SpeechSynthesisUtterance("");
      unlock.volume = 0;
      speechSynthesis.speak(unlock);
    }
    listen();
  }

  function ask(text: string) {
    if (text.trim() && phase === "idle") void send(text.trim());
  }

  function toggleConversation() {
    conversationRef.current = !conversationRef.current;
    setConversation(conversationRef.current);
  }

  function toggleMute() {
    mutedRef.current = !mutedRef.current;
    localStorage.setItem(MUTE_KEY, String(mutedRef.current));
    setMuted(mutedRef.current);
    if (mutedRef.current) speechSynthesis.cancel();
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
    ask,
    dismiss,
    toggleConversation,
    toggleMute,
    chooseVoice,
  };
}
