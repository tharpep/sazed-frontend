import { WidgetFixture } from "../cardFixture";
import { prFailing } from "@/mock/cardSamples";

export default function Mock() {
  return <WidgetFixture name="PullRequestWidget" props={prFailing} />;
}
