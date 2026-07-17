-- AlterTable
ALTER TABLE "notifications" ADD COLUMN "branch" "Branch";

-- CreateIndex
CREATE INDEX "notifications_user_id_branch_idx" ON "notifications"("user_id", "branch");

-- Backfill where entity joins are clean (leave undeterminable rows NULL for review).

-- part_order_captured → part_replacements.branch
UPDATE "notifications" n
SET "branch" = pr."branch"
FROM "part_replacements" pr
WHERE n."branch" IS NULL
  AND n."entity_type" = 'part_order'
  AND n."entity_id" = pr."id";

-- unable_to_obtain_override_requested → unable_to_obtain_override_requests.branch
UPDATE "notifications" n
SET "branch" = r."branch"
FROM "unable_to_obtain_override_requests" r
WHERE n."branch" IS NULL
  AND n."entity_type" = 'unable_to_obtain_override_request'
  AND n."entity_id" = r."id";

-- fibre_order_update_requested → fibre_orders.branch via update request
UPDATE "notifications" n
SET "branch" = fo."branch"
FROM "fibre_order_update_requests" fur
JOIN "fibre_orders" fo ON fo."id" = fur."order_id"
WHERE n."branch" IS NULL
  AND n."entity_type" = 'fibre_order_update_request'
  AND n."entity_id" = fur."id";

-- connectivity_* → monitoring_targets.branch
UPDATE "notifications" n
SET "branch" = mt."branch"
FROM "monitoring_targets" mt
WHERE n."branch" IS NULL
  AND n."entity_type" = 'connectivity_target'
  AND n."entity_id" = mt."id";

-- reading_note_added: prefer linkUrl ?branch= when present
UPDATE "notifications" n
SET "branch" = CASE
  WHEN n."link_url" ~ '[?&]branch=CT([^A-Za-z0-9]|$)' THEN 'CT'::"Branch"
  WHEN n."link_url" ~ '[?&]branch=JHB([^A-Za-z0-9]|$)' THEN 'JHB'::"Branch"
  ELSE n."branch"
END
WHERE n."branch" IS NULL
  AND n."entity_type" = 'reading'
  AND n."type" = 'reading_note_added'
  AND n."link_url" IS NOT NULL;

-- reading_note_added: parse entity_id as {machineUuid}-{year}-{month} → machines.branch
UPDATE "notifications" n
SET "branch" = m."branch"
FROM "machines" m
WHERE n."branch" IS NULL
  AND n."entity_type" = 'reading'
  AND n."type" = 'reading_note_added'
  AND n."entity_id" ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}-[0-9]{4}-[0-9]{1,2}$'
  AND m."id" = substring(n."entity_id" from '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}');
