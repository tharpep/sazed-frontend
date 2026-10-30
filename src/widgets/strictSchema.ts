import * as z from "zod";

// Claude strict tool use rejects these keywords with a 400. Zod still enforces them at render time.
const UNSUPPORTED_LIMITS = [
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "minLength",
  "maxLength",
  "maxItems",
];

/** JSON Schema for a catalog schema, reduced to what Claude strict tool use accepts: limits move
 * into the description so the model still sees them, and `oneOf` becomes `anyOf`. */
export function toStrictJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema, {
    override: ({ jsonSchema }) => {
      const node = jsonSchema as Record<string, unknown>;
      if (node.oneOf) {
        node.anyOf = node.oneOf;
        delete node.oneOf;
      }
      const limits: string[] = [];
      for (const key of UNSUPPORTED_LIMITS) {
        if (!(key in node)) continue;
        const value = node[key] as number;
        // z.int() adds the safe-integer range to every integer, which says nothing to a model.
        if (Math.abs(value) < Number.MAX_SAFE_INTEGER) limits.push(`${key} ${value}`);
        delete node[key];
      }
      // minItems above 1 is rejected too; 0 and 1 are allowed.
      if (typeof node.minItems === "number" && node.minItems > 1) {
        limits.push(`minItems ${node.minItems}`);
        delete node.minItems;
      }
      if (limits.length) {
        node.description = [node.description, `(${limits.join(", ")})`].filter(Boolean).join(" ");
      }
    },
  }) as Record<string, unknown>;
  delete json.$schema;
  return json;
}
