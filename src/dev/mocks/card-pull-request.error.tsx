import { ErrorFixture } from "../cardFixture";

export default function Mock() {
  return (
    <ErrorFixture
      name="PullRequestWidget"
      isErrorText={"No board card item:missing\nSazed answered 404"}
      badProps={{ id: "item:x", title: "A card", stage: "shipped", pr: { number: "214" } }}
    />
  );
}
