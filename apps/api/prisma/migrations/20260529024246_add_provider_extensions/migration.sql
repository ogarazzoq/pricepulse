-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "barcode" TEXT,
ADD COLUMN     "mpn" TEXT;

-- AlterTable
ALTER TABLE "ProductOffer" ADD COLUMN     "priceAvailable" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "Product_barcode_idx" ON "Product"("barcode");
