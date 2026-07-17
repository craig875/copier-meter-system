-- =============================================================================
-- Stage 6f: Account consolidation (craig / susana / wayne paired accounts)
-- =============================================================================
--
-- DEPENDENCY (HARD REQUIREMENT):
--   Stages 6a–6d MUST already be deployed to this database before running this
--   migration. Specifically, the "user_branch_access" table (migration
--   20260716100000_add_user_branch_access) MUST exist. Assertion A0 aborts
--   if it does not.
--
-- WHAT THIS DOES (single transaction — all 3 pairs or nothing):
--   For each pair (survivor = real email, source = +tag email):
--     1. Snapshot FK row counts attributed to source / survivor
--     2. Assert no installation_project_assignments [projectId, duty] conflicts
--     3. Reassign all 16 user FK columns from source → survivor
--     4. Merge modules = union(survivor.modules, source.modules)
--     5. Grant survivor UserBranchAccess for BOTH home branches
--     6. Assert source has zero remaining FK refs, then delete source user
--     7. Post-asserts: source gone, survivor FK totals match snapshot math,
--        survivor has access to both branches, no orphaned source refs
--
-- DRY-RUN FIRST:
--   Apply against a production COPY / dump (exactly like Stage 5), NOT live
--   production, until inventory + this migration are verified end-to-end.
--
-- NOT applied automatically — review, dry-run on a prod dump, then migrate deploy.
-- =============================================================================

BEGIN;

--------------------------------------------------------------------------------
-- A0. Hard gate: Stage 6a UserBranchAccess must already exist
--------------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'user_branch_access'
  ) THEN
    RAISE EXCEPTION
      'Stage 6f aborted: table user_branch_access does not exist. '
      'Deploy Stages 6a–6d (migration 20260716100000_add_user_branch_access) first.';
  END IF;
END $$;

--------------------------------------------------------------------------------
-- Pair definitions (resolve IDs by email — UUIDs differ per environment)
--------------------------------------------------------------------------------

CREATE TEMP TABLE _stage6f_pairs (
  label           TEXT PRIMARY KEY,
  survivor_email  TEXT NOT NULL,
  source_email    TEXT NOT NULL,
  survivor_id     TEXT,
  source_id       TEXT,
  survivor_branch "Branch",
  source_branch   "Branch"
);

INSERT INTO _stage6f_pairs (label, survivor_email, source_email) VALUES
  ('craig',  'craig@pancom.co.za',  'craig+cpt@pancom.co.za'),
  ('susana', 'susana@pancom.co.za', 'susana+cpt@pancom.co.za'),
  ('wayne',  'wayne@pancom.co.za',  'wayne+jhb@pancom.co.za');

UPDATE _stage6f_pairs p
SET survivor_id = s.id, survivor_branch = s.branch
FROM users s
WHERE s.email = p.survivor_email;

UPDATE _stage6f_pairs p
SET source_id = s.id, source_branch = s.branch
FROM users s
WHERE s.email = p.source_email;

DO $$
DECLARE
  bad TEXT;
BEGIN
  SELECT string_agg(label, ', ' ORDER BY label)
  INTO bad
  FROM _stage6f_pairs
  WHERE survivor_id IS NULL OR source_id IS NULL;

  IF bad IS NOT NULL THEN
    RAISE EXCEPTION
      'Stage 6f aborted: missing survivor and/or source account for pair(s): %. '
      'Expected emails must exist before merge.',
      bad;
  END IF;

  -- Same person must not already share an id (sanity)
  IF EXISTS (
    SELECT 1 FROM _stage6f_pairs WHERE survivor_id = source_id
  ) THEN
    RAISE EXCEPTION 'Stage 6f aborted: survivor_id equals source_id for a pair';
  END IF;
END $$;

--------------------------------------------------------------------------------
-- FK column catalogue (must stay in sync with _stage6f-merge-inventory.mjs)
--------------------------------------------------------------------------------

