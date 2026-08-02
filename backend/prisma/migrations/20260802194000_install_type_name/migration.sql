-- Free-text Type on installations (Option B).
-- Keep install_types / type_id for legacy rows; allow creates with type_name only.
ALTER TABLE "installs" ADD COLUMN "type_name" TEXT;

UPDATE "installs" AS i
SET "type_name" = t."name"
FROM "install_types" AS t
WHERE i."type_id" = t."id"
  AND i."type_name" IS NULL;

ALTER TABLE "installs" ALTER COLUMN "type_id" DROP NOT NULL;
