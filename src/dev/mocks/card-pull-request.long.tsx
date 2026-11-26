import { WidgetFixture } from "../cardFixture";
import { prLong } from "@/mock/cardSamples";

export default function Mock() {
  return <WidgetFixture name="PullRequestWidget" props={prLong} />;
}
