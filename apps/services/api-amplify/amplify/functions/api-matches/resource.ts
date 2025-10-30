import { defineFunction } from "@aws-amplify/backend";

export const apiMatchFunction = defineFunction({
  name: "api-matches",
  entry: "./handler.ts",
});
