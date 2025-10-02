import { defineFunction } from "@aws-amplify/backend";

export const apiTeamsFunction = defineFunction({
  name: "api-teams",
  entry: "./handler.ts",
});