CREATE TEMP TABLE _stage6f_fk_defs (
  table_name  TEXT NOT NULL,
  column_name TEXT NOT NULL,
  PRIMARY KEY (table_name, column_name)
);

INSERT INTO _stage6f_fk_defs (table_name, column_name) VALUES
  ('readings',                           'captured_by'),
  ('readings',                           'unable_to_read_override_by'),
  ('submissions',                        'submitted_by'),
  ('audit_logs',                         'user_id'),
  ('part_replacements',                  'captured_by'),
  ('notifications',                      'user_id'),
  ('installation_projects',              'created_by'),
  ('installation_project_steps',         'completed_by'),
  ('installation_project_assignments',   'user_id'),
  ('fibre_orders',                       'sales_agent_id'),
  ('fibre_orders',                       'created_by'),
  ('order_updates',                      'updated_by'),
  ('fibre_order_update_requests',        'requested_by_id'),
  ('fibre_order_update_requests',        'resolved_by_id'),
  ('unable_to_obtain_override_requests', 'requested_by_id'),
  ('unable_to_obtain_override_requests', 'resolved_by_id');

--------------------------------------------------------------------------------
-- A1. Assert no installation_project_assignments unique conflicts
--------------------------------------------------------------------------------

DO $$
DECLARE
  n INTEGER;
  detail TEXT;
BEGIN
  SELECT COUNT(*), string_agg(
    format('%s project=%s duty=%s', p.label, a.project_id, a.duty),
    '; '
  )
  INTO n, detail
  FROM installation_project_assignments a
  JOIN _stage6f_pairs p ON a.user_id = p.source_id
  WHERE EXISTS (
    SELECT 1
    FROM installation_project_assignments b
    WHERE b.user_id = p.survivor_id
      AND b.project_id = a.project_id
      AND b.duty = a.duty
  );

  IF COALESCE(n, 0) > 0 THEN
    RAISE EXCEPTION
      'Stage 6f aborted: % installation_project_assignments conflict(s): %',
      n, detail;
  END IF;
END $$;

--------------------------------------------------------------------------------
-- Snapshot FK counts before reassignment (source + survivor per column)
--------------------------------------------------------------------------------

CREATE TEMP TABLE _stage6f_fk_snapshot (
  label       TEXT NOT NULL,
  who         TEXT NOT NULL, -- 'source' | 'survivor'
  table_name  TEXT NOT NULL,
  column_name TEXT NOT NULL,
  row_count   BIGINT NOT NULL,
  PRIMARY KEY (label, who, table_name, column_name)
);

DO $$
DECLARE
  pair RECORD;
  def  RECORD;
  uid  TEXT;
  who  TEXT;
  cnt  BIGINT;
BEGIN
  FOR pair IN SELECT * FROM _stage6f_pairs LOOP
    FOREACH who IN ARRAY ARRAY['source', 'survivor'] LOOP
      uid := CASE WHEN who = 'source' THEN pair.source_id ELSE pair.survivor_id END;
      FOR def IN SELECT * FROM _stage6f_fk_defs LOOP
        EXECUTE format(
          'SELECT COUNT(*) FROM %I WHERE %I = $1',
          def.table_name, def.column_name
        )
        INTO cnt
        USING uid;

        INSERT INTO _stage6f_fk_snapshot (label, who, table_name, column_name, row_count)
        VALUES (pair.label, who, def.table_name, def.column_name, cnt);
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

--------------------------------------------------------------------------------
-- Merge each pair
--------------------------------------------------------------------------------

DO $$
DECLARE
  pair RECORD;
  def  RECORD;
  cnt  BIGINT;
  leftovers TEXT;
  new_modules TEXT[];
  expected BIGINT;
  actual BIGINT;
  branch_count INTEGER;
