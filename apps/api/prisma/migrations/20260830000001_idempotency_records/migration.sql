-- Idempotency for checkout: a replayed Idempotency-Key returns the original
-- order instead of creating a duplicate order / double-reserving stock.
CREATE TABLE "idempotency_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "idempotency_records_userId_key_key" ON "idempotency_records"("userId", "key");
CREATE UNIQUE INDEX "idempotency_records_orderId_key" ON "idempotency_records"("orderId");

ALTER TABLE "idempotency_records" ADD CONSTRAINT "idempotency_records_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "idempotency_records" ADD CONSTRAINT "idempotency_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
