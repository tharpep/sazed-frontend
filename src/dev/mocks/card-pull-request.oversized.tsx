import { WidgetFixture } from "../cardFixture";
import { prOversized } from "@/mock/cardSamples";

export default function Mock() {
  return <WidgetFixture name="PullRequestWidget" props={prOversized} />;
}
