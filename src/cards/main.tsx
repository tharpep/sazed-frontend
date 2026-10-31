import {
  App,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
  type McpUiHostContext,
} from "@modelcontextprotocol/ext-apps";
import { createRoot } from "react-dom/client";

import { FallbackCard } from "../widgets/FallbackCard";
import { WidgetRenderer } from "../widgets/WidgetRenderer";
import "./card.css";

// One build serves every widget: the gateway fills this in for each ui:// resource.
const widgetName = document.querySelector<HTMLMetaElement>('meta[name="widget"]')?.content ?? "";
const root = createRoot(document.getElementById("root")!);
const app = new App({ name: "Sazed card", version: "1.0.0" });

function applyHost(context: McpUiHostContext | undefined) {
  if (context?.theme) {
    applyDocumentTheme(context.theme);
    document.documentElement.classList.toggle("dark", context.theme === "dark");
  }
  if (context?.styles?.variables) applyHostStyleVariables(context.styles.variables);
  if (context?.styles?.css?.fonts) applyHostFonts(context.styles.css.fonts);
}

app.ontoolresult = ({ structuredContent, content, isError }) => {
  if (structuredContent && !isError) {
    root.render(<WidgetRenderer name={widgetName} props={structuredContent} />);
    return;
  }
  const first = content?.[0];
  const reason = first?.type === "text" ? first.text : "The tool returned no data.";
  root.render(<FallbackCard name={widgetName} reason={reason} data={null} />);
};
app.onhostcontextchanged = applyHost;

// A sandboxed page can't open links itself, so the host does it.
document.addEventListener("click", (event) => {
  const link = (event.target as Element).closest<HTMLAnchorElement>("a[href]");
  if (!link) return;
  event.preventDefault();
  void app.openLink({ url: link.href });
});

await app.connect();
applyHost(app.getHostContext());
