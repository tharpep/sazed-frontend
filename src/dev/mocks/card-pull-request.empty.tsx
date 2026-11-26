import { WidgetFixture } from "../cardFixture";
import { prNone } from "@/mock/cardSamples";

export default function Mock() {
  return <WidgetFixture name="PullRequestWidget" props={prNone} />;
}
