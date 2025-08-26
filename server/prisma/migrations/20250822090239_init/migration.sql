/*
  Warnings:

  - You are about to drop the column `duration` on the `services` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `services` table. All the data in the column will be lost.
  - You are about to drop the column `salonId` on the `services` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."services" DROP CONSTRAINT "services_salonId_fkey";

-- AlterTable
ALTER TABLE "public"."services" DROP COLUMN "duration",
DROP COLUMN "price",
DROP COLUMN "salonId";

-- CreateTable
CREATE TABLE "public"."salon_services" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "duration" INTEGER NOT NULL,

    CONSTRAINT "salon_services_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "salon_services_salonId_serviceId_key" ON "public"."salon_services"("salonId", "serviceId");

-- AddForeignKey
ALTER TABLE "public"."salon_services" ADD CONSTRAINT "salon_services_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "public"."salons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."salon_services" ADD CONSTRAINT "salon_services_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
