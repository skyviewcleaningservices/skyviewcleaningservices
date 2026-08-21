-- AlterTable
ALTER TABLE "public"."Booking" ADD COLUMN     "area" TEXT;

-- CreateTable
CREATE TABLE "public"."PriceRate" (
    "id" SERIAL NOT NULL,
    "flatType" "public"."FlatType" NOT NULL,
    "serviceType" TEXT NOT NULL,
    "price" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AddOnPrice" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AddOnPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PriceRate_flatType_serviceType_key" ON "public"."PriceRate"("flatType", "serviceType");

-- CreateIndex
CREATE UNIQUE INDEX "AddOnPrice_name_key" ON "public"."AddOnPrice"("name");
