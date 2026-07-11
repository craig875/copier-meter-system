-- Stage 5: Branch Make / Model / FibreProduct catalogs (JHB vs CT)
--
-- Production-verified dual-use models (keep-branch HARDCODED — not derived from counts):
--     MFC-L5715DW                         → JHB keeps original
--     Bizhub C250i                         → JHB keeps original (tie)
--     D-Colour MF3023/3024                 → JHB keeps original
--     D-Copia 4513/4514 MF Plus            → CT keeps original
--     D-Copia D4023MF/D4024MF/D4024MF+     → JHB keeps original
--   All other models: set branch from usage (machines, else parts, else parent make). No clone.
--
-- Machine/part counts use scalar subqueries (no join fanout).
-- Makes & FibreProducts: majority-keeps-original from live usage.
--
-- NOT applied automatically — review, dry-run on a prod dump, then migrate deploy.
-- Assertions C1–C7 RAISE and roll back the transaction on failure.

BEGIN;

--------------------------------------------------------------------------------
-- 0. Pre-counts for C5
--------------------------------------------------------------------------------

CREATE TEMP TABLE _stage5_precounts AS
SELECT
  (SELECT COUNT(*) FROM "machines") AS machines,
  (SELECT COUNT(*) FROM "fibre_orders") AS fibre_orders,
  (SELECT COUNT(*) FROM "model_parts") AS model_parts,
  (SELECT COUNT(*) FROM "part_replacements") AS part_replacements;

--------------------------------------------------------------------------------
-- 1. Schema: nullable branch + drop global make name uniqueness
--------------------------------------------------------------------------------

ALTER TABLE "makes" ADD COLUMN IF NOT EXISTS "branch" "Branch";
ALTER TABLE "models" ADD COLUMN IF NOT EXISTS "branch" "Branch";
ALTER TABLE "fibre_products" ADD COLUMN IF NOT EXISTS "branch" "Branch";

DROP INDEX IF EXISTS "makes_name_key";

--------------------------------------------------------------------------------
-- 2. Persistent audit maps (DROP after soak if desired)
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "_stage5_make_map" (
  "old_id" TEXT PRIMARY KEY,
  "make_name" TEXT NOT NULL,
  "keep_branch" "Branch" NOT NULL,
  "jhb_id" TEXT NOT NULL,
  "ct_id" TEXT NOT NULL,
  "is_dual" BOOLEAN NOT NULL
);

CREATE TABLE IF NOT EXISTS "_stage5_model_map" (
  "old_id" TEXT PRIMARY KEY,
  "make_name" TEXT NOT NULL,
  "model_name" TEXT NOT NULL,
  "keep_branch" "Branch" NOT NULL,
  "jhb_id" TEXT NOT NULL,
  "ct_id" TEXT NOT NULL,
  "is_dual" BOOLEAN NOT NULL
);

CREATE TABLE IF NOT EXISTS "_stage5_product_map" (
  "old_id" TEXT PRIMARY KEY,
  "product_name" TEXT NOT NULL,
  "keep_branch" "Branch" NOT NULL,
  "jhb_id" TEXT NOT NULL,
  "ct_id" TEXT NOT NULL,
  "is_dual" BOOLEAN NOT NULL
);

TRUNCATE "_stage5_make_map";
TRUNCATE "_stage5_model_map";
TRUNCATE "_stage5_product_map";

--------------------------------------------------------------------------------
-- 3. Assert dual-use MODEL names == production-confirmed set (exactly 5)
--------------------------------------------------------------------------------

DO $$
DECLARE
  expected TEXT[] := ARRAY[
    'MFC-L5715DW',
    'Bizhub C250i',
    'D-Colour MF3023/3024',
    'D-Copia 4513/4514 MF Plus',
    'D-Copia D4023MF/D4024MF/D4024MF+'
  ];
  actual TEXT[];
  missing TEXT[];
  unexpected TEXT[];
