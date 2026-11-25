import type { ComponentType } from "react";

const modules = import.meta.glob<{ default: ComponentType }>("./mocks/*.tsx");

export interface MockVariant {
  variant: string;
  load: () => Promise<{ default: ComponentType }>;
}

export function parseMockPath(path: string): { name: string; variant: string } {
  const [name, variant = "main"] = path.replace("./mocks/", "").replace(/\.tsx$/, "").split(".");
  return { name, variant };
}

export const mocks: Record<string, MockVariant[]> = {};
for (const [path, load] of Object.entries(modules)) {
  const { name, variant } = parseMockPath(path);
  (mocks[name] ??= []).push({ variant, load });
}
