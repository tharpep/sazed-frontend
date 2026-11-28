import * as z from "zod";

import { getWidget } from "../widgets/catalog";

/** The widgets the gateway serves as ui:// cards (api-gateway's app/mcp_server.py). */
export const CARD_WIDGETS = [
  "HomelabWidget",
  "CalendarWidget",
  "StorageWidget",
  "ContainerWidget",
  "JobWidget",
  "JobsWidget",
  "InfoCard",
  "ProjectsWidget",
  "ProjectWidget",
  "NeedsYouWidget",
  "PullRequestWidget",
  "DispatchRunWidget",
] as const;

/** Each card's props as JSON Schema: the bridge api-gateway's contract test validates tool output against. */
export function cardSchemas(): Record<string, unknown> {
  return Object.fromEntries(CARD_WIDGETS.map((name) => [name, z.toJSONSchema(getWidget(name)!.props, { io: "input" })]));
}
