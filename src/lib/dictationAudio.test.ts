import { describe, expect, it } from "vitest";
import { downsample, mergeChunks } from "./dictationAudio";

describe("mergeChunks", () => {
  it("joins chunks in order", () => {
    const out = mergeChunks([new Float32Array([1, 2]), new Float32Array([3]), new Float32Array([4, 5])]);
    expect(Array.from(out)).toEqual([1, 2, 3, 4, 5]);
  });

  it("returns an empty array for no chunks", () => {
    expect(mergeChunks([]).length).toBe(0);
  });
});

describe("downsample", () => {
  it("returns the samples unchanged when the rate already matches", () => {
    const input = new Float32Array([0.1, 0.2, 0.3]);
    expect(downsample(input, 16000)).toBe(input);
  });

  it("averages each window going from 48000 to 16000", () => {
    const input = new Float32Array([1, 2, 3, 4, 5, 6]);
    expect(Array.from(downsample(input, 48000, 16000))).toEqual([2, 5]);
  });

  it("shortens the output by the rate ratio", () => {
    const out = downsample(new Float32Array(48000), 48000, 16000);
    expect(out.length).toBe(16000);
  });

  it("handles a non-integer ratio", () => {
    const out = downsample(new Float32Array(44100), 44100, 16000);
    expect(out.length).toBe(16000);
  });
});
