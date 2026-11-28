import { WidgetFixture } from "../cardFixture";
import { dispatchAsking } from "@/mock/dispatchSamples";

export default function Mock() {
  return <WidgetFixture name="DispatchRunWidget" props={dispatchAsking} />;
}
