-- Point sales-order links at Smart Edge (replaces example.com placeholder).
-- Idempotent: safe to re-run; only updates the known AppSetting key.
UPDATE "app_settings"
SET
  "value" = 'https://taxshop.smartedge.co.za/fs/sal/so-mnt.asp?onbr={orderNumber}',
  "updated_at" = CURRENT_TIMESTAMP
WHERE "key" = 'accounting.sales_order_url_template';
