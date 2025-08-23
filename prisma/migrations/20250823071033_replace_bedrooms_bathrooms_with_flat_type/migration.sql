/*
  Warnings:

  - You are about to drop the column `bathrooms` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `bedrooms` on the `Booking` table. All the data in the column will be lost.
  - Added the required column `flatType` to the `Booking` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."FlatType" AS ENUM ('ONE_BHK', 'TWO_BHK', 'THREE_BHK', 'FOUR_BHK', 'STUDIO', 'PENTHOUSE');

-- AlterTable
ALTER TABLE "public"."Booking" DROP COLUMN "bathrooms",
DROP COLUMN "bedrooms",
ADD COLUMN     "flatType" "public"."FlatType" NOT NULL;
