import { WidgetFixture } from "../cardFixture";
import { prReal } from "@/mock/cardSamples";

export default function Mock() {
  return <WidgetFixture name="PullRequestWidget" props={prReal} />;
}
