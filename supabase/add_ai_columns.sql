-- MIGRATION: Add AI analysis columns to wardrobe_items
-- Run this in Supabase SQL Editor

ALTER TABLE wardrobe_items 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS category1 TEXT,
ADD COLUMN IF NOT EXISTS category2 TEXT,
ADD COLUMN IF NOT EXISTS category3 TEXT,
ADD COLUMN IF NOT EXISTS category4 TEXT,
ADD COLUMN IF NOT EXISTS issue TEXT;

-- Create indexes for filtering
CREATE INDEX IF NOT EXISTS idx_wardrobe_category1 ON wardrobe_items(category1);
CREATE INDEX IF NOT EXISTS idx_wardrobe_category3 ON wardrobe_items(category3);
CREATE INDEX IF NOT EXISTS idx_wardrobe_category4 ON wardrobe_items(category4);
