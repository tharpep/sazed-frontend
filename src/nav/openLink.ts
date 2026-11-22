import { getAutomation } from "@/api/automations";
import { getBacklogItem } from "@/api/backlog";
import { getDispatchPlan } from "@/api/dispatch";
import { fetchService } from "@/api/homelab";
import { getJob } from "@/api/jobs";
import { useNavStore } from "@/store/navStore";
import type { OpenKind } from "./deepLinks";

const EXISTS: Record<OpenKind, (id: string) => Promise<unknown>> = {
  backlog: getBacklogItem,
  job: (id) => getJob(id, false),
  automation: (id) => getAutomation(encodeURIComponent(id)),
  dispatch: getDispatchPlan,
  service: fetchService,
};

/** Opens a phone notice's item once its GET confirms it exists, the same way a tap opens it. The
 * console has already landed on Home, so Back returns there; an unknown id stays on Home. */
export async function followOpenLink(link: { kind: OpenKind; id: string }): Promise<boolean> {
  try {
    await EXISTS[link.kind](link.id);
  } catch {
    return false;
  }
  useNavStore.getState().openItem(link);
  return true;
}
