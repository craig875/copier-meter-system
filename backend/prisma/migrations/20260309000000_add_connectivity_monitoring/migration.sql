-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'viewer';

-- CreateEnum
CREATE TYPE "MonitoringStatus" AS ENUM ('enabled', 'disabled');

-- CreateEnum
CREATE TYPE "ConnectivityServiceType" AS ENUM ('fibre', 'wireless', 'lte', 'other');

-- CreateEnum
CREATE TYPE "LinkStatus" AS ENUM ('up', 'down', 'partial', 'dns_failure');

-- CreateEnum
CREATE TYPE "AlertDeliveryStatus" AS ENUM ('pending', 'sent', 'failed');

-- CreateTable
CREATE TABLE "monitoring_targets" (
    "id" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "site_name" TEXT NOT NULL,
    "monitoring_target" TEXT NOT NULL,
    "service_type" "ConnectivityServiceType" NOT NULL DEFAULT 'other',
    "notes" TEXT,
    "alert_email" TEXT,
    "status" "MonitoringStatus" NOT NULL DEFAULT 'enabled',
    "resolved_ip" TEXT,
    "dns_refresh_interval_minutes" INTEGER NOT NULL DEFAULT 5,
    "last_check_at" TIMESTAMP(3),
    "current_status" "LinkStatus",
    "current_latency_ms" DOUBLE PRECISION,
    "current_packet_loss_percent" DOUBLE PRECISION,
    "consecutive_failures" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monitoring_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitoring_check_results" (
    "id" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "status" "LinkStatus" NOT NULL,
    "latency_ms" DOUBLE PRECISION,
    "packet_loss_percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "last_successful_ping" TIMESTAMP(3),
    "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "node_id" TEXT,

    CONSTRAINT "monitoring_check_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitoring_nodes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "api_key_hash" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_seen_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monitoring_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_time_windows" (
    "id" TEXT NOT NULL,
    "target_id" TEXT,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "days_of_week" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alert_time_windows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outage_logs" (
    "id" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "duration_seconds" INTEGER,
    "status_at_end" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_logs" (
    "id" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "alert_type" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delivery_status" "AlertDeliveryStatus" NOT NULL DEFAULT 'pending',
    "recipient_email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sla_targets" (
    "id" TEXT NOT NULL,
    "service_type" "ConnectivityServiceType" NOT NULL,
    "target_percent" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sla_targets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "monitoring_targets_status_idx" ON "monitoring_targets"("status");

-- CreateIndex
CREATE INDEX "monitoring_targets_current_status_idx" ON "monitoring_targets"("current_status");

-- CreateIndex
CREATE INDEX "monitoring_check_results_target_id_idx" ON "monitoring_check_results"("target_id");

-- CreateIndex
CREATE INDEX "monitoring_check_results_checked_at_idx" ON "monitoring_check_results"("checked_at");

-- CreateIndex
CREATE UNIQUE INDEX "sla_targets_service_type_key" ON "sla_targets"("service_type");

-- CreateIndex
CREATE INDEX "alert_time_windows_target_id_idx" ON "alert_time_windows"("target_id");

-- CreateIndex
CREATE INDEX "outage_logs_target_id_idx" ON "outage_logs"("target_id");

-- CreateIndex
CREATE INDEX "outage_logs_started_at_idx" ON "outage_logs"("started_at");

-- CreateIndex
CREATE INDEX "alert_logs_target_id_idx" ON "alert_logs"("target_id");

-- CreateIndex
CREATE INDEX "alert_logs_sent_at_idx" ON "alert_logs"("sent_at");

-- AddForeignKey
ALTER TABLE "monitoring_check_results" ADD CONSTRAINT "monitoring_check_results_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "monitoring_targets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_time_windows" ADD CONSTRAINT "alert_time_windows_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "monitoring_targets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outage_logs" ADD CONSTRAINT "outage_logs_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "monitoring_targets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_logs" ADD CONSTRAINT "alert_logs_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "monitoring_targets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
