import { WidgetFixture } from "../cardFixture";
import { needsYouReal } from "@/mock/cardSamples";

export default function Mock() {
  return <WidgetFixture name="NeedsYouWidget" props={needsYouReal} />;
}
