-- CreateEnum
CREATE TYPE "SalaryType" AS ENUM ('MONTHLY', 'DAILY', 'HOURLY', 'PER_JOB');

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "salaryAmount" DOUBLE PRECISION,
ADD COLUMN     "salaryType" "SalaryType";
