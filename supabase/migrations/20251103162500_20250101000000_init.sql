/*
  # Initial Migration - Create configurator_states table

  ## Overview
  This migration creates the initial database schema for storing configurator snapshots.
  Each snapshot represents a saved state of the product configurator (wardrobe, cabinet, etc.).

  ## Changes

  1. New Tables
    - `configurator_states`
      - `id` (uuid, primary key) - Unique identifier for each snapshot
      - `name` (text, required) - User-friendly name for the snapshot
      - `state` (jsonb, required) - Complete configurator state including dimensions, columns, shelves, doors, materials
      - `thumbnail_data_url` (text, optional) - Base64-encoded thumbnail image or URL
      - `created_at` (timestamptz, default now()) - Timestamp when snapshot was created
      - `updated_at` (timestamptz, auto-updated) - Timestamp of last update

  2. Indexes
    - Index on `created_at` for efficient ordering by recency

  ## Security
  - No RLS policies needed as this is a backend database accessed via API
  - Application-level authorization should be implemented in the API layer

  ## Notes
  - Uses JSONB for flexible state storage without schema constraints
  - UUID for globally unique identifiers
  - Timestamps for audit trail
*/

-- Create the configurator_states table
CREATE TABLE IF NOT EXISTS "configurator_states" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "name" TEXT NOT NULL,
  "state" JSONB NOT NULL,
  "thumbnail_data_url" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on created_at for efficient sorting
CREATE INDEX IF NOT EXISTS "configurator_states_created_at_idx"
ON "configurator_states"("created_at");

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_configurator_states_updated_at ON "configurator_states";
CREATE TRIGGER update_configurator_states_updated_at
  BEFORE UPDATE ON "configurator_states"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();