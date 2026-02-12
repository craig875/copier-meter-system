-- CreateTable
CREATE TABLE "makes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "makes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "models" (
    "id" TEXT NOT NULL,
    "make_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "models_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "makes_name_key" ON "makes"("name");

-- CreateIndex
CREATE UNIQUE INDEX "models_make_id_name_key" ON "models"("make_id", "name");

-- CreateIndex
CREATE INDEX "models_make_id_idx" ON "models"("make_id");

-- AddForeignKey
ALTER TABLE "models" ADD CONSTRAINT "models_make_id_fkey" FOREIGN KEY ("make_id") REFERENCES "makes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add model_id to machines (keep model for migration)
ALTER TABLE "machines" ADD COLUMN IF NOT EXISTS "model_id" TEXT;

-- Migrate: create makes from distinct first word of model
INSERT INTO "makes" ("id", "name")
SELECT gen_random_uuid()::text, make_name FROM (
  SELECT DISTINCT trim(split_part(model, ' ', 1)) AS make_name
  FROM machines WHERE model IS NOT NULL AND trim(model) != ''
) t WHERE make_name != ''
ON CONFLICT (name) DO NOTHING;

-- Migrate: create models (make_id, model name = rest after first word)
INSERT INTO "models" ("id", "make_id", "name")
SELECT gen_random_uuid()::text, mk.id, 
  CASE WHEN position(' ' in m.model) > 0 
    THEN trim(substring(m.model from position(' ' in m.model) + 1))
    ELSE m.model
  END
FROM (SELECT DISTINCT model FROM machines WHERE model IS NOT NULL AND trim(model) != '') m
JOIN makes mk ON mk.name = trim(split_part(m.model, ' ', 1));

-- Update machines with model_id (match by make + model name)
UPDATE machines mach
SET model_id = mo.id
FROM models mo
JOIN makes mk ON mo.make_id = mk.id
WHERE mach.model = CASE WHEN mo.name != '' THEN mk.name || ' ' || mo.name ELSE mk.name END;

-- Drop old model column from machines
ALTER TABLE "machines" DROP COLUMN IF EXISTS "model";

-- Add FK from machines to models
ALTER TABLE "machines" ADD CONSTRAINT "machines_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "models"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "machines_model_id_idx" ON "machines"("model_id");

-- Drop old model_parts unique/index, add model_id, migrate, drop model
-- model_parts has model (string) - we need to replace with modelId
ALTER TABLE "model_parts" ADD COLUMN "model_id_new" TEXT;

-- Populate model_id_new from model string by joining models (model_parts.model = "Make ModelName")
UPDATE model_parts mp
SET model_id_new = mo.id
FROM models mo
JOIN makes mk ON mo.make_id = mk.id
WHERE mp.model = mk.name || ' ' || mo.name;

-- Drop old model column and rename
ALTER TABLE "model_parts" DROP COLUMN "model";
ALTER TABLE "model_parts" RENAME COLUMN "model_id_new" TO "model_id";

-- Drop old unique constraint (Prisma creates unique constraint for @@unique)
ALTER TABLE "model_parts" DROP CONSTRAINT IF EXISTS "model_parts_model_part_name_branch_key";
DROP INDEX IF EXISTS "model_parts_model_idx";
ALTER TABLE "model_parts" ALTER COLUMN "model_id" SET NOT NULL;
ALTER TABLE "model_parts" ADD CONSTRAINT "model_parts_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "models"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "model_parts_model_id_part_name_branch_key" ON "model_parts"("model_id", "part_name", "branch");
CREATE INDEX "model_parts_model_id_idx" ON "model_parts"("model_id");
