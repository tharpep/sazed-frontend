import { WidgetFixture } from "../cardFixture";
import { needsYouOversized } from "@/mock/cardSamples";

export default function Mock() {
  return <WidgetFixture name="NeedsYouWidget" props={{ ...needsYouOversized, question_total: 3, merge_total: 52, merge_reviewed: 9, working_total: 12 }} />;
}
