import { WidgetFixture } from "../cardFixture";
import { prMerged } from "@/mock/cardSamples";

export default function Mock() {
  return <WidgetFixture name="PullRequestWidget" props={prMerged} />;
}