BEGIN
  SELECT COALESCE(array_agg(m.name ORDER BY m.name), ARRAY[]::text[])
  INTO actual
  FROM "models" m
  WHERE EXISTS (SELECT 1 FROM "machines" x WHERE x.model_id = m.id AND x.branch = 'JHB')
    AND EXISTS (SELECT 1 FROM "machines" x WHERE x.model_id = m.id AND x.branch = 'CT');

  SELECT COALESCE(array_agg(e ORDER BY e), ARRAY[]::text[])
  INTO missing
  FROM unnest(expected) e
  WHERE NOT (e = ANY (actual));

  SELECT COALESCE(array_agg(a ORDER BY a), ARRAY[]::text[])
  INTO unexpected
  FROM unnest(actual) a
  WHERE NOT (a = ANY (expected));

  IF cardinality(missing) > 0 OR cardinality(unexpected) > 0 THEN
    RAISE EXCEPTION
      'Dual-use model set mismatch. missing=% unexpected=% actual=%',
      missing, unexpected, actual;
  END IF;
END $$;

--------------------------------------------------------------------------------
-- 4. MAKES
--------------------------------------------------------------------------------

INSERT INTO "_stage5_make_map" ("old_id", "make_name", "keep_branch", "jhb_id", "ct_id", "is_dual")
SELECT
  mk.id,
  mk.name,
  CASE
    WHEN jhb_n > 0 AND ct_n > 0 THEN
      CASE WHEN jhb_n >= ct_n THEN 'JHB'::"Branch" ELSE 'CT'::"Branch" END
    WHEN jhb_n > 0 THEN 'JHB'::"Branch"
    WHEN ct_n > 0 THEN 'CT'::"Branch"
    ELSE 'JHB'::"Branch"
  END,
  mk.id, -- temporary; fixed below
  mk.id,
  (jhb_n > 0 AND ct_n > 0)
FROM (
  SELECT
    mk.id,
    mk.name,
    COUNT(DISTINCT mac.id) FILTER (WHERE mac.branch = 'JHB') AS jhb_n,
    COUNT(DISTINCT mac.id) FILTER (WHERE mac.branch = 'CT') AS ct_n
  FROM "makes" mk
  LEFT JOIN "models" m ON m.make_id = mk.id
  LEFT JOIN "machines" mac ON mac.model_id = m.id
  GROUP BY mk.id, mk.name
) mk;

UPDATE "makes" mk
SET "branch" = mm."keep_branch"
FROM "_stage5_make_map" mm
WHERE mk.id = mm."old_id";

-- Clone minority branch for dual-use makes
INSERT INTO "makes" ("id", "name", "branch")
SELECT
  gen_random_uuid()::text,
  mm."make_name",
  CASE WHEN mm."keep_branch" = 'JHB' THEN 'CT'::"Branch" ELSE 'JHB'::"Branch" END
FROM "_stage5_make_map" mm
WHERE mm."is_dual" = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM "makes" x
    WHERE x.name = mm."make_name"
      AND x.branch = CASE WHEN mm."keep_branch" = 'JHB' THEN 'CT'::"Branch" ELSE 'JHB'::"Branch" END
  );

UPDATE "_stage5_make_map" mm
SET
  "jhb_id" = CASE WHEN mm."keep_branch" = 'JHB' THEN mm."old_id" ELSE clone.id END,
  "ct_id"  = CASE WHEN mm."keep_branch" = 'CT'  THEN mm."old_id" ELSE clone.id END
FROM "makes" clone
WHERE mm."is_dual" = TRUE
  AND clone.name = mm."make_name"
  AND clone.id <> mm."old_id"
  AND clone.branch = CASE WHEN mm."keep_branch" = 'JHB' THEN 'CT'::"Branch" ELSE 'JHB'::"Branch" END;

-- Single-use / unused: both map slots = original (only one branch row exists)
UPDATE "_stage5_make_map" mm
SET "jhb_id" = mm."old_id", "ct_id" = mm."old_id"
WHERE mm."is_dual" = FALSE;

--------------------------------------------------------------------------------
-- 5. MODELS
--------------------------------------------------------------------------------

