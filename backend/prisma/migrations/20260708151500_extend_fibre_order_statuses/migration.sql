-- Extend fibre order workflow with pre-wayleave statuses
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'awaiting_cx_creation' AFTER 'order_placed';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'awaiting_site_survey_scheduling' AFTER 'awaiting_cx_creation';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'site_survey_scheduled' AFTER 'awaiting_site_survey_scheduling';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'awaiting_planning_documents' AFTER 'site_survey_scheduled';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'awaiting_planning_sign_off' AFTER 'awaiting_planning_documents';
