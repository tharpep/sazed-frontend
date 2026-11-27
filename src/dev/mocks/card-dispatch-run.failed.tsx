import { WidgetFixture } from "../cardFixture";
import { dispatchFailed } from "@/mock/dispatchSamples";

export default function Mock() {
  return <WidgetFixture name="DispatchRunWidget" props={dispatchFailed} />;
}
