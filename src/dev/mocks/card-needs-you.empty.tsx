import { WidgetFixture } from "../cardFixture";
import { needsYouEmpty } from "@/mock/cardSamples";

export default function Mock() {
  return <WidgetFixture name="NeedsYouWidget" props={needsYouEmpty} />;
}
