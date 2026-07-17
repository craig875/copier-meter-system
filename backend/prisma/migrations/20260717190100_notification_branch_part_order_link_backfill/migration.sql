-- Recover part_order_captured rows whose part_replacement was deleted but linkUrl still has machineId.
UPDATE "notifications" n
SET "branch" = m."branch"
FROM "machines" m
WHERE n."branch" IS NULL
  AND n."type" = 'part_order_captured'
  AND n."link_url" ~ '/consumables/machines/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'
  AND m."id" = substring(n."link_url" from '/consumables/machines/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})');