BEGIN
  FOR pair IN SELECT * FROM _stage6f_pairs ORDER BY label LOOP
    leftovers := '';

    ------------------------------------------------------------------
    -- 1) Reassign all 16 FK columns
    ------------------------------------------------------------------
    UPDATE readings SET captured_by = pair.survivor_id
      WHERE captured_by = pair.source_id;
    UPDATE readings SET unable_to_read_override_by = pair.survivor_id
      WHERE unable_to_read_override_by = pair.source_id;
    UPDATE submissions SET submitted_by = pair.survivor_id
      WHERE submitted_by = pair.source_id;
    UPDATE audit_logs SET user_id = pair.survivor_id
      WHERE user_id = pair.source_id;
    UPDATE part_replacements SET captured_by = pair.survivor_id
      WHERE captured_by = pair.source_id;
    UPDATE notifications SET user_id = pair.survivor_id
      WHERE user_id = pair.source_id;
    UPDATE installation_projects SET created_by = pair.survivor_id
      WHERE created_by = pair.source_id;
    UPDATE installation_project_steps SET completed_by = pair.survivor_id
      WHERE completed_by = pair.source_id;
    UPDATE installation_project_assignments SET user_id = pair.survivor_id
      WHERE user_id = pair.source_id;
    UPDATE fibre_orders SET sales_agent_id = pair.survivor_id
      WHERE sales_agent_id = pair.source_id;
    UPDATE fibre_orders SET created_by = pair.survivor_id
      WHERE created_by = pair.source_id;
    UPDATE order_updates SET updated_by = pair.survivor_id
      WHERE updated_by = pair.source_id;
    UPDATE fibre_order_update_requests SET requested_by_id = pair.survivor_id
      WHERE requested_by_id = pair.source_id;
    UPDATE fibre_order_update_requests SET resolved_by_id = pair.survivor_id
      WHERE resolved_by_id = pair.source_id;
    UPDATE unable_to_obtain_override_requests SET requested_by_id = pair.survivor_id
      WHERE requested_by_id = pair.source_id;
    UPDATE unable_to_obtain_override_requests SET resolved_by_id = pair.survivor_id
      WHERE resolved_by_id = pair.source_id;

    ------------------------------------------------------------------
    -- 2) Modules = ordered distinct union
    ------------------------------------------------------------------
    SELECT ARRAY(
      SELECT DISTINCT m
      FROM unnest(
        COALESCE((SELECT modules FROM users WHERE id = pair.survivor_id), ARRAY[]::text[])
        ||
        COALESCE((SELECT modules FROM users WHERE id = pair.source_id), ARRAY[]::text[])
      ) AS m
      ORDER BY m
    )
    INTO new_modules;

    UPDATE users SET modules = new_modules WHERE id = pair.survivor_id;

    ------------------------------------------------------------------
    -- 3) Grant multi-branch access (both home branches)
    ------------------------------------------------------------------
    INSERT INTO user_branch_access (user_id, branch, granted_at, granted_by)
    VALUES
      (pair.survivor_id, pair.survivor_branch, CURRENT_TIMESTAMP, NULL),
      (pair.survivor_id, pair.source_branch,   CURRENT_TIMESTAMP, NULL)
    ON CONFLICT (user_id, branch) DO NOTHING;

    ------------------------------------------------------------------
    -- 4) Assert source has zero FK refs remaining
    ------------------------------------------------------------------
    FOR def IN SELECT * FROM _stage6f_fk_defs LOOP
      EXECUTE format(
        'SELECT COUNT(*) FROM %I WHERE %I = $1',
        def.table_name, def.column_name
      )
      INTO cnt
      USING pair.source_id;

      IF cnt > 0 THEN
        leftovers := leftovers || format('%s.%s=%s; ', def.table_name, def.column_name, cnt);
      END IF;
    END LOOP;

    IF leftovers <> '' THEN
      RAISE EXCEPTION
        'Stage 6f aborted for pair %: source still referenced after reassignment: %',
        pair.label, leftovers;
    END IF;

    ------------------------------------------------------------------
    -- 5) Assert survivor FK totals = survivor_before + source_before
    ------------------------------------------------------------------
    FOR def IN SELECT * FROM _stage6f_fk_defs LOOP
      SELECT
        (SELECT row_count FROM _stage6f_fk_snapshot
         WHERE label = pair.label AND who = 'survivor'
           AND table_name = def.table_name AND column_name = def.column_name)
        +
        (SELECT row_count FROM _stage6f_fk_snapshot
         WHERE label = pair.label AND who = 'source'
           AND table_name = def.table_name AND column_name = def.column_name)
      INTO expected;

      EXECUTE format(
        'SELECT COUNT(*) FROM %I WHERE %I = $1',
        def.table_name, def.column_name
      )
      INTO actual
      USING pair.survivor_id;

      IF actual <> expected THEN
        RAISE EXCEPTION
          'Stage 6f aborted for pair %: after reassignment %.% expected % but found %',
          pair.label, def.table_name, def.column_name, expected, actual;
      END IF;
    END LOOP;

    ------------------------------------------------------------------
    -- 6) Delete source account
    ------------------------------------------------------------------
    DELETE FROM users WHERE id = pair.source_id;

    IF EXISTS (SELECT 1 FROM users WHERE id = pair.source_id) THEN
      RAISE EXCEPTION 'Stage 6f aborted for pair %: source user still exists after DELETE', pair.label;
    END IF;

    IF EXISTS (SELECT 1 FROM users WHERE email = pair.source_email) THEN
      RAISE EXCEPTION 'Stage 6f aborted for pair %: source email % still present', pair.label, pair.source_email;
    END IF;

    ------------------------------------------------------------------
    -- 7) Survivor must have UserBranchAccess for both home branches
    ------------------------------------------------------------------
    SELECT COUNT(*) INTO branch_count
    FROM user_branch_access
    WHERE user_id = pair.survivor_id
      AND branch IN (pair.survivor_branch, pair.source_branch);

    IF branch_count < (
      SELECT COUNT(DISTINCT b)
      FROM unnest(ARRAY[pair.survivor_branch, pair.source_branch]) AS b
    ) THEN
      RAISE EXCEPTION
        'Stage 6f aborted for pair %: survivor % missing branch access for [% / %] (found % grants covering those)',
        pair.label, pair.survivor_email, pair.survivor_branch, pair.source_branch, branch_count;
    END IF;
  END LOOP;
