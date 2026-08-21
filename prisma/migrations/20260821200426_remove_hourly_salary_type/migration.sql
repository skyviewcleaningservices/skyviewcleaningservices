-- Postgres has no direct "drop enum value" — recreate the type without
-- HOURLY, repoint the column, then swap names. Safe here: no Employee row
-- currently uses HOURLY (verified before writing this migration).
BEGIN;

CREATE TYPE "SalaryType_new" AS ENUM ('MONTHLY', 'DAILY', 'PER_JOB');

ALTER TABLE "Employee"
  ALTER COLUMN "salaryType" TYPE "SalaryType_new"
  USING ("salaryType"::text::"SalaryType_new");

DROP TYPE "SalaryType";
ALTER TYPE "SalaryType_new" RENAME TO "SalaryType";

COMMIT;
