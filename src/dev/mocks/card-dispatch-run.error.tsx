import { ErrorFixture } from "../cardFixture";

export default function Mock() {
  return (
    <ErrorFixture
      name="DispatchRunWidget"
      isErrorText={"Sazed /dispatch/plans/nope failed: 404 Not Found\n{\"detail\": \"no such plan\"}"}
      badProps={{ plan: "p", repo: 7, tasks: [{ id: "t1" }] }}
    />
  );
}
