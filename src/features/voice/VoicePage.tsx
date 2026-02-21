import { useEffect, useRef, useState } from "react";
import { ToolsRow } from "../chat/ToolsRow";
import { StreamingIndicator } from "../chat/StreamingIndicator";
import { postMessageStream } from "../../api/chat";
import { toolCallPending } from "../../lib/toolMap";
import type { ToolCall } from "../../mock/data";
import styles from "./VoicePage.module.css";

type Phase = "idle" | "listening" | "thinking" | "speaking";

interface VoiceMsg {
  role: "user" | "assistant";
  content: string;
  tools?: ToolCall[];
}

interface ISpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: { results: { 0: { 0: { transcript: string } } } }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
}

const PHASE_LABEL: Record<Phase, string> = {
  idle: "tap to talk",
  listening: "listening...",
  thinking: "thinking...",
  speaking: "speaking...",
};

const VOICE_STORAGE_KEY = "sazed-voice-uri";

export function VoicePage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [messages, setMessages] = useState<VoiceMsg[]>([]);
  const [conversationMode, setConversationMode] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceUri, setSelectedVoiceUri] = useState<string>(
    () => localStorage.getItem(VOICE_STORAGE_KEY) ?? ""
  );

  const sessionIdRef = useRef<string | null>(null);
  const ttsBufferRef = useRef("");
  const utteranceCountRef = useRef(0);
  const utteranceDoneRef = useRef(0);
  const streamDoneRef = useRef(false);
  const conversationModeRef = useRef(false);
  const selectedVoiceUriRef = useRef(selectedVoiceUri);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const wakeLockRef = useRef<{ release: () => void } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Wake lock — keep screen on, re-acquire if visibility returns
  useEffect(() => {
    async function acquire() {
      if (!("wakeLock" in navigator)) return;
      try {
        wakeLockRef.current = await (
          navigator as Navigator & { wakeLock: { request: (t: string) => Promise<{ release: () => void }> } }
        ).wakeLock.request("screen");
      } catch {
        // wake lock not available or denied — silent fail
      }
    }
    void acquire();
    const onVisibility = () => {
      if (document.visibilityState === "visible") void acquire();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      wakeLockRef.current?.release();
    };
  }, []);

  // Load available voices, sorted cloud-first within English
  useEffect(() => {
    function load() {
      const all = speechSynthesis.getVoices();
      if (!all.length) return;
      const en = all
        .filter((v) => v.lang.startsWith("en"))
        .sort((a, b) => Number(a.localService) - Number(b.localService));
      setVoices(en);
      voicesRef.current = en;
      // If nothing stored yet, default to the first cloud voice
      if (!localStorage.getItem(VOICE_STORAGE_KEY) && en.length) {
        const defaultUri = en[0].voiceURI;
        setSelectedVoiceUri(defaultUri);
        selectedVoiceUriRef.current = defaultUri;
        localStorage.setItem(VOICE_STORAGE_KEY, defaultUri);
      }
    }
    load();
    speechSynthesis.addEventListener("voiceschanged", load);
    return () => speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function startListening() {
    const w = window as unknown as Record<string, unknown>;
    const SR = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as
      | (new () => ISpeechRecognition)
      | undefined;
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
      if (!transcript.trim()) {
        setPhase("idle");
        return;
      }
      void sendMessage(transcript.trim());
    };

    recognition.onerror = () => {
      setPhase("idle");
    };

    setPhase("listening");
    recognition.start();
  }

  function flushTtsBuffer(isFinal: boolean) {
    const buffer = ttsBufferRef.current;
    const boundaryRe = /[.!?]+[\s\n]+/g;
    let match;
    let lastIndex = 0;
    const sentences: string[] = [];

    while ((match = boundaryRe.exec(buffer)) !== null) {
      const sentence = buffer.slice(lastIndex, match.index + match[0].length).trim();
      if (sentence) sentences.push(sentence);
      lastIndex = match.index + match[0].length;
    }

    if (isFinal) {
      const remainder = buffer.slice(lastIndex).trim();
      if (remainder) sentences.push(remainder);
      ttsBufferRef.current = "";
    } else {
      ttsBufferRef.current = buffer.slice(lastIndex);
    }

    const activeVoice = voicesRef.current.find((v) => v.voiceURI === selectedVoiceUriRef.current) ?? null;

    for (const sentence of sentences) {
      utteranceCountRef.current++;
      const u = new SpeechSynthesisUtterance(sentence);
      if (activeVoice) u.voice = activeVoice;
      u.onstart = () => setPhase("speaking");
      u.onend = () => {
        utteranceDoneRef.current++;
        if (streamDoneRef.current && utteranceDoneRef.current >= utteranceCountRef.current) {
          if (conversationModeRef.current) {
            setTimeout(startListening, 600);
          } else {
            setPhase("idle");
          }
        }
      };
      speechSynthesis.speak(u);
    }
  }

  async function sendMessage(text: string) {
    setPhase("thinking");
    setMessages((prev) => [
      ...prev,
      { role: "user", content: text },
      { role: "assistant", content: "" },
    ]);

    ttsBufferRef.current = "";
    utteranceCountRef.current = 0;
    utteranceDoneRef.current = 0;
    streamDoneRef.current = false;

    await postMessageStream(
      { session_id: sessionIdRef.current ?? undefined, message: text },
      {
        onSession: (id) => {
          sessionIdRef.current = id;
        },

        onToolStart: (name) => {
          setMessages((prev) => {
            const msgs = [...prev];
            const last = { ...msgs[msgs.length - 1] };
            last.tools = [...(last.tools ?? []), toolCallPending(name)];
            msgs[msgs.length - 1] = last;
            return msgs;
          });
        },

        onToolDone: (name) => {
          const label = name.replace(/_/g, " ");
          setMessages((prev) => {
            const msgs = [...prev];
            const last = { ...msgs[msgs.length - 1] };
            let marked = false;
            last.tools = (last.tools ?? []).map((t) => {
              if (!marked && t.label === label && !t.done) {
                marked = true;
                return { ...t, done: true };
              }
              return t;
            });
            msgs[msgs.length - 1] = last;
            return msgs;
          });
        },

        onText: (delta) => {
          setMessages((prev) => {
            const msgs = [...prev];
            const last = { ...msgs[msgs.length - 1] };
            last.content = last.content + delta;
            msgs[msgs.length - 1] = last;
            return msgs;
          });
          ttsBufferRef.current += delta;
          flushTtsBuffer(false);
        },

        onDone: () => {
          streamDoneRef.current = true;
          flushTtsBuffer(true);
          // Nothing was spoken (empty response) — resolve immediately
          if (utteranceCountRef.current === 0) {
            if (conversationModeRef.current) {
              setTimeout(startListening, 600);
            } else {
              setPhase("idle");
            }
          }
        },

        onError: (err) => {
          setMessages((prev) => {
            const msgs = [...prev];
            msgs[msgs.length - 1] = {
              role: "assistant",
              content: `Error: ${err.message}`,
            };
            return msgs;
          });
          setPhase("idle");
        },
      }
    );
  }

  function handleTap() {
    if (phase !== "idle") return;
    const w = window as unknown as Record<string, unknown>;
    if (!w.SpeechRecognition && !w.webkitSpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    // Unlock speechSynthesis while we're inside a user gesture — iOS requires
    // this or any speak() call from an async context will silently no-op.
    const unlock = new SpeechSynthesisUtterance("");
    unlock.volume = 0;
    speechSynthesis.speak(unlock);
    startListening();
  }

  function handleVoiceChange(uri: string) {
    setSelectedVoiceUri(uri);
    selectedVoiceUriRef.current = uri;
    localStorage.setItem(VOICE_STORAGE_KEY, uri);
  }

  function toggleConversationMode() {
    setConversationMode((prev) => {
      conversationModeRef.current = !prev;
      return !prev;
    });
  }

  const isLastStreaming = phase === "thinking" || phase === "speaking";

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.wordmark}>sazed</span>
      </header>

      <div className={styles.feed}>
        {messages.map((msg, i) => {
          const isUser = msg.role === "user";
          const isLast = i === messages.length - 1;
          const hasTools = (msg.tools?.length ?? 0) > 0;
          const showDots = isLast && isLastStreaming && !msg.content && !hasTools;

          return (
            <div key={i} className={`${styles.msg} ${isUser ? styles.user : styles.assistant}`}>
              <span className={styles.label}>{isUser ? "you" : "sazed"}</span>
              {hasTools && <ToolsRow tools={msg.tools!} />}
              <div className={styles.body}>
                {showDots ? <StreamingIndicator /> : <p>{msg.content}</p>}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className={styles.controls}>
        <button
          className={`${styles.btn} ${styles[phase]}`}
          onClick={handleTap}
          disabled={phase !== "idle"}
          aria-label={PHASE_LABEL[phase]}
        >
          <MicIcon phase={phase} />
        </button>
        <span className={styles.status}>{PHASE_LABEL[phase]}</span>
        <div className={styles.bottomRow}>
          {voices.length > 0 && (
            <select
              className={styles.voiceSelect}
              value={selectedVoiceUri}
              onChange={(e) => handleVoiceChange(e.target.value)}
              aria-label="Select voice"
            >
              {voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name}{v.localService ? " · device" : " · cloud"}
                </option>
              ))}
            </select>
          )}
          <button
            className={`${styles.convoToggle} ${conversationMode ? styles.convoActive : ""}`}
            onClick={toggleConversationMode}
            aria-label={conversationMode ? "turn off conversation mode" : "turn on conversation mode"}
          >
            <LoopIcon />
            conversation
          </button>
        </div>
      </div>
    </div>
  );
}

