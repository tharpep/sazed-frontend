import { WidgetFixture } from "../cardFixture";
import { prClosed } from "@/mock/cardSamples";

export default function Mock() {
  return <WidgetFixture name="PullRequestWidget" props={prClosed} />;
}
