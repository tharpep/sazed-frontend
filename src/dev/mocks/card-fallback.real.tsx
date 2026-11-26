import { CardFixture } from "../cardFixture";
import { FallbackCard } from "@/widgets/FallbackCard";

export default function Mock() {
  return (
    <CardFixture>
      <FallbackCard name="StorageWidget" reason="Proxmox API timed out after 10 s" />
    </CardFixture>
  );
}
