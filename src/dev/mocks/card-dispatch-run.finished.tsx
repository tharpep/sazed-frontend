import { WidgetFixture } from "../cardFixture";
import { dispatchFinished } from "@/mock/dispatchSamples";

export default function Mock() {
  return <WidgetFixture name="DispatchRunWidget" props={dispatchFinished} />;
}
