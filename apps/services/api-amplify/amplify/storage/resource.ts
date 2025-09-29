import { defineStorage } from "@aws-amplify/backend";

export const storage = defineStorage({
  name: "ems-storage",
  access: (allow) => ({
    "data/*": [allow.guest.to(["read"])],
  }),
});
