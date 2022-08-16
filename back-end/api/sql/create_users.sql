CREATE TABLE IF NOT EXISTS "users" (
  "user_id"            INTEGER PRIMARY KEY AUTOINCREMENT,
  "username"           VARCHAR(255) NOT NULL,
  "password"           VARCHAR(255) NOT NULL,
  "permissions"        VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS "user_tokens" (
  "token"              VARCHAR(255) PRIMARY KEY NOT NULL,
  "expires"            DATE NOT NULL,
  "user_id"            INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES "users"(user_id)
);
