import { fetchSpeechAudio } from "@/api/audio";
import { fillerCategory } from "@/lib/toolMap";
import type { ToolCall } from "@/mock/data";

const CACHE_NAME = "sazed-fillers";
const BUSY_RETRY_MS = 1_500;

const CATEGORY_LINES: Record<ToolCall["category"], string | null> = {
  calendar: "Checking your calendar.",
  tasks: "Looking at your tasks.",
  email: "Checking your email.",
  kb: "Searching your notes.",
  finance: "Pulling up your numbers.",
  notify: "On it.",
  memory: null,
};
const FALLBACK_LINE = "One moment.";

const ALL_LINES = [
  ...new Set([...Object.values(CATEGORY_LINES).filter((l): l is string => l !== null), FALLBACK_LINE]),
];

export function fillerLine(toolName: string): string | null {
  const category = fillerCategory(toolName);
  return category === null ? FALLBACK_LINE : CATEGORY_LINES[category];
}

interface ClipVoice {
  engine: "kokoro" | "fish";
  voice: string;
}

function parseVoice(voiceUri: string): ClipVoice | null {
  if (voiceUri.startsWith("kokoro:")) return { engine: "kokoro", voice: voiceUri.slice(7) };
  if (voiceUri.startsWith("fish:")) return { engine: "fish", voice: voiceUri.slice(5) };
  return null;
}

function cacheKey({ engine, voice }: ClipVoice, line: string): string {
  const seg = encodeURIComponent;
  return `${location.origin}/__fillers/${seg(engine)}/${seg(voice)}/${seg(line)}`;
}

async function openCache(): Promise<Cache | null> {
  try {
    return typeof caches === "undefined" ? null : await caches.open(CACHE_NAME);
  } catch {
    return null;
  }
}

export interface FillerStore {
  prime: (voiceUri: string) => void;
  buffer: (voiceUri: string, toolName: string) => AudioBuffer | null;
}

export function createFillerStore(opts: {
  getContext: () => AudioContext;
  busy: () => boolean;
}): FillerStore {
  const buffers = new Map<string, AudioBuffer>();
  let generation = 0;

  const memoryKey = (voiceUri: string, line: string) => `${voiceUri}\u0000${line}`;

  async function load(cache: Cache | null, clip: ClipVoice, line: string) {
    const key = cacheKey(clip, line);
    let bytes: ArrayBuffer | null = null;
    try {
      const hit = await cache?.match(key);
      if (hit) bytes = await hit.arrayBuffer();
    } catch {}
    if (!bytes) {
      bytes = await fetchSpeechAudio({ text: line, voice: clip.voice, engine: clip.engine, format: "mp3" });
      try {
        await cache?.put(key, new Response(bytes.slice(0), { headers: { "Content-Type": "audio/mpeg" } }));
      } catch {}
    }
    return opts.getContext().decodeAudioData(bytes.slice(0));
  }

  async function run(voiceUri: string, clip: ClipVoice, gen: number) {
    const cache = await openCache();
    for (const line of ALL_LINES) {
      const mk = memoryKey(voiceUri, line);
      if (buffers.has(mk)) continue;
      while (opts.busy()) {
        await new Promise((r) => setTimeout(r, BUSY_RETRY_MS));
        if (gen !== generation) return;
      }
      if (gen !== generation) return;
      try {
        const buf = await load(cache, clip, line);
        if (gen !== generation) return;
        buffers.set(mk, buf);
      } catch {
        return;
      }
    }
  }

  return {
    prime(voiceUri) {
      const gen = ++generation;
      const clip = parseVoice(voiceUri);
      if (clip) void run(voiceUri, clip, gen);
    },
    buffer(voiceUri, toolName) {
      const line = fillerLine(toolName);
      return line === null ? null : (buffers.get(memoryKey(voiceUri, line)) ?? null);
    },
  };
}
