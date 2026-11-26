import { CardFixture } from "../cardFixture";
import { FallbackCard } from "@/widgets/FallbackCard";

export default function Mock() {
  return (
    <CardFixture>
      <FallbackCard name="NeedsYouWidget" reason="the tool returned no data" />
    </CardFixture>
  );
}