END $$;

--------------------------------------------------------------------------------
-- Final global asserts: no orphaned refs to any deleted source id
--------------------------------------------------------------------------------

DO $$
DECLARE
  pair RECORD;
  def  RECORD;
  cnt  BIGINT;
BEGIN
  FOR pair IN SELECT * FROM _stage6f_pairs LOOP
    -- Source user must be gone
    IF EXISTS (SELECT 1 FROM users WHERE id = pair.source_id OR email = pair.source_email) THEN
      RAISE EXCEPTION 'Stage 6f final assert failed: source still present for %', pair.label;
    END IF;

    -- No FK may still point at source id
    FOR def IN SELECT * FROM _stage6f_fk_defs LOOP
      EXECUTE format(
        'SELECT COUNT(*) FROM %I WHERE %I = $1',
        def.table_name, def.column_name
      )
      INTO cnt
      USING pair.source_id;

      IF cnt > 0 THEN
        RAISE EXCEPTION
          'Stage 6f final assert failed for %: orphaned %.% still reference deleted source id (% rows)',
          pair.label, def.table_name, def.column_name, cnt;
      END IF;
    END LOOP;

    -- Survivor must still exist
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = pair.survivor_id AND email = pair.survivor_email) THEN
      RAISE EXCEPTION 'Stage 6f final assert failed: survivor missing for %', pair.label;
    END IF;
  END LOOP;
END $$;

COMMIT;
