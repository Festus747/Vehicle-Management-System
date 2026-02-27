-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'DRIVER', 'MANAGER');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('ACTIVE', 'NEAR_LIMIT', 'LIMIT_EXCEEDED');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('NEAR_LIMIT', 'LIMIT_EXCEEDED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'DRIVER',
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "staff_id" VARCHAR(100),
    "phone" VARCHAR(50),
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" UUID NOT NULL,
    "registration_number" VARCHAR(50) NOT NULL,
    "vehicle_type" VARCHAR(50),
    "assigned_driver_id" UUID,
    "mileage_limit" INTEGER NOT NULL DEFAULT 5000,
    "current_mileage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "VehicleStatus" NOT NULL DEFAULT 'ACTIVE',
    "road_worthy_start" DATE,
    "road_worthy_expiry" DATE,
    "insurance_start" DATE,
    "insurance_expiry" DATE,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mileage_records" (
    "id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "recorded_mileage" DOUBLE PRECISION NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recorded_by" UUID NOT NULL,

    CONSTRAINT "mileage_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "alert_type" "AlertType" NOT NULL,
    "message" TEXT NOT NULL,
    "triggered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_records" (
    "id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "mileage_at_service" DOUBLE PRECISION NOT NULL,
    "service_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_registration_number_key" ON "vehicles"("registration_number");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_assigned_driver_id_key" ON "vehicles"("assigned_driver_id");

-- CreateIndex
CREATE INDEX "vehicles_status_idx" ON "vehicles"("status");

-- CreateIndex
CREATE INDEX "vehicles_assigned_driver_id_idx" ON "vehicles"("assigned_driver_id");

-- CreateIndex
CREATE INDEX "vehicles_deleted_at_idx" ON "vehicles"("deleted_at");

-- CreateIndex
CREATE INDEX "mileage_records_vehicle_id_recorded_at_idx" ON "mileage_records"("vehicle_id", "recorded_at");

-- CreateIndex
CREATE INDEX "mileage_records_recorded_by_idx" ON "mileage_records"("recorded_by");

-- CreateIndex
CREATE INDEX "alerts_vehicle_id_idx" ON "alerts"("vehicle_id");

-- CreateIndex
CREATE INDEX "alerts_alert_type_idx" ON "alerts"("alert_type");

-- CreateIndex
CREATE INDEX "alerts_acknowledged_idx" ON "alerts"("acknowledged");

-- CreateIndex
CREATE INDEX "maintenance_records_vehicle_id_idx" ON "maintenance_records"("vehicle_id");

-- CreateIndex
CREATE INDEX "maintenance_records_service_date_idx" ON "maintenance_records"("service_date");

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_assigned_driver_id_fkey" FOREIGN KEY ("assigned_driver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mileage_records" ADD CONSTRAINT "mileage_records_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mileage_records" ADD CONSTRAINT "mileage_records_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
