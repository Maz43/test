export type UserRole = 'admin' | 'bidder';

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  credits: number;
  promoted_by?: string;
  created_at: string;
}

export interface Auction {
  id: string;
  title: string;
  description: string;
  image_url: string;
  min_bid: number;
  current_bid: number;
  start_time: string;
  end_time: string;
  status: 'active' | 'completed' | 'pending';
  created_by: string;
  winner_id?: string;
  min_increment?: number;
  created_at: string;
}

export interface Bid {
  id: string;
  auction_id: string;
  bidder_id: string;
  bidder_email: string;
  amount: number;
  created_at: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  user_email: string;
  amount: number;
  type: 'admin_adjustment' | 'bid_lock' | 'bid_refund' | 'bid_win' | 'test_credit';
  reason?: string;
  created_at: string;
}

export interface CreditRequest {
  id: string;
  user_id: string;
  user_email: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  admin_note?: string;
  created_at: string;
}
