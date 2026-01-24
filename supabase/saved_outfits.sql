-- Saved Outfits Table
-- Stores generated outfits with public/private visibility and liked items

CREATE TABLE IF NOT EXISTS saved_outfits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    mood VARCHAR(50) NOT NULL,
    items JSONB NOT NULL, -- Array of item objects with 'liked' boolean field
    description TEXT, -- AI generated reason
    is_saved BOOLEAN DEFAULT false, -- false = history/generated, true = saved by user
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS saved_outfits_user_id_idx ON saved_outfits(user_id);
CREATE INDEX IF NOT EXISTS saved_outfits_is_public_idx ON saved_outfits(is_public);
CREATE INDEX IF NOT EXISTS saved_outfits_created_at_idx ON saved_outfits(created_at DESC);

-- Enable RLS
ALTER TABLE saved_outfits ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own outfits
CREATE POLICY "Users can view own outfits"
    ON saved_outfits FOR SELECT
    USING (auth.uid() = user_id);

-- Anyone can view public outfits
CREATE POLICY "Anyone can view public outfits"
    ON saved_outfits FOR SELECT
    USING (is_public = true);

-- Users can insert their own outfits
CREATE POLICY "Users can create own outfits"
    ON saved_outfits FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own outfits
CREATE POLICY "Users can update own outfits"
    ON saved_outfits FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own outfits
CREATE POLICY "Users can delete own outfits"
    ON saved_outfits FOR DELETE
    USING (auth.uid() = user_id);

-- Purchase Requests Table (for preloved items)
CREATE TABLE IF NOT EXISTS purchase_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES wardrobe_items(id) ON DELETE CASCADE,
    outfit_id UUID REFERENCES saved_outfits(id) ON DELETE SET NULL,
    seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    buyer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    offer_price DECIMAL(10, 2) NOT NULL,
    message TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, declined
    qilin_link TEXT, -- Link provided when seller accepts
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for purchase_requests
CREATE INDEX IF NOT EXISTS purchase_requests_seller_idx ON purchase_requests(seller_id);
CREATE INDEX IF NOT EXISTS purchase_requests_buyer_idx ON purchase_requests(buyer_id);
CREATE INDEX IF NOT EXISTS purchase_requests_status_idx ON purchase_requests(status);

-- Enable RLS
ALTER TABLE purchase_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for purchase_requests
CREATE POLICY "Sellers can view their requests"
    ON purchase_requests FOR SELECT
    USING (auth.uid() = seller_id);

CREATE POLICY "Buyers can view their requests"
    ON purchase_requests FOR SELECT
    USING (auth.uid() = buyer_id);

CREATE POLICY "Buyers can create requests"
    ON purchase_requests FOR INSERT
    WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Sellers can update requests"
    ON purchase_requests FOR UPDATE
    USING (auth.uid() = seller_id);
