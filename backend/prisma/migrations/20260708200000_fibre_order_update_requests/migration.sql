-- Fibre order update requests (sales agent -> manager)
CREATE TYPE "FibreUpdateRequestStatus" AS ENUM ('pending', 'resolved');

CREATE TABLE "fibre_order_update_requests" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "requested_by_id" TEXT NOT NULL,
    "note" TEXT,
    "status" "FibreUpdateRequestStatus" NOT NULL DEFAULT 'pending',
    "resolved_at" TIMESTAMP(3),
    "resolved_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fibre_order_update_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "fibre_order_update_requests_order_id_status_idx" ON "fibre_order_update_requests"("order_id", "status");
CREATE INDEX "fibre_order_update_requests_status_created_at_idx" ON "fibre_order_update_requests"("status", "created_at");

ALTER TABLE "fibre_order_update_requests" ADD CONSTRAINT "fibre_order_update_requests_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "fibre_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fibre_order_update_requests" ADD CONSTRAINT "fibre_order_update_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fibre_order_update_requests" ADD CONSTRAINT "fibre_order_update_requests_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
