import { describe, expect, it } from "vitest";

import { loadViews, type ItemRef, type Place } from "@/store/navStore";
import { parseEntry, placeToApply, samePlace, stepFor } from "./history";

const views = loadViews(null);

function place(hub: Place["hub"], over: Partial<Place> = {}): Place {
  return { hub, view: views, open: {}, read: {}, ...over };
}

const project: ItemRef = { kind: "project", id: "board" };
const plan: ItemRef = { kind: "plan", id: "board-plan" };
const projects = place("work", { open: { "work:projects": project } });
const planOpen = place("work", {
  view: { ...views, work: "plans" },
  open: { "work:projects": project },
  read: { "work:plans": plan },
});

describe("stepFor: how a store change shows in browser history", () => {
  it("does nothing when the place is the same", () => {
    expect(stepFor(projects, place("work", { open: { "work:projects": { ...project } } }), null)).toBeNull();
  });

  it("pushes for a hub, a view, or an item opened", () => {
    expect(stepFor(place("home"), place("work"), null)).toBe("push");
    expect(stepFor(place("work"), place("work", { view: { ...views, work: "board" } }), null)).toBe("push");
    expect(stepFor(place("work"), projects, null)).toBe("push");
    expect(stepFor(projects, planOpen, null)).toBe("push");
  });

  it("pushes for another item in the same slot", () => {
    expect(stepFor(projects, place("work", { open: { "work:projects": { kind: "project", id: "other" } } }), null)).toBe(
      "push"
    );
  });

  it("replaces for a new version of the open plan, the version picker", () => {
    const v2 = { ...planOpen, read: { "work:plans": { ...plan, version: 2 } } };
    expect(stepFor(planOpen, v2, projects)).toBe("replace");
  });

  it("goes back when a close lands on the entry beneath", () => {
    expect(stepFor(projects, place("work"), place("work"))).toBe("back");
  });

  it("pushes a tab back to the view beneath, so Back still steps through both views", () => {
    const board = place("work", { view: { ...views, work: "board" } });
    const plans = place("work", { view: { ...views, work: "plans" } });
    expect(stepFor(plans, board, board)).toBe("push");
    expect(stepFor(place("work"), place("home"), place("home"))).toBe("push");
  });

  it("goes back when Chat's own Back control returns to the list beneath", () => {
    const session = { "chat:conversation": { kind: "session" as const, id: "s1" } };
    const list = place("chat", { open: session });
    const conversation = place("chat", { view: { ...views, chat: "conversation" }, open: session });
    expect(stepFor(conversation, list, list, "back")).toBe("back");
    expect(stepFor(conversation, list, place("chat"), "back")).toBe("back");
    expect(stepFor(conversation, list, list)).toBe("push");
  });

  it("pushes an in-app Back that does not land on the screen beneath", () => {
    const conversation = place("chat", { view: { ...views, chat: "conversation" } });
    expect(stepFor(conversation, place("chat"), place("home"), "back")).toBe("push");
  });

  it("replaces a close with no entry beneath, as after a deep link or reload", () => {
    expect(stepFor(projects, place("work"), null)).toBe("replace");
  });

  it("replaces a close that does not land on the entry beneath: a plan closed in Plans stays in Plans", () => {
    const plansList = { ...planOpen, read: {} };
    expect(stepFor(planOpen, plansList, projects)).toBe("replace");
  });

  it("replaces when the write follows other state instead of navigating", () => {
    const chat = place("chat", { open: { "chat:conversation": { kind: "session", id: "s1" } } });
    expect(stepFor(place("chat"), chat, null, "follow")).toBe("replace");
    expect(stepFor(projects, place("work"), place("work"), "follow")).toBe("replace");
  });
});

describe("placeToApply: what Back restores", () => {
  const s0 = { kind: "session" as const, id: "s0" };
  const s1 = { kind: "session" as const, id: "s1" };
  const streaming = place("chat", { view: { ...views, chat: "conversation" }, open: { "chat:conversation": s1 } });

  it("keeps the live conversation on an entry whose screen is not that conversation", () => {
    const list = place("chat", { open: { "chat:conversation": s0 } });
    expect(placeToApply(list, streaming).open).toEqual({ "chat:conversation": s1 });
    const board = place("work", { open: { "chat:conversation": s0, "work:projects": project } });
    expect(placeToApply(board, streaming).open).toEqual({ "chat:conversation": s1, "work:projects": project });
  });

  it("leaves no conversation when none is live", () => {
    const list = place("chat", { open: { "chat:conversation": s0 } });
    expect(placeToApply(list, place("home")).open).toEqual({});
  });

  it("restores the conversation an entry shows", () => {
    const conversation = place("chat", { view: { ...views, chat: "conversation" }, open: { "chat:conversation": s0 } });
    expect(placeToApply(conversation, streaming)).toBe(conversation);
  });
});

describe("parseEntry: reading the console's entry back from history.state", () => {
  it("reads an entry stored beside react-router's own keys", () => {
    const entry = { place: planOpen, below: projects };
    const parsed = parseEntry({ idx: 2, key: "abc", sazed: JSON.parse(JSON.stringify(entry)) });
    expect(parsed && samePlace(parsed.place, planOpen) && parsed.below && samePlace(parsed.below, projects)).toBe(true);
  });

  it("is null for a state that is not the console's", () => {
    expect(parseEntry(null)).toBeNull();
    expect(parseEntry({ idx: 0 })).toBeNull();
    expect(parseEntry({ sazed: { place: { hub: "nowhere" } } })).toBeNull();
  });

  it("drops items that no longer validate and fills missing views", () => {
    const parsed = parseEntry({ sazed: { place: { hub: "agents", open: { agents: project } }, below: "x" } });
    expect(parsed).toEqual({ place: { hub: "agents", view: views, open: {}, read: {} }, below: null });
  });
});
