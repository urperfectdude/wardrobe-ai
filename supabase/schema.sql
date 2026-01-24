-- Supabase Database Schema for Wardrobe AI
-- INSTRUCTIONS: Copy this entire SQL and run it in Supabase Dashboard -> SQL Editor -> New Query

-- ============================================
-- WARDROBE ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS wardrobe_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    category TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE wardrobe_items ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access for demo (remove in production)
CREATE POLICY "Allow anonymous read" ON wardrobe_items FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON wardrobe_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous delete" ON wardrobe_items FOR DELETE USING (true);

-- ============================================
-- USER PREFERENCES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    favorite_styles TEXT[] DEFAULT '{}',
    favorite_platforms TEXT[] DEFAULT ARRAY['myntra', 'ajio', 'amazon'],
    price_range INTEGER[] DEFAULT ARRAY[500, 5000],
    prefer_thrifted BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all preferences" ON user_preferences FOR ALL USING (true);

-- ============================================
-- RECENT OUTFITS TABLE  
-- ============================================
CREATE TABLE IF NOT EXISTS recent_outfits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    item_ids UUID[] NOT NULL,
    occasion TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE recent_outfits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all outfits" ON recent_outfits FOR ALL USING (true);

-- ============================================
-- PRODUCTS TABLE (E-commerce data)
-- ============================================
CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    brand TEXT NOT NULL,
    price INTEGER NOT NULL,
    original_price INTEGER,
    rating DECIMAL(2,1) DEFAULT 4.0,
    reviews INTEGER DEFAULT 0,
    platform TEXT NOT NULL,
    image_url TEXT NOT NULL,
    category TEXT NOT NULL,
    styles TEXT[] DEFAULT '{}',
    is_thrifted BOOLEAN DEFAULT FALSE,
    product_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read products" ON products FOR SELECT USING (true);

-- ============================================
-- INSERT DEMO PRODUCTS
-- ============================================
INSERT INTO products (name, brand, price, original_price, rating, reviews, platform, image_url, category, styles, is_thrifted) VALUES
('Floral Print Wrap Dress', 'Libas', 1299, 2599, 4.2, 2341, 'myntra', 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400', 'dresses', ARRAY['Indie', 'Whimsical', 'Cottagecore'], false),
('High Waist Wide Leg Pants', 'H&M', 1499, 1999, 4.5, 892, 'myntra', 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400', 'bottoms', ARRAY['Office Siren', 'Old Money', 'Clean Girl'], false),
('Embroidered Kurti Set', 'Biba', 2199, 3499, 4.4, 1567, 'ajio', 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=400', 'traditional', ARRAY['Ethnic/Traditional'], false),
('Oversized Graphic Tee', 'Bewakoof', 599, 999, 4.1, 3421, 'flipkart', 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400', 'tops', ARRAY['Streetwear', 'Y2K & 2000s', 'Grunge/Goth'], false),
('Satin Slip Dress', 'Zara', 2999, 3999, 4.6, 456, 'tatacliq', 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=400', 'dresses', ARRAY['Coquette', 'Old Money', 'Clean Girl'], false),
('Baggy Cargo Pants', 'Roadster', 1199, 1599, 4.3, 2156, 'myntra', 'https://images.unsplash.com/photo-1517438476312-10d79c077509?w=400', 'bottoms', ARRAY['Streetwear', 'Alt & Edgy', 'Y2K & 2000s'], false),
('Lace Corset Top', 'Forever 21', 1299, 1999, 4.0, 678, 'ajio', 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400', 'tops', ARRAY['Coquette', 'Baddie', 'Y2K & 2000s'], false),
('Pleated Midi Skirt', 'MANGO', 2499, 3499, 4.7, 234, 'tatacliq', 'https://images.unsplash.com/photo-1583496661160-fb5886a0uj9a?w=400', 'skirts', ARRAY['Office Siren', 'Old Money', 'Clean Girl'], false),
('Vintage Denim Jacket', 'Preloved', 899, 2499, 4.2, 89, 'amazon', 'https://images.unsplash.com/photo-1551537482-f2075a1d41f2?w=400', 'outerwear', ARRAY['Indie', 'Grunge/Goth', 'Y2K & 2000s'], true),
('Block Heel Sandals', 'Inc.5', 1799, 2499, 4.4, 567, 'ajio', 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400', 'shoes', ARRAY['Office Siren', 'Clean Girl', 'Old Money'], false),
('Sequin Party Top', 'Vero Moda', 1899, 2999, 4.3, 345, 'myntra', 'https://images.unsplash.com/photo-1518622358385-8ea7d0794bf6?w=400', 'tops', ARRAY['Baddie', 'Y2K & 2000s', 'Mermaidcore'], false),
('Cottagecore Blouse', 'FabIndia', 1399, 1899, 4.5, 789, 'amazon', 'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=400', 'tops', ARRAY['Cottagecore', 'Whimsical', 'Indie'], false),
('Y2K Mini Skirt', 'SHEIN', 699, 1199, 3.9, 1234, 'flipkart', 'https://images.unsplash.com/photo-1592301933927-35b597393c0a?w=400', 'skirts', ARRAY['Y2K & 2000s', 'Baddie', 'Coquette'], false),
('Distressed Black Jeans', 'Levis', 2999, 4499, 4.6, 2345, 'amazon', 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400', 'bottoms', ARRAY['Grunge/Goth', 'Alt & Edgy', 'Streetwear'], false),
('Pearl Necklace Set', 'Accessorize', 999, 1499, 4.4, 456, 'tatacliq', 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400', 'accessories', ARRAY['Coquette', 'Old Money', 'Clean Girl'], false),
('Platform Sneakers', 'Truffle Collection', 1599, 2299, 4.2, 678, 'myntra', 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400', 'shoes', ARRAY['Y2K & 2000s', 'Streetwear', 'Alt & Edgy'], false);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_products_platform ON products(platform);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
