import betterTailwindcss from "eslint-plugin-better-tailwindcss";
import { defineConfig, globalIgnores } from "eslint/config";
import { parser } from "typescript-eslint";

const VARIANTS = "^([a-zA-Z0-9:/_\\[\\]&>.=-]*:)?";

const RAW_CONTROLS = {
  button: "Button from @/components/ui/button",
  input: "Input from @/components/ui/input (Checkbox or Switch for a toggle)",
  select: "Select from @/components/ui/select",
  textarea: "Textarea from @/components/ui/textarea",
  table: "Table from @/components/ui/table",
};

export default defineConfig([
  globalIgnores(["dist/", "src-tauri/", "public/"]),
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: { parser },
    plugins: { "better-tailwindcss": betterTailwindcss },
    settings: { "better-tailwindcss": { entryPoint: "src/styles/globals.css" } },
    rules: {
      "better-tailwindcss/no-restricted-classes": [
        "error",
        {
          restrict: [
            {
              pattern: `${VARIANTS}text-(xs|sm|base|lg|xl|[2-9]xl)$`,
              message: "Off the type scale. Use text-caption, text-meta, text-body, text-title or text-heading.",
            },
            {
              pattern: `${VARIANTS}bg-muted(\\/[0-9]{1,3})?$`,
              message: "Here `muted` is a text colour. Use bg-raised.",
            },
            {
              pattern: `${VARIANTS}bg-accent(\\/[0-9]{1,3})?$`,
              message: "Here `accent` is the warn colour. Use bg-raised.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/**/*.tsx"],
    ignores: ["src/components/ui/**", "src/components/system/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        ...Object.entries(RAW_CONTROLS).map(([element, use]) => ({
          selector: `JSXOpeningElement[name.name='${element}']`,
          message: `Raw <${element}>. Use ${use}.`,
        })),
      ],
    },
  },
]);
