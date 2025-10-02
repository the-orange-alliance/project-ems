import { defineFunction } from "@aws-amplify/backend";

export const apiScheduleParamsFunction = defineFunction({
  name: "api-schedule-params",
  entry: "./handler.ts",
});
