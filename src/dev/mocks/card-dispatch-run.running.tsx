import { WidgetFixture } from "../cardFixture";
import { dispatchRunning } from "@/mock/dispatchSamples";

export default function Mock() {
  return <WidgetFixture name="DispatchRunWidget" props={dispatchRunning} />;
}