function MicIcon({ phase }: { phase: Phase }) {
  if (phase === "thinking") {
    return (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
        <circle cx="8" cy="16" r="3" fill="currentColor">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="1s" begin="0s" repeatCount="indefinite" />
        </circle>
        <circle cx="16" cy="16" r="3" fill="currentColor">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="1s" begin="0.2s" repeatCount="indefinite" />
        </circle>
        <circle cx="24" cy="16" r="3" fill="currentColor">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="1s" begin="0.4s" repeatCount="indefinite" />
        </circle>
      </svg>
    );
  }

  if (phase === "speaking") {
    return (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
        <rect x="4" y="14" width="4" height="4" rx="2" fill="currentColor">
          <animate attributeName="height" values="4;20;4" dur="0.9s" begin="0s" repeatCount="indefinite" />
          <animate attributeName="y" values="14;6;14" dur="0.9s" begin="0s" repeatCount="indefinite" />
        </rect>
        <rect x="10" y="10" width="4" height="12" rx="2" fill="currentColor">
          <animate attributeName="height" values="8;24;8" dur="0.9s" begin="0.15s" repeatCount="indefinite" />
          <animate attributeName="y" values="12;4;12" dur="0.9s" begin="0.15s" repeatCount="indefinite" />
        </rect>
        <rect x="16" y="8" width="4" height="16" rx="2" fill="currentColor">
          <animate attributeName="height" values="12;28;12" dur="0.9s" begin="0.3s" repeatCount="indefinite" />
          <animate attributeName="y" values="10;2;10" dur="0.9s" begin="0.3s" repeatCount="indefinite" />
        </rect>
        <rect x="22" y="10" width="4" height="12" rx="2" fill="currentColor">
          <animate attributeName="height" values="8;24;8" dur="0.9s" begin="0.15s" repeatCount="indefinite" />
          <animate attributeName="y" values="12;4;12" dur="0.9s" begin="0.15s" repeatCount="indefinite" />
        </rect>
      </svg>
    );
  }

  // idle + listening: microphone
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect x="11" y="2" width="10" height="16" rx="5" fill="currentColor" />
      <path
        d="M6 16a10 10 0 0 0 20 0"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <line x1="16" y1="26" x2="16" y2="30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="11" y1="30" x2="21" y2="30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function LoopIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M17 2l4 4-4 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 11V9a4 4 0 0 1 4-4h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M7 22l-4-4 4-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 13v2a4 4 0 0 1-4 4H3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
