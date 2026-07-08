-- Demo/test fibre data only — safe to clear before status model change
DELETE FROM "fibre_order_update_requests";
DELETE FROM "order_updates";
DELETE FROM "fibre_orders";

CREATE TYPE "FibrePipelineStatus" AS ENUM (
  'order_placed',
  'awaiting_cx_number',
  'awaiting_site_survey_scheduling',
  'site_survey_scheduled',
  'site_survey_complete',
  'planning_documents_unsigned',
  'planning_documents_signed',
  'wayleave_pending',
  'wayleave_approved',
  'awaiting_installation_date',
  'installation_date_received',
  'installation_in_progress',
  'installation_complete',
  'awaiting_fno_cpe_installation',
  'awaiting_atc_testing_date',
  'atc_testing_complete',
  'awaiting_handover',
  'handover_received',
  'awaiting_cutover',
  'complete'
);

CREATE TYPE "FibreOverlayStatus" AS ENUM (
  'wip',
  'on_hold',
  'cancelled'
);

ALTER TABLE "fibre_orders"
  ADD COLUMN "pipeline_status" "FibrePipelineStatus" NOT NULL DEFAULT 'order_placed',
  ADD COLUMN "overlay_status" "FibreOverlayStatus";

ALTER TABLE "fibre_orders" DROP COLUMN "status";

ALTER TABLE "order_updates"
  ADD COLUMN "previous_pipeline_status" "FibrePipelineStatus",
  ADD COLUMN "new_pipeline_status" "FibrePipelineStatus",
  ADD COLUMN "previous_overlay_status" "FibreOverlayStatus",
  ADD COLUMN "new_overlay_status" "FibreOverlayStatus";

ALTER TABLE "order_updates"
  DROP COLUMN "previous_status",
  DROP COLUMN "new_status";

DROP TYPE "OrderStatus";

DROP INDEX IF EXISTS "fibre_orders_status_idx";

CREATE INDEX "fibre_orders_pipeline_status_idx" ON "fibre_orders"("pipeline_status");
CREATE INDEX "fibre_orders_overlay_status_idx" ON "fibre_orders"("overlay_status");
