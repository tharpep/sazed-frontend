import { WidgetFixture } from "../cardFixture";
import { prNoChecks } from "@/mock/cardSamples";

export default function Mock() {
  return <WidgetFixture name="PullRequestWidget" props={prNoChecks} />;
}
