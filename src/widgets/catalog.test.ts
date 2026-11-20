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
