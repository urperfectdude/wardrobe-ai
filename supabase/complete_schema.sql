-- =====================================================
-- WARDROBE AI - COMPLETE DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- =====================================================

-- Drop existing table if you want a fresh start (CAUTION: deletes all data)
-- DROP TABLE IF EXISTS wardrobe_items CASCADE;

-- =====================================================
-- WARDROBE ITEMS TABLE
-- Stores all user clothing items with AI-detected attributes
-- =====================================================

CREATE TABLE IF NOT EXISTS wardrobe_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Image
    image_url TEXT NOT NULL,
    
    -- AI-detected fields (all editable by user)
    title TEXT DEFAULT '',
    description TEXT DEFAULT '',
    brand TEXT DEFAULT '',
    color TEXT DEFAULT '',
    
    -- Category fields
    category TEXT DEFAULT '',         -- Legacy/backwards compat (same as category3)
    category1 TEXT DEFAULT '',        -- For whom: Men, Women, Unisex, Kids
    category2 TEXT DEFAULT '',        -- Item type: Clothing, Footwear, Accessories
    category3 TEXT DEFAULT '',        -- Apparel type: Top, Bottom, Dress, etc.
    category4 TEXT DEFAULT '',        -- Style/Aesthetic: Y2K, Clean Girl, Old Money, etc.
    
    -- AI detection metadata
    issue TEXT DEFAULT '',            -- Any image quality issues detected
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- If table already exists, add missing columns
-- =====================================================

-- Add brand column if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'wardrobe_items' AND column_name = 'brand') THEN
        ALTER TABLE wardrobe_items ADD COLUMN brand TEXT DEFAULT '';
    END IF;
END $$;

-- Add title column if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'wardrobe_items' AND column_name = 'title') THEN
        ALTER TABLE wardrobe_items ADD COLUMN title TEXT DEFAULT '';
    END IF;
END $$;

-- Add description column if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'wardrobe_items' AND column_name = 'description') THEN
        ALTER TABLE wardrobe_items ADD COLUMN description TEXT DEFAULT '';
    END IF;
END $$;

-- Add category1 column if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'wardrobe_items' AND column_name = 'category1') THEN
        ALTER TABLE wardrobe_items ADD COLUMN category1 TEXT DEFAULT '';
    END IF;
END $$;

-- Add category2 column if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'wardrobe_items' AND column_name = 'category2') THEN
        ALTER TABLE wardrobe_items ADD COLUMN category2 TEXT DEFAULT '';
    END IF;
END $$;

-- Add category3 column if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'wardrobe_items' AND column_name = 'category3') THEN
        ALTER TABLE wardrobe_items ADD COLUMN category3 TEXT DEFAULT '';
    END IF;
END $$;

-- Add category4 column if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'wardrobe_items' AND column_name = 'category4') THEN
        ALTER TABLE wardrobe_items ADD COLUMN category4 TEXT DEFAULT '';
    END IF;
END $$;

-- Add issue column if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'wardrobe_items' AND column_name = 'issue') THEN
        ALTER TABLE wardrobe_items ADD COLUMN issue TEXT DEFAULT '';
    END IF;
END $$;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE wardrobe_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all wardrobe items" ON wardrobe_items;
DROP POLICY IF EXISTS "Users can insert wardrobe items" ON wardrobe_items;
DROP POLICY IF EXISTS "Users can update own wardrobe items" ON wardrobe_items;
DROP POLICY IF EXISTS "Users can delete own wardrobe items" ON wardrobe_items;
DROP POLICY IF EXISTS "Allow all for demo" ON wardrobe_items;

-- Create permissive policy for development/demo
-- In production, replace with user-specific policies
CREATE POLICY "Allow all for demo" ON wardrobe_items
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- =====================================================
-- INDEXES for better query performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_wardrobe_items_color ON wardrobe_items(color);
CREATE INDEX IF NOT EXISTS idx_wardrobe_items_category3 ON wardrobe_items(category3);
CREATE INDEX IF NOT EXISTS idx_wardrobe_items_category4 ON wardrobe_items(category4);
CREATE INDEX IF NOT EXISTS idx_wardrobe_items_brand ON wardrobe_items(brand);
CREATE INDEX IF NOT EXISTS idx_wardrobe_items_created_at ON wardrobe_items(created_at DESC);

-- =====================================================
-- PRODUCTS TABLE (for e-commerce integration)
-- =====================================================

CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    original_price DECIMAL(10, 2),
    image_url TEXT,
    platform TEXT NOT NULL,
    product_url TEXT,
    category TEXT,
    color TEXT,
    style TEXT,
    brand TEXT,
    is_thrifted BOOLEAN DEFAULT false,
    rating DECIMAL(2, 1) DEFAULT 4.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read for all" ON products;
CREATE POLICY "Allow read for all" ON products FOR SELECT USING (true);

-- =====================================================
-- USER PREFERENCES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    preferred_styles TEXT[] DEFAULT '{}',
    preferred_colors TEXT[] DEFAULT '{}',
    body_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all preferences for demo" ON user_preferences;
CREATE POLICY "Allow all preferences for demo" ON user_preferences
    FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- RECENT OUTFITS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS recent_outfits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    occasion TEXT NOT NULL,
    items JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE recent_outfits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all outfits for demo" ON recent_outfits;
CREATE POLICY "Allow all outfits for demo" ON recent_outfits
    FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Schema created/updated successfully!';
    RAISE NOTICE 'Tables: wardrobe_items, products, user_preferences, recent_outfits';
END $$;
