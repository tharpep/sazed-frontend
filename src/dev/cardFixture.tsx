import type { CSSProperties, ReactNode } from "react";
import { useSearchParams } from "react-router-dom";

import { FallbackCard } from "@/widgets/FallbackCard";
import { WidgetRenderer } from "@/widgets/WidgetRenderer";

type Theme = "dark" | "light";

// Claude's host variables as mockups/cards.html copies them (plans/mods-widgets-2026-11-20).
const HOST: Record<Theme, Record<string, string>> = {
  dark: {
    "--col": "#262624",
    "--color-background-primary": "#30302E",
    "--color-background-secondary": "#262624",
    "--color-text-primary": "#FAF9F5",
    "--color-text-secondary": "#C2C0B6",
    "--color-text-tertiary": "#9C9A92",
    "--color-border-tertiary": "rgba(222,220,209,.15)",
    "--color-border-secondary": "rgba(222,220,209,.30)",
    "--color-text-success": "#7AB948",
    "--color-border-success": "#599130",
    "--color-background-success": "#1B4614",
    "--color-text-warning": "#D1A041",
    "--color-border-warning": "#A87829",
    "--color-background-warning": "#483A0F",
    "--color-text-danger": "#EE8884",
    "--color-border-danger": "#CD5C58",
    "--color-background-danger": "#602A28",
    "--color-text-info": "#80AADD",
    "--color-border-info": "#4682D5",
    "--color-background-info": "#253E5F",
    "--card-track-mix": "13%",
    colorScheme: "dark",
  },
  light: {
    "--col": "#FAF9F5",
    "--color-background-primary": "#FFFFFF",
    "--color-background-secondary": "#F5F4ED",
    "--color-text-primary": "#141413",
    "--color-text-secondary": "#3D3D3A",
    "--color-text-tertiary": "#73726C",
    "--color-border-tertiary": "rgba(31,30,29,.15)",
    "--color-border-secondary": "rgba(31,30,29,.30)",
    "--color-text-success": "#265B19",
    "--color-border-success": "#437426",
    "--color-background-success": "#E9F1DC",
    "--color-text-warning": "#5A4815",
    "--color-border-warning": "#805C1F",
    "--color-background-warning": "#F6EEDF",
    "--color-text-danger": "#7F2C28",
    "--color-border-danger": "#A73D39",
    "--color-background-danger": "#F7ECEC",
    "--color-text-info": "#3266AD",
    "--color-border-info": "#4682D5",
    "--color-background-info": "#D6E4F6",
    "--card-track-mix": "9%",
    colorScheme: "light",
  },
};

const FONTS = {
  "--font-sans": '"Anthropic Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  "--font-mono": 'ui-monospace, Consolas, "Cascadia Mono", monospace',
};

const WIDTHS = [320, 400, 700];

function Column({ theme, width, children }: { theme: Theme; width: number; children: ReactNode }) {
  return (
    <div
      className={theme === "dark" ? "dark" : undefined}
      style={{ ...HOST[theme], ...FONTS, background: "var(--col)", padding: 16, width: width + 32 } as CSSProperties}
    >
      <div data-card-col={`${theme}-${width}`} className="flex flex-col gap-3" style={{ width }}>
        {children}
      </div>
    </div>
  );
}

/** A card in 320, 400 and 700 px columns under Claude's host variables; ?w= and ?theme= pick one. */
export function CardFixture({ children }: { children: ReactNode }) {
  const [search] = useSearchParams();
  const w = Number(search.get("w"));
  const t = search.get("theme");
  const themes: Theme[] = t === "dark" || t === "light" ? [t] : ["dark", "light"];
  const widths = WIDTHS.includes(w) ? [w] : WIDTHS;
  return (
    <div className="flex flex-wrap items-start gap-4 p-4">
      {themes.flatMap((theme) =>
        widths.map((width) => (
          <Column key={`${theme}-${width}`} theme={theme} width={width}>
            {children}
          </Column>
        ))
      )}
    </div>
  );
}

/** One widget from the catalog, validated as a tool result would be. */
export function WidgetFixture({ name, props }: { name: string; props: object }) {
  return (
    <CardFixture>
      <WidgetRenderer name={name} props={props as Record<string, unknown>} />
    </CardFixture>
  );
}

/** The two ways a card fails: an isError result, and props that fail Zod. */
export function ErrorFixture({ name, isErrorText, badProps }: { name: string; isErrorText: string; badProps: object }) {
  return (
    <CardFixture>
      <FallbackCard name={name} reason={isErrorText.split("\n")[0]} />
      <WidgetRenderer name={name} props={badProps as Record<string, unknown>} />
    </CardFixture>
  );
}
