import { WidgetFixture } from "../cardFixture";
import { needsYouOversized } from "@/mock/cardSamples";

export default function Mock() {
  return <WidgetFixture name="NeedsYouWidget" props={needsYouOversized} />;
}
