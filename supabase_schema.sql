-- BidForge Database Schema

-- 1. Profiles Table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT CHECK (role IN ('admin', 'bidder')) DEFAULT 'bidder',
  credits INTEGER DEFAULT 1000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Auctions Table
CREATE TABLE auctions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  min_bid INTEGER DEFAULT 0,
  current_bid INTEGER DEFAULT 0,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT CHECK (status IN ('active', 'completed', 'pending')) DEFAULT 'active',
  created_by UUID REFERENCES profiles(id),
  winner_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Bids Table
CREATE TABLE bids (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auction_id UUID REFERENCES auctions(id) ON DELETE CASCADE,
  bidder_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  bidder_email TEXT NOT NULL,
  amount INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Bidding Function (Atomic Transaction)
-- This function handles: checking credits, deducting credits, updating auction, and refunding previous bidder.
CREATE OR REPLACE FUNCTION place_bid_v2(
  p_auction_id UUID,
  p_bidder_id UUID,
  p_amount INTEGER
) RETURNS VOID AS $$
DECLARE
  v_current_bid INTEGER;
  v_min_bid INTEGER;
  v_previous_bidder_id UUID;
  v_previous_bid_amount INTEGER;
  v_bidder_credits INTEGER;
  v_auction_status TEXT;
  v_start_time TIMESTAMP WITH TIME ZONE;
  v_end_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- 1. Get auction details and lock row
  SELECT current_bid, min_bid, status, start_time, end_time, winner_id 
  INTO v_current_bid, v_min_bid, v_auction_status, v_start_time, v_end_time, v_previous_bidder_id
  FROM auctions 
  WHERE id = p_auction_id 
  FOR UPDATE;

  -- 2. Validations
  IF v_auction_status != 'active' THEN
    RAISE EXCEPTION 'Auction is not active';
  END IF;

  IF NOW() < v_start_time THEN
    RAISE EXCEPTION 'Auction has not started yet';
  END IF;

  IF NOW() > v_end_time THEN
    RAISE EXCEPTION 'Auction has ended';
  END IF;

  IF p_amount <= COALESCE(v_current_bid, v_min_bid) THEN
    RAISE EXCEPTION 'Bid must be higher than current bid';
  END IF;

  -- 3. Check bidder credits
  SELECT credits INTO v_bidder_credits FROM profiles WHERE id = p_bidder_id FOR UPDATE;
  IF v_bidder_credits < p_amount THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  -- 4. Refund previous bidder (if any and if different from current)
  -- Note: In this simple model, winner_id stores the current highest bidder
  IF v_previous_bidder_id IS NOT NULL THEN
    -- Find the last bid amount for this user on this auction
    SELECT amount INTO v_previous_bid_amount 
    FROM bids 
    WHERE auction_id = p_auction_id AND bidder_id = v_previous_bidder_id
    ORDER BY created_at DESC LIMIT 1;

    UPDATE profiles SET credits = credits + v_previous_bid_amount WHERE id = v_previous_bidder_id;
  END IF;

  -- 5. Deduct credits from new bidder
  UPDATE profiles SET credits = credits - p_amount WHERE id = p_bidder_id;

  -- 6. Update auction
  UPDATE auctions SET 
    current_bid = p_amount, 
    winner_id = p_bidder_id 
  WHERE id = p_auction_id;

  -- 7. Record bid
  INSERT INTO bids (auction_id, bidder_id, bidder_email, amount)
  VALUES (p_auction_id, p_bidder_id, (SELECT email FROM profiles WHERE id = p_bidder_id), p_amount);

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS (Row Level Security) Policies

-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Auctions
ALTER TABLE auctions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auctions are viewable by everyone" ON auctions FOR SELECT USING (true);
CREATE POLICY "Admins can insert auctions" ON auctions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update auctions" ON auctions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
-- Allow authenticated users to update auctions ONLY via the place_bid function (which is SECURITY DEFINER)
-- Or we can add a specific policy for the current_bid field, but RPC is cleaner.

-- Bids
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Bids are viewable by everyone" ON bids FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert bids" ON bids FOR INSERT WITH CHECK (auth.role() = 'authenticated');
