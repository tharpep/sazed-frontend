import betterTailwindcss from "eslint-plugin-better-tailwindcss";
import { getDefaultSelectors } from "eslint-plugin-better-tailwindcss/defaults";
import { MatcherType, SelectorKind } from "eslint-plugin-better-tailwindcss/types";
import { defineConfig, globalIgnores } from "eslint/config";
import { parser } from "typescript-eslint";

import gate from "./frontend-gate.json" with { type: "json" };

const CLASS_CONSTANTS = {
  kind: SelectorKind.Variable,
  name: "^.*(CLASS|Class)(ES|es)?$",
  match: [{ type: MatcherType.String }],
};

export default defineConfig([
  globalIgnores(["dist/", "src-tauri/", "public/"]),
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: { parser },
    plugins: { "better-tailwindcss": betterTailwindcss },
    settings: {
      "better-tailwindcss": {
        entryPoint: "src/styles/globals.css",
        selectors: [...getDefaultSelectors(), CLASS_CONSTANTS],
      },
    },
    rules: {
      "better-tailwindcss/no-restricted-classes": ["error", { restrict: gate.classes }],
    },
  },
  {
    files: ["src/**/*.tsx"],
    ignores: gate.rawElements.exempt,
    rules: {
      "no-restricted-syntax": [
        "error",
        ...Object.entries(gate.rawElements.use).flatMap(([element, use]) => [
          {
            selector: `JSXOpeningElement[name.name='${element}']`,
            message: `Raw <${element}>. Use ${use}.`,
          },
          {
            selector: `JSXOpeningElement[name.type='JSXMemberExpression'][name.property.name='${element}']`,
            message: `Raw <${element}> through a wrapper such as motion. Use ${use}.`,
          },
        ]),
      ],
    },
  },
]);
