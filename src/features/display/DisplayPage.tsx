import { useEffect, useRef, useState } from "react";
import { ToolsRow } from "../chat/ToolsRow";
import { StreamingIndicator } from "../chat/StreamingIndicator";
import { MarkdownContent } from "../chat/MarkdownContent";
import { ClockWidget } from "../../widgets/ClockWidget";
import { CalendarWidget } from "../../widgets/CalendarWidget";
import { TaskWidget } from "../../widgets/TaskWidget";
import { EmailBadge } from "../../widgets/EmailBadge";
import { FinanceWidget } from "../../widgets/FinanceWidget";
import { WeatherWidget } from "../../widgets/WeatherWidget";
import { WidgetRenderer } from "../../widgets/WidgetRenderer";
import { useDisplayData } from "../../hooks/useDisplayData";
import { postMessageStream } from "../../api/chat";
import { toolCallPending } from "../../lib/toolMap";
import type { ToolCall, UIBlock } from "../../mock/data";
import styles from "./DisplayPage.module.css";

function stripMarkdownForTts(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*{1,3}([^*\n]+)\*{1,3}/g, "$1")
    .replace(/_{1,3}([^_\n]+)_{1,3}/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/^>\s*/gm, "")
    .replace(/^[-*_]{3,}\s*$/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

type Phase = "idle" | "listening" | "thinking" | "speaking";

interface VoiceMsg {
  role: "user" | "assistant";
  content: string;
  tools?: ToolCall[];
  uiBlocks?: UIBlock[];
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

const PHASE_LABEL: Record<Phase, string> = {
  idle: "tap to talk",
  listening: "listening...",
  thinking: "thinking...",
  speaking: "speaking...",
};

const VOICE_STORAGE_KEY = "sazed-voice-uri";
const MUTE_STORAGE_KEY = "sazed-mute";
const BRIEF_DATE_KEY = "sazed-brief-date";
const BRIEF_CARDS_KEY = "sazed-brief-cards";

const BRIEF_PROMPT =
  "Give me a brief summary of my day. Use CalendarWidget for today's events if there are any, " +
  "and TaskWidget for tasks due today. Keep it to 1–2 sentences of text.";

export function DisplayPage() {
  const displayData = useDisplayData();

  const [phase, setPhase] = useState<Phase>("idle");
  const [messages, setMessages] = useState<VoiceMsg[]>([]);
  const [conversationMode, setConversationMode] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceUri, setSelectedVoiceUri] = useState<string>(
    () => localStorage.getItem(VOICE_STORAGE_KEY) ?? ""
  );
  const [muted, setMuted] = useState<boolean>(
    () => localStorage.getItem(MUTE_STORAGE_KEY) === "true"
  );

  // Sazed zone — cycling queue of UIBlocks from brief + voice interactions
  const [sazedQueue, setSazedQueue] = useState<UIBlock[]>(() => {
    try {
      const stored = localStorage.getItem(BRIEF_CARDS_KEY);
      return stored ? (JSON.parse(stored) as UIBlock[]) : [];
    } catch {
      return [];
    }
  });
  const [activeCardIdx, setActiveCardIdx] = useState(0);
  const [briefLoading, setBriefLoading] = useState(false);

  const sessionIdRef = useRef<string | null>(null);
  const ttsBufferRef = useRef("");
  const utteranceCountRef = useRef(0);
  const utteranceDoneRef = useRef(0);
  const streamDoneRef = useRef(false);
  const conversationModeRef = useRef(false);
  const selectedVoiceUriRef = useRef(selectedVoiceUri);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const finalizedRef = useRef(false);
  const pollIntervalRef = useRef<number | null>(null);
  const wakeLockRef = useRef<{ release: () => void } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const cancelledListeningRef = useRef(false);
  const mutedRef = useRef(muted);

  // Wake lock
  useEffect(() => {
    async function acquire() {
      if (!("wakeLock" in navigator)) return;
      try {
        wakeLockRef.current = await (
          navigator as Navigator & { wakeLock: { request: (t: string) => Promise<{ release: () => void }> } }
        ).wakeLock.request("screen");
      } catch { /* silent */ }
    }
    void acquire();
    const onVisibility = () => { if (document.visibilityState === "visible") void acquire(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      wakeLockRef.current?.release();
    };
  }, []);

  // Load voices
  useEffect(() => {
    function load() {
      const all = speechSynthesis.getVoices();
      if (!all.length) return;
      const en = all
        .filter((v) => v.lang.startsWith("en"))
        .sort((a, b) => Number(a.localService) - Number(b.localService));
      setVoices(en);
      voicesRef.current = en;
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

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Sazed zone cycling
  useEffect(() => {
    if (sazedQueue.length <= 1) return;
    const id = setInterval(() => {
      setActiveCardIdx((prev) => (prev + 1) % sazedQueue.length);
    }, 30_000);
    return () => clearInterval(id);
  }, [sazedQueue.length]);

  // Daily brief — fires once per day on mount
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const briefDate = localStorage.getItem(BRIEF_DATE_KEY);
    if (briefDate === today) return; // already ran today

    setBriefLoading(true);
    const briefCards: UIBlock[] = [];

    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "", uiBlocks: [] },
    ]);

    postMessageStream(
      {
        session_id: sessionIdRef.current ?? undefined,
        message: BRIEF_PROMPT,
        mode: "display",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      {
        onSession: (id) => { sessionIdRef.current = id; },

        onToolStart: (name) => {
          setMessages((prev) => {
            const msgs = [...prev];
            const last = { ...msgs[msgs.length - 1] };
            last.tools = [...(last.tools ?? []), toolCallPending(name)];
            msgs[msgs.length - 1] = last;
            return msgs;
          });
        },

        onToolDone: () => { /* tool status updates not needed for brief display */ },

        onText: (delta) => {
          setMessages((prev) => {
            const msgs = [...prev];
            const last = { ...msgs[msgs.length - 1] };
            last.content = last.content + delta;
            msgs[msgs.length - 1] = last;
            return msgs;
          });
        },

        onUiBlock: ({ component, props }) => {
          const block: UIBlock = { type: "ui", component, props };
          briefCards.push(block);
          setMessages((prev) => {
            const msgs = [...prev];
            const last = { ...msgs[msgs.length - 1] };
            last.uiBlocks = [...(last.uiBlocks ?? []), block];
            msgs[msgs.length - 1] = last;
            return msgs;
          });
          setSazedQueue([...briefCards]);
          setActiveCardIdx(0);
        },

        onDone: () => {
          setBriefLoading(false);
          localStorage.setItem(BRIEF_DATE_KEY, today);
          if (briefCards.length > 0) {
            localStorage.setItem(BRIEF_CARDS_KEY, JSON.stringify(briefCards));
          }
        },

        onError: () => {
          setBriefLoading(false);
          // Remove empty brief message if nothing came through
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant" && !last.content && !last.uiBlocks?.length) {
              return prev.slice(0, -1);
            }
            return prev;
          });
        },
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Voice functions (preserved) ──────────────────────────────────────────

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
    recognition.onresult = (e) => { transcript = e.results[0][0].transcript; };
    recognition.onend = () => {
      recognitionRef.current = null;
      if (cancelledListeningRef.current || !transcript.trim()) { setPhase("idle"); return; }
      void sendMessage(transcript.trim());
    };
    recognition.onerror = () => { recognitionRef.current = null; setPhase("idle"); };

    cancelledListeningRef.current = false;
    recognitionRef.current = recognition;
    setPhase("listening");
    recognition.start();
  }

  function finalize() {
    if (finalizedRef.current) return;
    finalizedRef.current = true;
    if (pollIntervalRef.current !== null) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (conversationModeRef.current) {
      setTimeout(startListening, 600);
    } else {
      setPhase("idle");
    }
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
      const u = new SpeechSynthesisUtterance(stripMarkdownForTts(sentence));
      if (activeVoice) u.voice = activeVoice;
      u.onstart = () => setPhase("speaking");
      u.onend = () => {
        utteranceDoneRef.current++;
        if (streamDoneRef.current && utteranceDoneRef.current >= utteranceCountRef.current) {
          finalize();
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
    finalizedRef.current = false;
    if (pollIntervalRef.current !== null) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    await postMessageStream(
      {
        session_id: sessionIdRef.current ?? undefined,
        message: text,
        mode: "voice",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      {
        onSession: (id) => { sessionIdRef.current = id; },

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
          if (!mutedRef.current) {
            ttsBufferRef.current += delta;
            flushTtsBuffer(false);
          }
        },

        onUiBlock: ({ component, props }) => {
          const block: UIBlock = { type: "ui", component, props };
          setMessages((prev) => {
            const msgs = [...prev];
            const last = { ...msgs[msgs.length - 1] };
            last.uiBlocks = [...(last.uiBlocks ?? []), block];
            msgs[msgs.length - 1] = last;
            return msgs;
          });
          // Also push to Sazed zone (front of queue)
          setSazedQueue((prev) => [block, ...prev]);
          setActiveCardIdx(0);
        },

        onDone: () => {
          streamDoneRef.current = true;
          if (!mutedRef.current) flushTtsBuffer(true);
          if (utteranceCountRef.current === 0) {
            finalize();
          } else {
            pollIntervalRef.current = window.setInterval(() => {
              if (!speechSynthesis.speaking && !speechSynthesis.pending) {
                clearInterval(pollIntervalRef.current!);
                pollIntervalRef.current = null;
                finalize();
              }
            }, 250);
          }
        },

        onError: (err) => {
          setMessages((prev) => {
            const msgs = [...prev];
            msgs[msgs.length - 1] = { role: "assistant", content: `Error: ${err.message}` };
            return msgs;
          });
          setPhase("idle");
        },
      }
    );
  }

  function handleTap() {
    if (phase === "speaking") {
      speechSynthesis.cancel();
      finalizedRef.current = true;
      if (pollIntervalRef.current !== null) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      setPhase("idle");
      return;
    }
    if (phase === "listening") {
      cancelledListeningRef.current = true;
      recognitionRef.current?.stop();
      setPhase("idle");
      return;
    }
    if (phase !== "idle") return;

    const w = window as unknown as Record<string, unknown>;
    if (!w.SpeechRecognition && !w.webkitSpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    if (!mutedRef.current) {
      const unlock = new SpeechSynthesisUtterance("");
      unlock.volume = 0;
      speechSynthesis.speak(unlock);
    }
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

  function toggleMute() {
    setMuted((prev) => {
      mutedRef.current = !prev;
      localStorage.setItem(MUTE_STORAGE_KEY, String(!prev));
      return !prev;
    });
  }

  const isLastStreaming = phase === "thinking" || phase === "speaking";
  const activeSazedCard = sazedQueue[activeCardIdx] ?? null;
  const hasFeed = messages.length > 0;

  return (
    <div className={styles.page}>
      {/* ── Floating voice bar (top-right) ─────────────────────────────── */}
      <div className={styles.voiceBar}>
        <div className={styles.voiceControls}>
          {voices.length > 0 && !muted && (
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
            className={`${styles.iconBtn} ${conversationMode ? styles.iconActive : ""}`}
            onClick={toggleConversationMode}
            aria-label={conversationMode ? "turn off conversation mode" : "turn on conversation mode"}
          >
            <LoopIcon />
          </button>
          <button
            className={`${styles.iconBtn} ${muted ? styles.iconActive : ""}`}
            onClick={toggleMute}
            aria-label={muted ? "unmute voice output" : "mute voice output"}
          >
            <MuteIcon muted={muted} />
          </button>
          <button
            className={`${styles.micBtn} ${styles[phase]}`}
            onClick={handleTap}
            disabled={phase === "thinking"}
            aria-label={PHASE_LABEL[phase]}
          >
            <MicIcon phase={phase} />
          </button>
        </div>
        {phase !== "idle" && (
          <span className={styles.voiceStatus}>{PHASE_LABEL[phase]}</span>
        )}
      </div>

      {/* ── Info panel (main content) ───────────────────────────────────── */}
      <div className={`${styles.infoPanel} ${hasFeed ? styles.hasFeed : ""}`}>
        <div className={styles.clockZone}>
          <ClockWidget />
        </div>

        <div className={styles.ambientGrid}>
          <CalendarWidget events={displayData.calendar.data?.events} />
          <TaskWidget
            tasks={displayData.tasks.data?.tasks}
            count={displayData.tasks.data?.count}
          />
          <EmailBadge
            count={displayData.email.data?.count}
            messages={displayData.email.data?.messages}
          />
          <FinanceWidget upcoming={displayData.finance.data ?? undefined} />
          <WeatherWidget />
        </div>

        <div className={styles.sazedZone}>
          <div className={styles.sazedHeader}>
            <span className={styles.sazedLabel}>sazed</span>
            {sazedQueue.length > 1 && (
              <div className={styles.dots}>
                {sazedQueue.map((_, i) => (
                  <button
                    key={i}
                    className={`${styles.dot} ${i === activeCardIdx ? styles.dotActive : ""}`}
                    onClick={() => setActiveCardIdx(i)}
                    aria-label={`Card ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
          {briefLoading && !activeSazedCard && (
            <div className={styles.sazedLoading}>preparing your brief…</div>
          )}
          {activeSazedCard && (
            <WidgetRenderer name={activeSazedCard.component} props={activeSazedCard.props} />
          )}
          {!briefLoading && !activeSazedCard && (
            <div className={styles.sazedEmpty}>say something to get started</div>
          )}
        </div>
      </div>

      {/* ── Feed panel (fixed bottom, only when there are messages) ────── */}
      {hasFeed && (
        <div className={styles.feedPanel}>
          {messages.map((msg, i) => {
            const isUser = msg.role === "user";
            const isLast = i === messages.length - 1;
            const hasTools = (msg.tools?.length ?? 0) > 0;
            const hasUi = (msg.uiBlocks?.length ?? 0) > 0;
            const showDots = isLast && isLastStreaming && !msg.content && !hasTools && !hasUi;
            return (
              <div key={i} className={`${styles.msg} ${isUser ? styles.user : styles.assistant}`}>
                <span className={styles.label}>{isUser ? "you" : "sazed"}</span>
                {hasTools && <ToolsRow tools={msg.tools!} />}
                {hasUi && msg.uiBlocks!.map((b, j) => (
                  <WidgetRenderer key={j} name={b.component} props={b.props} />
                ))}
                <div className={styles.body}>
                  {showDots ? (
                    <StreamingIndicator />
                  ) : isUser ? (
                    <p>{msg.content}</p>
                  ) : (
                    <MarkdownContent content={msg.content} />
                  )}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}

// ── Icons (preserved) ──────────────────────────────────────────────────────

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
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect x="11" y="2" width="10" height="16" rx="5" fill="currentColor" />
      <path d="M6 16a10 10 0 0 0 20 0" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <line x1="16" y1="26" x2="16" y2="30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="11" y1="30" x2="21" y2="30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function LoopIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M17 2l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M7 22l-4-4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function MuteIcon({ muted }: { muted: boolean }) {
  if (muted) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor" />
        <line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
