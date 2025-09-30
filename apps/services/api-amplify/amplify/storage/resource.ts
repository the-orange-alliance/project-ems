import { defineStorage } from "@aws-amplify/backend";

export const storage = defineStorage({
  name: "ems-online-storage",
  access: (allow) => ({
    "data/*": [
      allow.guest.to(["read"]),
      allow.authenticated.to(["read", "write"]),
    ],
  }),
});
