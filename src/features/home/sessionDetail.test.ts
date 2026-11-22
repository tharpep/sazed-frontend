import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/api/client";

const getSession = vi.fn();
vi.mock("@/api/sessions", () => ({ getSession: (id: string) => getSession(id) }));

const { loadSessionDetail, pruneSessionDetails } = await import("./sessionDetail");

afterEach(() => {
  vi.useRealTimers();
  getSession.mockReset();
});

describe("loadSessionDetail", () => {
  it("never asks again for a session Sazed answered 404 for", async () => {
    vi.useFakeTimers();
    getSession.mockRejectedValue(new ApiError("Session not found", 404));
    loadSessionDetail("gone");
    await vi.runAllTicks();
    await Promise.resolve();
    vi.advanceTimersByTime(60_000);
    loadSessionDetail("gone");
    expect(getSession).toHaveBeenCalledTimes(1);
  });

  it("asks again after a 404 once Sazed has heard from the session since", async () => {
    vi.useFakeTimers();
    getSession.mockRejectedValueOnce(new ApiError("Session not found", 404)).mockResolvedValue({ last_heard_at: "h2", agents: [] });
    loadSessionDetail("redeploy", "h1");
    await Promise.resolve();
    await Promise.resolve();
    vi.advanceTimersByTime(60_000);
    loadSessionDetail("redeploy", "h1");
    expect(getSession).toHaveBeenCalledTimes(1);
    loadSessionDetail("redeploy", "h2");
    expect(getSession).toHaveBeenCalledTimes(2);
  });

  it("forgets sessions that left the live list", async () => {
    vi.useFakeTimers();
    getSession.mockResolvedValue({ last_heard_at: "a", agents: [] });
    loadSessionDetail("left");
    await Promise.resolve();
    await Promise.resolve();
    pruneSessionDetails(new Set());
    loadSessionDetail("left");
    expect(getSession).toHaveBeenCalledTimes(2);
  });

  it("sends one request per id at a time and at most one per 10 s", async () => {
    vi.useFakeTimers();
    getSession.mockResolvedValue({ last_heard_at: "a", agents: [] });
    loadSessionDetail("s");
    loadSessionDetail("s");
    await Promise.resolve();
    await Promise.resolve();
    vi.advanceTimersByTime(5_000);
    loadSessionDetail("s");
    expect(getSession).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(6_000);
    loadSessionDetail("s");
    expect(getSession).toHaveBeenCalledTimes(2);
  });

  it("tries a failed request again after 10 s", async () => {
    vi.useFakeTimers();
    getSession.mockRejectedValueOnce(new Error("network")).mockResolvedValue({ last_heard_at: "a", agents: [] });
    loadSessionDetail("flaky");
    await Promise.resolve();
    await Promise.resolve();
    loadSessionDetail("flaky");
    expect(getSession).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(10_001);
    loadSessionDetail("flaky");
    expect(getSession).toHaveBeenCalledTimes(2);
  });
});
