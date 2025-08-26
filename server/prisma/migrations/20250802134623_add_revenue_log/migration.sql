-- CreateTable
CREATE TABLE "public"."RevenueLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "paidToTill" TEXT NOT NULL,
    "isDirect" BOOLEAN NOT NULL,
    "status" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevenueLog_pkey" PRIMARY KEY ("id")
);
