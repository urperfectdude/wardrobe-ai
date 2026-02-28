CREATE TABLE store_products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT,
    description TEXT,
    price NUMERIC,
    image_url TEXT,
    category TEXT,
    category1 TEXT,
    category2 TEXT,
    category3 TEXT,
    color TEXT,
    brand TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE store_products ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this is a store demo)
CREATE POLICY "Public read access on store_products" 
ON store_products FOR SELECT 
USING (true);

-- Allow public inserts for seeding (can be removed later or keep if you want to add from UI)
CREATE POLICY "Public insert access on store_products" 
ON store_products FOR INSERT 
WITH CHECK (true);
