import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { cardSchemas } from "./cardSchemas";

const FILE = path.resolve(__dirname, "card-schemas.json");

describe("card-schemas.json", () => {
  it("matches the catalog (regenerate with UPDATE_CARD_SCHEMAS=1 pnpm test, then copy it to api-gateway/tests/card_schemas.json)", () => {
    const current = `${JSON.stringify(cardSchemas(), null, 2)}\n`;
    if (process.env.UPDATE_CARD_SCHEMAS) writeFileSync(FILE, current);
    expect(readFileSync(FILE, "utf8").replace(/\r\n/g, "\n")).toBe(current);
  });
});
