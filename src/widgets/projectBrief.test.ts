import { describe, expect, it } from "vitest";
import * as z from "zod";

import type { Project } from "@/api/projects";

import { getWidget } from "./catalog";
import { shortReason } from "./WidgetRenderer";

type Status = "done" | "dropped" | "needs_me" | "in_flight" | "blocked" | "next" | "planned";

function step(i: number, status: Status, position: number, [done, inFlight, next]: [number, number, number]) {
  return {
    id: `s${i}`,
    title: `Step ${i}`,
    position,
    status,
    progress: { done, in_flight: inFlight, needs_me: 0, next, total: done + inFlight + next },
  };
}

function brief(slug: string, steps: ReturnType<typeof step>[]) {
  return { slug, title: slug, state: "active", rank: 1, headline: "A line", latest_update: null, steps };
}

// Step progress copied from two real full payloads, next to the bars and counts Sazed computed for them.
const WITH_DROPPED = brief("with-dropped", [
  step(1, "done", 1, [2, 0, 0]),
  step(2, "done", 2, [1, 0, 0]),
  step(3, "next", 3, [1, 0, 11]),
  step(4, "planned", 4, [0, 0, 7]),
  step(5, "planned", 4, [0, 0, 9]),
  step(6, "planned", 5, [1, 0, 1]),
  step(7, "planned", 6, [0, 0, 10]),
  step(8, "dropped", 7, [0, 0, 0]),
]);
const IN_FLIGHT = brief("in-flight", [
  ...[1, 2, 3, 4, 5, 6, 8].map((i) => step(i, "done", i, [0, 0, 0])),
  step(7, "done", 7, [2, 0, 0]),
  step(9, "done", 9, [2, 0, 0]),
  step(10, "in_flight", 10, [7, 1, 21]),
  step(11, "next", 10, [0, 0, 3]),
  step(12, "planned", 11, [0, 0, 0]),
  step(13, "planned", 12, [0, 0, 1]),
  step(14, "planned", 13, [0, 0, 3]),
]);

describe("ProjectsWidget on the gateway's summary payload", () => {
  const schema = getWidget("ProjectsWidget")!.props;

  it("rebuilds Sazed's bars, step counts and current step", () => {
    const {
      projects: [a, b],
    } = schema.parse({ projects: [WITH_DROPPED, IN_FLIGHT] }) as { projects: Project[] };
    expect(a.bar.done).toBeCloseTo(0.369, 3);
    expect(a.bar.next).toBeCloseTo(0.631, 3);
    expect([a.steps_done, a.steps_total, a.current?.id]).toEqual([2, 7, "s3"]);
    expect(a.progress).toEqual({ done: 5, in_flight: 0, needs_me: 0, next: 38, total: 43 });
    expect(b.bar.done).toBeCloseTo(0.6601, 3);
    expect(b.bar.in_flight).toBeCloseTo(0.0025, 3);
    expect(b.bar.next).toBeCloseTo(0.266, 3);
    expect([b.steps_done, b.steps_total, b.current?.id]).toEqual([9, 14, "s10"]);
  });
});

describe("ProjectWidget on the gateway's summary payload", () => {
  it("parses a brief whose steps carry brief cards", () => {
    const withCards = {
      ...WITH_DROPPED,
      steps: WITH_DROPPED.steps.map((s) => ({ ...s, cards: [{ id: `item:${s.id}`, title: "A card", stage: "next", rank: null }] })),
    };
    const parsed = getWidget("ProjectWidget")!.props.safeParse(withCards);
    expect(parsed.success).toBe(true);
  });
});

describe("shortReason", () => {
  it("names the first failing field of the closest union branch and counts the failures", () => {
    const parsed = getWidget("ProjectWidget")!.props.safeParse({ ...WITH_DROPPED, steps: "none" });
    expect(parsed.success).toBe(false);
    expect(shortReason(parsed.error as z.ZodError)).toBe("steps: Invalid input: expected array, received string (1 field invalid)");
  });

  it("counts every failing field", () => {
    const parsed = getWidget("ContainerWidget")!.props.safeParse({ vmid: "x" });
    expect(shortReason(parsed.error as z.ZodError)).toMatch(/^vmid: .* \(3 fields invalid\)$/);
  });
});
