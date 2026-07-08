-- Convert product ETA from days to weeks
ALTER TABLE "fibre_products" RENAME COLUMN "default_eta_days" TO "default_eta_weeks";

UPDATE "fibre_products"
SET "default_eta_weeks" = GREATEST(1, ("default_eta_weeks" + 6) / 7);
