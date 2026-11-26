import { WidgetFixture } from "../cardFixture";
import { prReviewed } from "@/mock/cardSamples";

export default function Mock() {
  return <WidgetFixture name="PullRequestWidget" props={prReviewed} />;
}
