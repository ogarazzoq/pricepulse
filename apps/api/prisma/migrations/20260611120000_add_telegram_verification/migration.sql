-- CreateTable
CREATE TABLE "TelegramVerification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TelegramVerification_userId_idx" ON "TelegramVerification"("userId");

-- CreateIndex
CREATE INDEX "TelegramVerification_code_idx" ON "TelegramVerification"("code");

-- CreateIndex
CREATE INDEX "TelegramVerification_expiresAt_idx" ON "TelegramVerification"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramVerification_userId_code_key" ON "TelegramVerification"("userId", "code");

-- AddForeignKey
ALTER TABLE "TelegramVerification" ADD CONSTRAINT "TelegramVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
