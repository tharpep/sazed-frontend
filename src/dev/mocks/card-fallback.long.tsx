import { CardFixture } from "../cardFixture";
import { FallbackCard } from "@/widgets/FallbackCard";

export default function Mock() {
  return (
    <CardFixture>
      <FallbackCard name={"N".repeat(300)} reason={"a reason with no spaces at all ".repeat(40)} />
    </CardFixture>
  );
}
