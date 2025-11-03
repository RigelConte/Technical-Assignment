/*
  # Add category support to configurator snapshots

  ## Overview
  This migration adds category classification to configuration snapshots,
  allowing users to organize their saved states into different product types
  (wardrobe and kitchen cabinets).

  ## Changes

  1. New Enum Type
    - `SnapshotCategory` enum with values: 'wardrobe', 'kitchen_cabinets'

  2. Table Modifications
    - Add `category` column to `configurator_states` table
      - Type: `SnapshotCategory` enum
      - Default: 'wardrobe' (maintains backward compatibility)
      - Not null constraint

  3. Performance Optimizations
    - Add index on `category` column for efficient filtering

  ## Migration Safety
  - Uses `IF NOT EXISTS` checks to prevent errors on re-run
  - Sets default value to ensure existing records get 'wardrobe' category
  - Non-destructive: No data loss or table recreation
  - Backward compatible: Existing functionality remains unchanged
*/

-- Create enum type for snapshot categories
DO $$ BEGIN
  CREATE TYPE "SnapshotCategory" AS ENUM ('wardrobe', 'kitchen_cabinets');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add category column with default value for existing records
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'configurator_states'
    AND column_name = 'category'
  ) THEN
    ALTER TABLE "configurator_states"
    ADD COLUMN "category" "SnapshotCategory" NOT NULL DEFAULT 'wardrobe';
  END IF;
END $$;

-- Create index on category for efficient filtering
CREATE INDEX IF NOT EXISTS "configurator_states_category_idx"
ON "configurator_states"("category");

-- Verify existing index on created_at
CREATE INDEX IF NOT EXISTS "configurator_states_createdAt_idx"
ON "configurator_states"("created_at");