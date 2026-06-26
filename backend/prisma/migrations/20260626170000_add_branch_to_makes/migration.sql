-- Scope makes catalog per app site (JHB / CT)

ALTER TABLE "makes" ADD COLUMN "branch" "Branch" NOT NULL DEFAULT 'JHB';

DROP INDEX IF EXISTS "makes_name_key";

CREATE UNIQUE INDEX "makes_name_branch_key" ON "makes"("name", "branch");
CREATE INDEX "makes_branch_idx" ON "makes"("branch");

-- Clone catalog for CT where CT machines or CT parts reference JHB-scoped models
CREATE TEMP TABLE make_id_map (
  old_make_id TEXT NOT NULL,
  new_make_id TEXT NOT NULL,
  PRIMARY KEY (old_make_id)
);

CREATE TEMP TABLE model_id_map (
  old_model_id TEXT NOT NULL,
  new_model_id TEXT NOT NULL,
  PRIMARY KEY (old_model_id)
);

INSERT INTO "makes" ("id", "name", "branch")
SELECT gen_random_uuid(), jhb.name, 'CT'::"Branch"
FROM "makes" jhb
WHERE jhb.branch = 'JHB'
AND (
  EXISTS (
    SELECT 1
    FROM "models" mod
    JOIN "machines" mach ON mach.model_id = mod.id
    WHERE mod.make_id = jhb.id AND mach.branch = 'CT'
  )
  OR EXISTS (
    SELECT 1
    FROM "models" mod
    JOIN "model_parts" mp ON mp.model_id = mod.id
    WHERE mod.make_id = jhb.id AND mp.branch = 'CT'
  )
)
AND NOT EXISTS (
  SELECT 1 FROM "makes" ct WHERE ct.name = jhb.name AND ct.branch = 'CT'
);

INSERT INTO make_id_map (old_make_id, new_make_id)
SELECT jhb.id, ct.id
FROM "makes" jhb
JOIN "makes" ct ON ct.name = jhb.name AND ct.branch = 'CT'
WHERE jhb.branch = 'JHB';

INSERT INTO "models" ("id", "make_id", "name", "paper_size", "model_type", "machine_life")
SELECT gen_random_uuid(), mim.new_make_id, mod.name, mod.paper_size, mod.model_type, mod.machine_life
FROM "models" mod
JOIN make_id_map mim ON mim.old_make_id = mod.make_id
WHERE NOT EXISTS (
  SELECT 1
  FROM "models" existing
  WHERE existing.make_id = mim.new_make_id AND existing.name = mod.name
);

INSERT INTO model_id_map (old_model_id, new_model_id)
SELECT jhb_mod.id, ct_mod.id
FROM "models" jhb_mod
JOIN make_id_map mim ON mim.old_make_id = jhb_mod.make_id
JOIN "models" ct_mod ON ct_mod.make_id = mim.new_make_id AND ct_mod.name = jhb_mod.name;

UPDATE "machines" m
SET "model_id" = map.new_model_id
FROM model_id_map map
WHERE m.branch = 'CT' AND m.model_id = map.old_model_id;

UPDATE "model_parts" mp
SET "model_id" = map.new_model_id
FROM model_id_map map
WHERE mp.branch = 'CT' AND mp.model_id = map.old_model_id;

DROP TABLE model_id_map;
DROP TABLE make_id_map;
