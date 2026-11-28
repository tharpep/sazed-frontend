import { WidgetFixture } from "../cardFixture";
import { dispatchOversized } from "@/mock/dispatchSamples";

export default function Mock() {
  return <WidgetFixture name="DispatchRunWidget" props={dispatchOversized} />;
}
