import { WidgetFixture } from "../cardFixture";
import { dispatchEmpty } from "@/mock/dispatchSamples";

export default function Mock() {
  return <WidgetFixture name="DispatchRunWidget" props={dispatchEmpty} />;
}
