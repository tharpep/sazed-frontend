import { useCallback, useEffect, useRef, useState } from "react";
import { transcribeAudio } from "../api/audio";
import { encodeWav } from "../lib/audioWav";
import { downsample, mergeChunks } from "../lib/dictationAudio";

export type DictationState = "idle" | "recording" | "transcribing" | "error";

const MAX_RECORDING_MS = 120_000;

interface Capture {
  stream: MediaStream;
  context: AudioContext;
  source: MediaStreamAudioSourceNode;
  processor: ScriptProcessorNode;
  chunks: Float32Array[];
  timer: ReturnType<typeof setTimeout>;
}

function release(capture: Capture) {
  clearTimeout(capture.timer);
  capture.processor.onaudioprocess = null;
  capture.processor.disconnect();
  capture.source.disconnect();
  capture.stream.getTracks().forEach((t) => t.stop());
  void capture.context.close();
}

export function useDictation({ onText }: { onText: (text: string) => void }) {
  const [state, setState] = useState<DictationState>("idle");
  const [error, setError] = useState<string | null>(null);
  const captureRef = useRef<Capture | null>(null);
  const onTextRef = useRef(onText);
  const aliveRef = useRef(true);
  onTextRef.current = onText;

  const supported =
    typeof navigator !== "undefined" && typeof navigator.mediaDevices?.getUserMedia === "function";

  const stop = useCallback(async () => {
    const capture = captureRef.current;
    if (!capture) return;
    captureRef.current = null;
    const rate = capture.context.sampleRate;
    release(capture);
    setState("transcribing");
    try {
      const samples = downsample(mergeChunks(capture.chunks), rate);
      const text = (await transcribeAudio(encodeWav(samples))).trim();
      if (!aliveRef.current) return;
      if (text) onTextRef.current(text);
      setState("idle");
    } catch {
      if (!aliveRef.current) return;
      setError("Transcription failed");
      setState("error");
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Microphone unavailable");
      setState("error");
      return;
    }
    if (!aliveRef.current) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const context = new Ctx();
    const source = context.createMediaStreamSource(stream);
    const processor = context.createScriptProcessor(4096, 1, 1);
    const chunks: Float32Array[] = [];
    processor.onaudioprocess = (e) => {
      chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
    };
    source.connect(processor);
    processor.connect(context.destination);
    captureRef.current = {
      stream,
      context,
      source,
      processor,
      chunks,
      timer: setTimeout(() => void stop(), MAX_RECORDING_MS),
    };
    setState("recording");
  }, [stop]);

  const toggle = useCallback(() => {
    if (state === "recording") void stop();
    else if (state === "idle" || state === "error") void start();
  }, [state, start, stop]);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      if (captureRef.current) release(captureRef.current);
      captureRef.current = null;
    };
  }, []);

  return { state, error, supported, toggle };
}
