import { WidgetFixture } from "../cardFixture";
import { prNoRuns } from "@/mock/cardSamples";

export default function Mock() {
  return <WidgetFixture name="PullRequestWidget" props={prNoRuns} />;
}
