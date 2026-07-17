-- Stage 6a: multi-branch access join table (schema + backfill only).
-- User.branch is unchanged; application code is unchanged in this stage.

-- CreateTable
CREATE TABLE "user_branch_access" (
    "user_id" TEXT NOT NULL,
    "branch" "Branch" NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "granted_by" TEXT,

    CONSTRAINT "user_branch_access_pkey" PRIMARY KEY ("user_id", "branch")
);

-- AddForeignKey
ALTER TABLE "user_branch_access" ADD CONSTRAINT "user_branch_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_branch_access" ADD CONSTRAINT "user_branch_access_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: every existing user gets exactly one row from their current home branch.
INSERT INTO "user_branch_access" ("user_id", "branch", "granted_at", "granted_by")
SELECT "id", "branch", CURRENT_TIMESTAMP, NULL
FROM "users";

-- Verify backfill completeness (one access row per user).
DO $$
DECLARE
  user_count INTEGER;
  access_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM "users";
  SELECT COUNT(*) INTO access_count FROM "user_branch_access";
  IF access_count <> user_count THEN
    RAISE EXCEPTION 'Backfill mismatch: % users but % user_branch_access rows', user_count, access_count;
  END IF;
END $$;
