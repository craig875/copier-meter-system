-- Roll back per-site makes catalog to shared global makes (reverse 20260626170000).
-- Keeps machines / model_parts branch scoping unchanged.

-- CT-only make names (no JHB twin) → treat as global JHB row
UPDATE "makes"
SET "branch" = 'JHB'::"Branch"
WHERE "branch" = 'CT'
AND NOT EXISTS (
  SELECT 1 FROM "makes" j WHERE j."name" = "makes"."name" AND j."branch" = 'JHB'
);

-- Point CT copiers at JHB model rows where names match
UPDATE "machines" m
SET "model_id" = jhb_mod."id"
FROM "models" ct_mod
JOIN "makes" ct_make ON ct_mod."make_id" = ct_make."id" AND ct_make."branch" = 'CT'
JOIN "makes" jhb_make ON jhb_make."name" = ct_make."name" AND jhb_make."branch" = 'JHB'
JOIN "models" jhb_mod ON jhb_mod."make_id" = jhb_make."id" AND jhb_mod."name" = ct_mod."name"
WHERE m."model_id" = ct_mod."id";

-- CT-only models (no JHB twin) → attach to JHB make row
UPDATE "models" ct_mod
SET "make_id" = jhb_make."id"
FROM "makes" ct_make
JOIN "makes" jhb_make ON jhb_make."name" = ct_make."name" AND jhb_make."branch" = 'JHB'
WHERE ct_mod."make_id" = ct_make."id"
AND ct_make."branch" = 'CT'
AND NOT EXISTS (
  SELECT 1 FROM "models" j
  WHERE j."make_id" = jhb_make."id" AND j."name" = ct_mod."name"
);

-- Point CT parts at JHB model rows where names match
UPDATE "model_parts" mp
SET "model_id" = jhb_mod."id"
FROM "models" ct_mod
JOIN "makes" ct_make ON ct_mod."make_id" = ct_make."id" AND ct_make."branch" = 'CT'
JOIN "makes" jhb_make ON jhb_make."name" = ct_make."name" AND jhb_make."branch" = 'JHB'
JOIN "models" jhb_mod ON jhb_mod."make_id" = jhb_make."id" AND jhb_mod."name" = ct_mod."name"
WHERE mp."model_id" = ct_mod."id";

-- Merge duplicate parts created by remap (keep lowest id per model/branch/part_name)
UPDATE "part_replacements" pr
SET "model_part_id" = sub."keep_id"
FROM (
  SELECT mp."id" AS dup_id, MIN(mp2."id") AS keep_id
  FROM "model_parts" mp
  JOIN "model_parts" mp2
    ON mp2."model_id" = mp."model_id"
   AND mp2."branch" = mp."branch"
   AND mp2."part_name" = mp."part_name"
  GROUP BY mp."id"
  HAVING mp."id" <> MIN(mp2."id")
) sub
WHERE pr."model_part_id" = sub."dup_id";

DELETE FROM "model_parts" dup
WHERE EXISTS (
  SELECT 1
  FROM "model_parts" keep
  WHERE dup."model_id" = keep."model_id"
    AND dup."branch" = keep."branch"
    AND dup."part_name" = keep."part_name"
    AND dup."id" > keep."id"
);

-- Remove duplicate CT model rows (JHB twin already exists)
DELETE FROM "part_replacements" pr
WHERE EXISTS (
  SELECT 1
  FROM "model_parts" mp
  JOIN "models" ct_mod ON mp."model_id" = ct_mod."id"
  JOIN "makes" ct_make ON ct_mod."make_id" = ct_make."id" AND ct_make."branch" = 'CT'
  JOIN "makes" jhb_make ON jhb_make."name" = ct_make."name" AND jhb_make."branch" = 'JHB'
  JOIN "models" jhb_mod ON jhb_mod."make_id" = jhb_make."id" AND jhb_mod."name" = ct_mod."name"
  WHERE pr."model_part_id" = mp."id"
);

DELETE FROM "model_parts" mp
WHERE EXISTS (
  SELECT 1
  FROM "models" ct_mod
  JOIN "makes" ct_make ON ct_mod."make_id" = ct_make."id" AND ct_make."branch" = 'CT'
  JOIN "makes" jhb_make ON jhb_make."name" = ct_make."name" AND jhb_make."branch" = 'JHB'
  JOIN "models" jhb_mod ON jhb_mod."make_id" = jhb_make."id" AND jhb_mod."name" = ct_mod."name"
  WHERE mp."model_id" = ct_mod."id"
);

DELETE FROM "models" ct_mod
WHERE EXISTS (
  SELECT 1
  FROM "makes" ct_make
  JOIN "makes" jhb_make ON jhb_make."name" = ct_make."name" AND jhb_make."branch" = 'JHB'
  JOIN "models" jhb_mod ON jhb_mod."make_id" = jhb_make."id" AND jhb_mod."name" = ct_mod."name"
  WHERE ct_mod."make_id" = ct_make."id"
    AND ct_make."branch" = 'CT'
);

-- Drop any remaining CT make rows
DELETE FROM "part_replacements" pr
WHERE EXISTS (
  SELECT 1
  FROM "model_parts" mp
  JOIN "models" m ON mp."model_id" = m."id"
  JOIN "makes" ct ON m."make_id" = ct."id" AND ct."branch" = 'CT'
  WHERE pr."model_part_id" = mp."id"
);

DELETE FROM "model_parts" mp
WHERE EXISTS (
  SELECT 1
  FROM "models" m
  JOIN "makes" ct ON m."make_id" = ct."id" AND ct."branch" = 'CT'
  WHERE mp."model_id" = m."id"
);

DELETE FROM "models" m
WHERE EXISTS (
  SELECT 1
  FROM "makes" ct
  WHERE m."make_id" = ct."id"
    AND ct."branch" = 'CT'
);

DELETE FROM "makes" WHERE "branch" = 'CT';

DROP INDEX IF EXISTS "makes_branch_idx";
DROP INDEX IF EXISTS "makes_name_branch_key";
ALTER TABLE "makes" DROP COLUMN "branch";
CREATE UNIQUE INDEX "makes_name_key" ON "makes"("name");