INSERT INTO "_stage5_model_map" (
  "old_id", "make_name", "model_name", "keep_branch", "jhb_id", "ct_id", "is_dual"
)
SELECT
  m.id,
  mk.name,
  m.name,
  CASE
    -- Dual-use keep-branch: production-confirmed, hardcoded (do not derive from counts)
    WHEN m.name = 'MFC-L5715DW' THEN 'JHB'::"Branch"
    WHEN m.name = 'Bizhub C250i' THEN 'JHB'::"Branch"
    WHEN m.name = 'D-Colour MF3023/3024' THEN 'JHB'::"Branch"
    WHEN m.name = 'D-Copia 4513/4514 MF Plus' THEN 'CT'::"Branch"
    WHEN m.name = 'D-Copia D4023MF/D4024MF/D4024MF+' THEN 'JHB'::"Branch"
    -- Single-use / unused
    WHEN jhb_n > 0 AND ct_n = 0 THEN 'JHB'::"Branch"
    WHEN ct_n > 0 AND jhb_n = 0 THEN 'CT'::"Branch"
    WHEN jhb_n > 0 AND ct_n > 0 THEN
      -- Unexpected extra dual-use (section 3 assert should already have aborted)
      CASE WHEN jhb_n >= ct_n THEN 'JHB'::"Branch" ELSE 'CT'::"Branch" END
    WHEN parts_jhb > 0 AND parts_ct = 0 THEN 'JHB'::"Branch"
    WHEN parts_ct > 0 AND parts_jhb = 0 THEN 'CT'::"Branch"
    ELSE mkmap."keep_branch"
  END,
  m.id,
  m.id,
  (jhb_n > 0 AND ct_n > 0)
FROM (
  SELECT
    m.id,
    m.name,
    m.make_id,
    (SELECT COUNT(*) FROM "machines" mac WHERE mac.model_id = m.id AND mac.branch = 'JHB') AS jhb_n,
    (SELECT COUNT(*) FROM "machines" mac WHERE mac.model_id = m.id AND mac.branch = 'CT') AS ct_n,
    (SELECT COUNT(*) FROM "model_parts" mp WHERE mp.model_id = m.id AND mp.branch = 'JHB') AS parts_jhb,
    (SELECT COUNT(*) FROM "model_parts" mp WHERE mp.model_id = m.id AND mp.branch = 'CT') AS parts_ct
  FROM "models" m
) m
JOIN "makes" mk ON mk.id = m.make_id
JOIN "_stage5_make_map" mkmap ON mkmap."old_id" = m.make_id;

-- Point original model at keep-branch make + set branch
UPDATE "models" m
SET
  "branch" = mm."keep_branch",
  "make_id" = CASE
    WHEN mm."keep_branch" = 'JHB' THEN mkmap."jhb_id"
    ELSE mkmap."ct_id"
  END
FROM "_stage5_model_map" mm
JOIN "_stage5_make_map" mkmap ON mkmap."make_name" = mm."make_name"
WHERE m.id = mm."old_id";

-- Clone dual-use models onto minority make
INSERT INTO "models" (
  "id", "make_id", "name", "paper_size", "model_type", "machine_life", "branch"
)
SELECT
  gen_random_uuid()::text,
  CASE WHEN mm."keep_branch" = 'JHB' THEN mkmap."ct_id" ELSE mkmap."jhb_id" END,
  src.name,
  src.paper_size,
  src.model_type,
  src.machine_life,
  CASE WHEN mm."keep_branch" = 'JHB' THEN 'CT'::"Branch" ELSE 'JHB'::"Branch" END
FROM "_stage5_model_map" mm
JOIN "models" src ON src.id = mm."old_id"
JOIN "_stage5_make_map" mkmap ON mkmap."make_name" = mm."make_name"
WHERE mm."is_dual" = TRUE;

UPDATE "_stage5_model_map" mm
SET
  "jhb_id" = CASE WHEN mm."keep_branch" = 'JHB' THEN mm."old_id" ELSE clone.id END,
  "ct_id"  = CASE WHEN mm."keep_branch" = 'CT'  THEN mm."old_id" ELSE clone.id END
