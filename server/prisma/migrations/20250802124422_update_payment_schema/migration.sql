-- CreateTable
CREATE TABLE "public"."PaymentPreference" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "tillNumber" TEXT,
    "isStkEnabled" BOOLEAN NOT NULL,
    "payoutCycle" TEXT,

    CONSTRAINT "PaymentPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentPreference_providerId_key" ON "public"."PaymentPreference"("providerId");

-- AddForeignKey
ALTER TABLE "public"."PaymentPreference" ADD CONSTRAINT "PaymentPreference_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "public"."Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
