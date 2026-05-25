-- AlterTable
ALTER TABLE "User" ADD COLUMN "workLocationLat" DOUBLE PRECISION,
ADD COLUMN "workLocationLng" DOUBLE PRECISION,
ADD COLUMN "homeLocation" TEXT,
ADD COLUMN "homeLocationLat" DOUBLE PRECISION,
ADD COLUMN "homeLocationLng" DOUBLE PRECISION;

-- Change morningAlarm from TEXT to BOOLEAN
ALTER TABLE "User" ALTER COLUMN "morningAlarm" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "morningAlarm" TYPE BOOLEAN USING (
  CASE
    WHEN "morningAlarm" IS NULL THEN NULL
    WHEN LOWER("morningAlarm"::text) IN ('true', '1', 'yes') THEN true
    WHEN LOWER("morningAlarm"::text) IN ('false', '0', 'no') THEN false
    ELSE NULL
  END
);
