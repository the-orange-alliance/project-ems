import { defineFunction } from "@aws-amplify/backend";

export const apiScheduleFunction = defineFunction({
  name: "api-schedule",
  entry: "./handler.ts",
});
