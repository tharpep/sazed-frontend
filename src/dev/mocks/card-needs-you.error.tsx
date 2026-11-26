import { ErrorFixture } from "../cardFixture";

export default function Mock() {
  return (
    <ErrorFixture
      name="NeedsYouWidget"
      isErrorText={"Sazed /board/command failed: 502 Bad Gateway\n{\"detail\": \"upstream\"}"}
      badProps={{ needs: [{ id: 7, title: null }], done: {} }}
    />
  );
}
