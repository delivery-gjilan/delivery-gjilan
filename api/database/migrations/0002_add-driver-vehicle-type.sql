CREATE TYPE "public"."driver_vehicle_type" AS ENUM('GAS', 'ELECTRIC');--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "vehicle_type" "driver_vehicle_type";