FROM "models" clone
JOIN "makes" clone_make ON clone_make.id = clone.make_id
WHERE mm."is_dual" = TRUE
  AND clone.name = mm."model_name"
  AND clone_make.name = mm."make_name"
  AND clone.id <> mm."old_id"
  AND clone.branch = CASE WHEN mm."keep_branch" = 'JHB' THEN 'CT'::"Branch" ELSE 'JHB'::"Branch" END;

UPDATE "_stage5_model_map" mm
SET "jhb_id" = mm."old_id", "ct_id" = mm."old_id"
WHERE mm."is_dual" = FALSE;

--------------------------------------------------------------------------------
-- 6. Remap machines + model_parts
--------------------------------------------------------------------------------

UPDATE "machines" mac
SET "model_id" = CASE
  WHEN mac.branch = 'JHB' THEN mm."jhb_id"
  ELSE mm."ct_id"
END
FROM "_stage5_model_map" mm
WHERE mac.model_id IS NOT NULL
  AND mac.model_id = mm."old_id";

UPDATE "model_parts" mp
SET "model_id" = CASE
  WHEN mp.branch = 'JHB' THEN mm."jhb_id"
  ELSE mm."ct_id"
END
FROM "_stage5_model_map" mm
WHERE mp.model_id = mm."old_id";

--------------------------------------------------------------------------------
-- 7. FIBRE PRODUCTS
--------------------------------------------------------------------------------

INSERT INTO "_stage5_product_map" (
  "old_id", "product_name", "keep_branch", "jhb_id", "ct_id", "is_dual"
)
SELECT
  fp.id,
  fp.name,
  CASE
    WHEN jhb_n > 0 AND ct_n > 0 THEN
      CASE WHEN jhb_n >= ct_n THEN 'JHB'::"Branch" ELSE 'CT'::"Branch" END
    WHEN jhb_n > 0 THEN 'JHB'::"Branch"
    WHEN ct_n > 0 THEN 'CT'::"Branch"
    ELSE 'JHB'::"Branch"
  END,
  fp.id,
  fp.id,
  (jhb_n > 0 AND ct_n > 0)
FROM (
  SELECT
    fp.id,
    fp.name,
    COUNT(fo.id) FILTER (WHERE fo.branch = 'JHB') AS jhb_n,
    COUNT(fo.id) FILTER (WHERE fo.branch = 'CT') AS ct_n
  FROM "fibre_products" fp
  LEFT JOIN "fibre_orders" fo ON fo.product_id = fp.id
  GROUP BY fp.id, fp.name
) fp;

UPDATE "fibre_products" fp
SET "branch" = pm."keep_branch"
FROM "_stage5_product_map" pm
WHERE fp.id = pm."old_id";

INSERT INTO "fibre_products" (
  "id", "name", "product_type", "default_eta_weeks", "notes", "is_active",
  "branch", "created_at", "updated_at"
)
SELECT
  gen_random_uuid()::text,
  src.name,
  src.product_type,
  src.default_eta_weeks,
  src.notes,
  src.is_active,
  CASE WHEN pm."keep_branch" = 'JHB' THEN 'CT'::"Branch" ELSE 'JHB'::"Branch" END,
  NOW(),
  NOW()
FROM "_stage5_product_map" pm
JOIN "fibre_products" src ON src.id = pm."old_id"
WHERE pm."is_dual" = TRUE;

UPDATE "_stage5_product_map" pm
SET
  "jhb_id" = CASE WHEN pm."keep_branch" = 'JHB' THEN pm."old_id" ELSE clone.id END,
  "ct_id"  = CASE WHEN pm."keep_branch" = 'CT'  THEN pm."old_id" ELSE clone.id END
FROM "fibre_products" clone
WHERE pm."is_dual" = TRUE
  AND clone.name = pm."product_name"
  AND clone.id <> pm."old_id"
  AND clone.branch = CASE WHEN pm."keep_branch" = 'JHB' THEN 'CT'::"Branch" ELSE 'JHB'::"Branch" END;

