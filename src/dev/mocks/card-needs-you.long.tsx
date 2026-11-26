import { WidgetFixture } from "../cardFixture";
import { needsYouLong } from "@/mock/cardSamples";

export default function Mock() {
  return <WidgetFixture name="NeedsYouWidget" props={needsYouLong} />;
}
