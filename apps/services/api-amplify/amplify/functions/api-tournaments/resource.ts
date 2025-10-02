import { defineFunction } from "@aws-amplify/backend";

export const apiTournamentsFunction = defineFunction({
  name: "api-tournaments",
  entry: "./handler.ts",
});
