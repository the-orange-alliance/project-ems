import { defineFunction } from "@aws-amplify/backend";

export const apiEventsFunction = defineFunction({
  name: "api-events",
  entry: "./handler.ts",
});
