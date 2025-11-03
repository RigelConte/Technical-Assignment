import { query } from './client'

const ddl = `
CREATE TABLE IF NOT EXISTS configurator_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  thumbnail_data_url TEXT NULL,
  state JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_configurator_states_created_at ON configurator_states (created_at DESC);
` as const

const categoryMigration = `
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
` as const

export async function initDb() {
    // Postgres extension for gen_random_uuid may not be enabled by default on some images
    await query('CREATE EXTENSION IF NOT EXISTS pgcrypto;').catch(() => { /* ignore */ })
    await query(ddl)

    // Run category migration
    console.log('[db] Running category migration...')
    await query(categoryMigration).catch((e) => {
        console.error('[db] Category migration failed:', e)
        throw e
    })
    console.log('[db] Category migration complete')
}