UPDATE "_stage5_product_map" pm
SET "jhb_id" = pm."old_id", "ct_id" = pm."old_id"
WHERE pm."is_dual" = FALSE;

UPDATE "fibre_orders" fo
SET "product_id" = CASE
  WHEN fo.branch = 'JHB' THEN pm."jhb_id"
  ELSE pm."ct_id"
END
FROM "_stage5_product_map" pm
WHERE fo.product_id = pm."old_id";

--------------------------------------------------------------------------------
-- 8. Assertions C1–C7 (+ confirmed keep-branch checks for the 5 models)
--------------------------------------------------------------------------------

-- C1
DO $$
DECLARE n INT;
BEGIN
  SELECT COUNT(*) INTO n
  FROM "machines" mac
  JOIN "models" m ON m.id = mac.model_id
  WHERE m.branch IS DISTINCT FROM mac.branch;
  IF n > 0 THEN
    RAISE EXCEPTION 'C1 FAIL: % machines reference a model on the wrong branch', n;
  END IF;
END $$;

-- C2
DO $$
DECLARE n INT;
BEGIN
  SELECT COUNT(*) INTO n
  FROM "model_parts" mp
  JOIN "models" m ON m.id = mp.model_id
  WHERE m.branch IS DISTINCT FROM mp.branch;
  IF n > 0 THEN
    RAISE EXCEPTION 'C2 FAIL: % model_parts reference a model on the wrong branch', n;
  END IF;
END $$;

-- C3
DO $$
DECLARE n INT;
BEGIN
  SELECT COUNT(*) INTO n
  FROM "models" m
  JOIN "makes" mk ON mk.id = m.make_id
  WHERE mk.branch IS DISTINCT FROM m.branch
     OR m.branch IS NULL
     OR mk.branch IS NULL;
  IF n > 0 THEN
    RAISE EXCEPTION 'C3 FAIL: % models have null/mismatched make.branch', n;
  END IF;
END $$;

-- C4
DO $$
DECLARE n INT;
BEGIN
  SELECT COUNT(*) INTO n
  FROM "fibre_orders" fo
  JOIN "fibre_products" fp ON fp.id = fo.product_id
  WHERE fp.branch IS DISTINCT FROM fo.branch OR fp.branch IS NULL;
  IF n > 0 THEN
    RAISE EXCEPTION 'C4 FAIL: % fibre_orders reference a product on the wrong branch', n;
  END IF;
END $$;

-- C5 — counts unchanged
DO $$
DECLARE
  pre RECORD;
  n_machines INT;
  n_orders INT;
  n_parts INT;
  n_repl INT;
  orphan_repl INT;
BEGIN
  SELECT * INTO pre FROM _stage5_precounts;
  SELECT COUNT(*) INTO n_machines FROM "machines";
  SELECT COUNT(*) INTO n_orders FROM "fibre_orders";
  SELECT COUNT(*) INTO n_parts FROM "model_parts";
  SELECT COUNT(*) INTO n_repl FROM "part_replacements";

  IF n_machines <> pre.machines
     OR n_orders <> pre.fibre_orders
     OR n_parts <> pre.model_parts
     OR n_repl <> pre.part_replacements THEN
    RAISE EXCEPTION
      'C5 FAIL: count drift machines %→% orders %→% parts %→% replacements %→%',
      pre.machines, n_machines,
      pre.fibre_orders, n_orders,
      pre.model_parts, n_parts,
      pre.part_replacements, n_repl;
  END IF;

  SELECT COUNT(*) INTO orphan_repl
  FROM "part_replacements" pr
  WHERE pr.model_part_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM "model_parts" mp WHERE mp.id = pr.model_part_id);
  IF orphan_repl > 0 THEN
    RAISE EXCEPTION 'C5 FAIL: % part_replacements lost model_part FK', orphan_repl;
  END IF;
END $$;

