CREATE TABLE IF NOT EXISTS "users" (
  "user_id"            INTEGER PRIMARY KEY AUTOINCREMENT,
  "username"           VARCHAR(255) NOT NULL,
  "password"           VARCHAR(255) NOT NULL,
  "permissions"        VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS "user_tokens" (
  "token"              VARCHAR(255) PRIMARY KEY NOT NULL,
  "expires"            DATE NOT NULL,
  "userId"            INTEGER NOT NULL,
  FOREIGN KEY (userId) REFERENCES "users"(userId)
);
