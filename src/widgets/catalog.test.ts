import { describe, expect, it } from "vitest";

import { mockProjects, mockProject } from "@/mock/projects";

import { getWidget } from "./catalog";

describe("ProjectWidget props", () => {
  const schema = getWidget("ProjectWidget")!.props;
  const project = mockProject(mockProjects()[0].slug)!;

  it("parse a project whose cards carry PR snapshots", () => {
    expect(project.workstreams.some((w) => w.cards?.some((c) => c.pr))).toBe(true);
    expect(schema.safeParse(project).success).toBe(true);
  });

  it("parse a newer payload whose PR state words this console does not know", () => {
    const newer = {
      ...project,
      workstreams: project.workstreams.map((w) => ({
        ...w,
        cards: w.cards?.map((card) =>
          card.pr
            ? {
                ...card,
                pr: {
                  ...card.pr,
                  state: "merge_queued",
                  checks: card.pr.checks && { ...card.pr.checks, state: "action_required" },
                  review: card.pr.review && { ...card.pr.review, verdict: "needs_discussion" },
                },
              }
            : card
        ),
      })),
    };
    expect(newer.workstreams.some((w) => w.cards?.some((c) => c.pr?.review?.verdict === "needs_discussion"))).toBe(true);
    expect(schema.safeParse(newer).success).toBe(true);
  });

  it("still parse an older MCP payload whose cards have no pr field", () => {
    const older = {
      ...project,
      workstreams: project.workstreams.map((w) => ({
        ...w,
        cards: w.cards?.map(({ pr: _pr, ...card }) => card),
      })),
    };
    expect(schema.safeParse(older).success).toBe(true);
  });
});
