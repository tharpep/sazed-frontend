import { CardFixture } from "../cardFixture";
import { WidgetRenderer } from "@/widgets/WidgetRenderer";

export default function Mock() {
  return (
    <CardFixture>
      <WidgetRenderer name="RetiredWidget" props={{}} />
      <WidgetRenderer name="PullRequestWidget" props={{ title: 5 }} />
    </CardFixture>
  );
}
