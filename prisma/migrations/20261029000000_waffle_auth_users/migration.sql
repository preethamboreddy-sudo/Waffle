CREATE TABLE IF NOT EXISTS "waffle_auth_users" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" VARCHAR(15) NOT NULL,
  "email" TEXT,
  "password_hash" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'CUSTOMER',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "waffle_auth_users_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "waffle_auth_users_role_check" CHECK ("role" IN ('CUSTOMER', 'ADMIN', 'OPERATOR'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "waffle_auth_users_phone_key" ON "waffle_auth_users"("phone");
CREATE UNIQUE INDEX IF NOT EXISTS "waffle_auth_users_email_unique"
  ON "waffle_auth_users"(LOWER("email"))
  WHERE "email" IS NOT NULL AND "email" <> '';
