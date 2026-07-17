-- Stage C: permission dual-enforcement shadow log (observability only).
-- Records mismatches between legacy role checks and effective permissions.
-- Does not change access decisions.

CREATE TABLE "permission_shadow_log" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "permission_key" TEXT NOT NULL,
    "old_allowed" BOOLEAN NOT NULL,
    "new_allowed" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permission_shadow_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "permission_shadow_log_created_at_idx" ON "permission_shadow_log"("created_at");
CREATE INDEX "permission_shadow_log_user_id_idx" ON "permission_shadow_log"("user_id");
CREATE INDEX "permission_shadow_log_permission_key_idx" ON "permission_shadow_log"("permission_key");

ALTER TABLE "permission_shadow_log"
  ADD CONSTRAINT "permission_shadow_log_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
