-- Enable RLS on remaining sensitive tables
ALTER TABLE saved_outfits ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_requests ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- SAVED OUTFITS
-- ==========================================

-- Policy: Users can view their own saved outfits OR any public outfits
CREATE POLICY "Users can view own or public outfits"
ON saved_outfits FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR is_public = true);

-- Policy: Users can insert their own outfits
CREATE POLICY "Users can insert their own outfits"
ON saved_outfits FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own outfits
CREATE POLICY "Users can update their own outfits"
ON saved_outfits FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can delete their own outfits
CREATE POLICY "Users can delete their own outfits"
ON saved_outfits FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ==========================================
-- USER PROFILES
-- ==========================================

-- Policy: Profiles are viewable by everyone (for social features)
CREATE POLICY "Profiles are viewable by everyone"
ON user_profiles FOR SELECT
TO authenticated
USING (true);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
ON user_profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update own profile
CREATE POLICY "Users can update own profile"
ON user_profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- ==========================================
-- PURCHASE REQUESTS
-- ==========================================

-- Policy: Users can view requests if they are the buyer or seller
CREATE POLICY "Users view own purchase requests"
ON purchase_requests FOR SELECT
TO authenticated
USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Policy: Users can create requests as buyer
CREATE POLICY "Users can create purchase requests"
ON purchase_requests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = buyer_id);

-- Policy: Users can update requests if they are involved
CREATE POLICY "Users can update own purchase requests"
ON purchase_requests FOR UPDATE
TO authenticated
USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