-- C6 — dual-use maps have distinct branch ids; exactly 5 expected names
DO $$
DECLARE n INT;
BEGIN
  SELECT COUNT(*) INTO n
  FROM "_stage5_model_map"
  WHERE "is_dual" = TRUE AND "jhb_id" = "ct_id";
  IF n > 0 THEN
    RAISE EXCEPTION 'C6 FAIL: % dual-use models still share one id for both branches', n;
  END IF;

  SELECT COUNT(*) INTO n
  FROM "_stage5_model_map"
  WHERE "is_dual" = TRUE;
  IF n <> 5 THEN
    RAISE EXCEPTION 'C6 FAIL: expected 5 dual-use model map rows, found %', n;
  END IF;
END $$;

-- C7 — no orphan machine.model_id
DO $$
DECLARE n INT;
BEGIN
  SELECT COUNT(*) INTO n
  FROM "machines" mac
  WHERE mac.model_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM "models" m WHERE m.id = mac.model_id);
  IF n > 0 THEN
    RAISE EXCEPTION 'C7 FAIL: % machines have orphan model_id', n;
  END IF;
END $$;

-- Confirmed keep-branch for the five dual-use models
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "_stage5_model_map"
    WHERE model_name = 'MFC-L5715DW' AND keep_branch = 'JHB'
      AND jhb_id = old_id AND ct_id <> old_id
  ) THEN
    RAISE EXCEPTION 'Expected MFC-L5715DW: JHB keeps original, CT cloned';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM "_stage5_model_map"
    WHERE model_name = 'Bizhub C250i' AND keep_branch = 'JHB'
      AND jhb_id = old_id AND ct_id <> old_id
  ) THEN
    RAISE EXCEPTION 'Expected Bizhub C250i: JHB keeps original, CT cloned';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM "_stage5_model_map"
    WHERE model_name = 'D-Colour MF3023/3024' AND keep_branch = 'JHB'
      AND jhb_id = old_id AND ct_id <> old_id
  ) THEN
    RAISE EXCEPTION 'Expected D-Colour MF3023/3024: JHB keeps original, CT cloned';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM "_stage5_model_map"
    WHERE model_name = 'D-Copia 4513/4514 MF Plus' AND keep_branch = 'CT'
      AND ct_id = old_id AND jhb_id <> old_id
  ) THEN
    RAISE EXCEPTION 'Expected D-Copia 4513/4514 MF Plus: CT keeps original, JHB cloned';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM "_stage5_model_map"
    WHERE model_name = 'D-Copia D4023MF/D4024MF/D4024MF+' AND keep_branch = 'JHB'
      AND jhb_id = old_id AND ct_id <> old_id
  ) THEN
    RAISE EXCEPTION 'Expected D-Copia D4023MF/D4024MF/D4024MF+: JHB keeps original, CT cloned';
  END IF;
END $$;

--------------------------------------------------------------------------------
-- 9. Harden: NOT NULL + indexes
--------------------------------------------------------------------------------

ALTER TABLE "makes" ALTER COLUMN "branch" SET NOT NULL;
ALTER TABLE "models" ALTER COLUMN "branch" SET NOT NULL;
ALTER TABLE "fibre_products" ALTER COLUMN "branch" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "makes_name_branch_key" ON "makes"("name", "branch");
CREATE INDEX IF NOT EXISTS "makes_branch_idx" ON "makes"("branch");
CREATE INDEX IF NOT EXISTS "models_branch_idx" ON "models"("branch");
CREATE UNIQUE INDEX IF NOT EXISTS "fibre_products_name_branch_key" ON "fibre_products"("name", "branch");
CREATE INDEX IF NOT EXISTS "fibre_products_branch_idx" ON "fibre_products"("branch");

COMMIT;

-- Left for audit / soak review:
--   SELECT * FROM _stage5_make_map ORDER BY make_name;
--   SELECT * FROM _stage5_model_map ORDER BY make_name, model_name;
--   SELECT * FROM _stage5_product_map ORDER BY product_name;
-- DROP TABLE _stage5_make_map, _stage5_model_map, _stage5_product_map;
