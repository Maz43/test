import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Gavel, 
  LayoutDashboard, 
  History, 
  LogOut, 
  Plus, 
  TrendingUp, 
  Users, 
  Clock, 
  Wallet,
  Search,
  Bell,
  Menu,
  X,
  Sparkles,
  ChevronRight,
  AlertCircle,
  Check,
  CheckCircle,
  Shield,
  Edit,
  Trash2,
  Trophy
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { getSupabase } from './lib/supabase';
import { socketService } from './services/socket';
import { generateAuctionDescription, getSmartBidSuggestion } from './services/gemini';
import { cn, formatCurrency, formatTimeRemaining } from './lib/utils';
import type { Profile, Auction, Bid, UserRole, CreditTransaction, CreditRequest } from './types';
import { formatDistanceToNow } from 'date-fns';

// --- Components ---

const Navbar = ({ 
  user, 
  profile, 
  onLogout,
  currentView,
  setCurrentView
}: { 
  user: any, 
  profile: Profile | null, 
  onLogout: () => void,
  currentView: string,
  setCurrentView: (view: any) => void
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center gap-2">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                <Gavel size={24} />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
                BidForge
              </span>
            </div>
            <div className="hidden sm:ml-8 sm:flex sm:space-x-4">
              <button 
                onClick={() => setCurrentView('auctions')}
                className={cn(
                  "px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                  currentView === 'auctions' ? "bg-gray-50 text-gray-900" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                )}
              >
                Auctions
              </button>
              {profile?.role === 'admin' && (
                <button 
                  onClick={() => setCurrentView('admin')}
                  className={cn(
                    "px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    currentView === 'admin' ? "bg-gray-50 text-gray-900" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                  )}
                >
                  Admin Panel
                </button>
              )}
              <button 
                onClick={() => setCurrentView('history')}
                className={cn(
                  "px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                  currentView === 'history' ? "bg-gray-50 text-gray-900" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                )}
              >
                History
              </button>
              <button 
                onClick={() => setCurrentView('profile')}
                className={cn(
                  "px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                  currentView === 'profile' ? "bg-gray-50 text-gray-900" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                )}
              >
                Profile
              </button>
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center gap-4">
            {profile && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                <Wallet size={16} />
                <span className="text-sm font-semibold">{profile.credits} Credits</span>
              </div>
            )}
            <div className="h-8 w-px bg-gray-200 mx-2" />
            <div className="flex items-center gap-3">
              <div className="text-right hidden lg:block">
                <p className="text-sm font-medium text-gray-900">{user?.email}</p>
                <p className="text-xs text-gray-500 capitalize">{profile?.role}</p>
              </div>
              <button 
                onClick={onLogout}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
          <div className="flex items-center sm:hidden">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

const AuctionCard = ({ auction, onBid }: { auction: Auction, onBid: (a: Auction) => void | Promise<void>, key?: React.Key }) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 500);
    return () => clearInterval(timer);
  }, []);

  const startTime = new Date(auction.start_time);
  const endTime = new Date(auction.end_time);
  
  const hasStarted = now >= startTime;
  const isEnded = now >= endTime || auction.status === 'completed';
  const isLive = hasStarted && !isEnded && auction.status === 'active';
  const isUpcoming = !hasStarted && auction.status === 'active';
  
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300"
    >
      <div className="relative h-48 overflow-hidden">
        <img 
          src={(auction.image_url && auction.image_url.trim() !== "") ? auction.image_url : `https://picsum.photos/seed/${auction.id}/800/600`} 
          alt={auction.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-3 left-3">
          <span className={cn(
            "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm",
            isEnded ? "bg-gray-900 text-white" : 
            isUpcoming ? "bg-amber-500 text-white" :
            "bg-indigo-600 text-white"
          )}>
            {isEnded ? "Ended" : isUpcoming ? "Upcoming" : "Live"}
          </span>
        </div>
        {!isEnded && (
          <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur px-2 py-1 rounded-lg flex items-center gap-1.5 text-xs font-medium text-gray-900 shadow-sm">
            <Clock size={14} className={isUpcoming ? "text-amber-500" : "text-indigo-600"} />
            {isUpcoming ? (
              <span>Starts in {formatTimeRemaining(startTime, now)}</span>
            ) : (
              <span>{formatTimeRemaining(endTime, now)} left</span>
            )}
          </div>
        )}
      </div>
      <div className="p-5">
        <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors line-clamp-1">
          {auction.title}
        </h3>
        <p className="text-sm text-gray-500 line-clamp-2 mb-4 h-10">
          {auction.description}
        </p>
        
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Current Bid</p>
            <p className="text-xl font-black text-indigo-600">{formatCurrency(auction.current_bid || auction.min_bid)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Min Bid</p>
            <p className="text-sm font-semibold text-gray-600">{formatCurrency(auction.min_bid)}</p>
          </div>
        </div>

        <button 
          onClick={() => onBid(auction)}
          disabled={!isLive}
          className={cn(
            "w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all",
            !isLive 
              ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
              : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 active:scale-[0.98]"
          )}
        >
          {isEnded ? "Auction Closed" : isUpcoming ? "Not Started" : "Place Bid"}
          {isLive && <ChevronRight size={18} />}
        </button>
      </div>
    </motion.div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [creditRequests, setCreditRequests] = useState<CreditRequest[]>([]);
  const [userBids, setUserBids] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentView, setCurrentView] = useState<'auctions' | 'admin' | 'history' | 'profile'>('auctions');
  const [adminTab, setAdminTab] = useState<'users' | 'auctions' | 'transactions' | 'requests' | 'danger'>('users');
  const [configError, setConfigError] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('bidder');
  
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [suggestions, setSuggestions] = useState<number[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [bidSuccess, setBidSuccess] = useState(false);

  const [requestAmount, setRequestAmount] = useState<number>(500);
  const [editingRequest, setEditingRequest] = useState<CreditRequest | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [adminAdjustedAmount, setAdminAdjustedAmount] = useState<number>(0);

  // Admin states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAuctionId, setEditingAuctionId] = useState<string | null>(null);
  const [newAuction, setNewAuction] = useState({
    title: '',
    description: '',
    min_bid: 0,
    min_increment: 1,
    start_time: new Date().toISOString().slice(0, 16),
    end_time: '',
    image_url: ''
  });

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let subscription: any = null;

    const init = async () => {
      try {
        const supabase = getSupabase();
        
        // Listen for auth changes
        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
          if (session?.user) {
            setUser(session.user);
            fetchProfile(session.user.id);
          } else {
            setUser(null);
            setProfile(null);
          }
        });
        subscription = data.subscription;

        await checkUser();
        await fetchAuctions();
        if (profile?.role === 'admin') {
          await fetchCreditRequests();
        }
      } catch (e: any) {
        console.error("Initialization error:", e);
        if (e.message === 'Failed to fetch') {
          setConfigError("Network Error: 'Failed to fetch'. This usually means the Supabase URL is incorrect or the database is unreachable. Please verify your VITE_SUPABASE_URL in the Secrets panel.");
        } else {
          setConfigError(e.message);
        }
        setLoading(false);
      }
    };
    
    init();
    
    const socket = socketService.connect();
    socketService.onBidUpdate((data) => {
      setAuctions(prev => {
        const auction = prev.find(a => a.id === data.auctionId);
        // If the current user was the winner before this update, and someone else bid
        if (auction && auction.winner_id === profile?.id && data.bidderId !== profile?.id) {
          toast.error(`You've been outbid on "${auction.title}"!`, {
            description: `New bid: ${formatCurrency(data.amount)}. Place a higher bid to stay in the lead!`,
            duration: 5000,
          });
        }
        
        return prev.map(a => 
          a.id === data.auctionId ? { ...a, current_bid: data.amount, winner_id: data.bidderId } : a
        );
      });
      
      if (selectedAuction?.id === data.auctionId) {
        setSelectedAuction(prev => prev ? { ...prev, current_bid: data.amount, winner_id: data.bidderId } : null);
      }
    });

    socketService.onOutbid((data) => {
      // This is a fallback or more direct notification if the server logic is refined
      // For now, the logic inside onBidUpdate handles it more precisely using local state
    });

    return () => {
      if (subscription) subscription.unsubscribe();
      socketService.disconnect();
    };
  }, []);

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchAllProfiles();
      fetchTransactions();
      fetchCreditRequests();
    }
    if (user) {
      fetchUserBids();
    }
  }, [profile, user]);

  const fetchProfile = async (userId: string) => {
    try {
      const { data: existingProfile, error } = await getSupabase()
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching profile:", error);
        return;
      }

      if (existingProfile) {
        setProfile(existingProfile);
      } else {
        // If profile doesn't exist yet (trigger might be slow), retry once
        setTimeout(async () => {
          const { data: retryProfile } = await getSupabase()
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();
          if (retryProfile) setProfile(retryProfile);
        }, 1500);
      }
    } catch (e) {
      console.error("Profile fetch failed", e);
    }
  };

  const checkUser = async () => {
    try {
      const { data: { user } } = await getSupabase().auth.getUser();
      if (user) {
        setUser(user);
        await fetchProfile(user.id);
      }
    } catch (e) {
      console.error("Auth check failed", e);
    }
    setLoading(false);
  };

  const fetchAuctions = async () => {
    try {
      const { data, error } = await getSupabase()
        .from('auctions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (data) {
        const nowTime = new Date();
        const expiredAuctions = data.filter(a => a.status === 'active' && new Date(a.end_time) <= nowTime);
        
        if (expiredAuctions.length > 0) {
          const supabase = getSupabase();
          for (const a of expiredAuctions) {
            await supabase.from('auctions').update({ status: 'completed' }).eq('id', a.id);
          }
          const { data: refreshedData } = await supabase
            .from('auctions')
            .select('*')
            .order('created_at', { ascending: false });
          setAuctions(refreshedData || []);
        } else {
          setAuctions(data);
        }
      }
    } catch (e: any) {
      console.error("Fetch auctions failed", e);
      toast.error("Failed to load auctions", {
        description: e.message === 'Failed to fetch' 
          ? "Network error. Please check your Supabase URL and connection." 
          : e.message
      });
    }
  };

  const fetchAllProfiles = async () => {
    if (profile?.role !== 'admin') return;
    try {
      const { data, error } = await getSupabase()
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (data) setAllProfiles(data);
    } catch (e: any) {
      console.error("Fetch profiles failed", e);
    }
  };

  const fetchTransactions = async () => {
    if (profile?.role !== 'admin') return;
    try {
      const { data, error } = await getSupabase()
        .from('credit_transactions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (data) setTransactions(data);
    } catch (e: any) {
      console.error("Fetch transactions failed", e);
    }
  };

  const fetchCreditRequests = async () => {
    if (profile?.role !== 'admin') return;
    try {
      const { data, error } = await getSupabase()
        .from('credit_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (data) setCreditRequests(data);
    } catch (e: any) {
      console.error("Fetch credit requests failed", e);
    }
  };

  const fetchUserBids = async () => {
    if (!user) return;
    try {
      const { data, error } = await getSupabase()
        .from('bids')
        .select(`
          *,
          auction:auctions(*)
        `)
        .eq('bidder_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (data) {
        // Filter to show unique auctions (latest bid per auction)
        const uniqueBids = data.reduce((acc: any[], current: any) => {
          const x = acc.find(item => item.auction_id === current.auction_id);
          if (!x) {
            return acc.concat([current]);
          } else {
            return acc;
          }
        }, []);
        setUserBids(uniqueBids);
      }
    } catch (e: any) {
      console.error("Fetch user bids failed", e);
      toast.error("Failed to load your bidding history");
    }
  };

  const logTransaction = async (userId: string, userEmail: string, amount: number, type: CreditTransaction['type'], reason?: string) => {
    try {
      const { error } = await getSupabase()
        .from('credit_transactions')
        .insert({
          user_id: userId,
          user_email: userEmail,
          amount,
          type,
          reason
        });
      if (error) {
        console.warn("Failed to log transaction to DB (table might not exist):", error.message);
      }
    } catch (e) {
      console.error("Log transaction failed", e);
    }
  };

  useEffect(() => {
    if (currentView === 'admin' && profile?.role === 'admin') {
      fetchAllProfiles();
      fetchTransactions();
    }
    if (currentView === 'history' && user) {
      fetchUserBids();
    }
  }, [currentView, profile, user]);

  const filteredAuctions = auctions.filter(a => 
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    totalUsers: 1284, // In a real app, we'd fetch this
    activeAuctions: auctions.filter(a => a.status === 'active' && new Date(a.end_time) > new Date()).length,
    totalBids: auctions.reduce((acc, a) => acc + (a.current_bid ? 1 : 0), 0), // Simplified
    revenue: auctions.reduce((acc, a) => acc + (a.status === 'completed' ? a.current_bid : 0), 0)
  };

  const handleUpdateCredits = async (userId: string, newCredits: number) => {
    try {
      const targetUser = allProfiles.find(p => p.id === userId);
      const oldCredits = targetUser?.credits || 0;
      const diff = newCredits - oldCredits;

      const { error } = await getSupabase()
        .from('profiles')
        .update({ credits: newCredits })
        .eq('id', userId);
      if (error) throw error;

      await logTransaction(userId, targetUser?.email || 'unknown', diff, 'admin_adjustment', `Admin adjustment from ${oldCredits} to ${newCredits}`);

      await fetchAllProfiles();
      await fetchTransactions();
      if (userId === profile?.id) {
        await fetchProfile(userId);
      }
      toast.success("Credits updated successfully!");
    } catch (e: any) {
      console.error("Update credits failed", e);
      toast.error("Failed to update credits: " + e.message);
    }
  };

  const handleToggleRole = async (userId: string, currentRole: UserRole) => {
    if (profile?.role !== 'admin' || !user) return;
    const targetProfile = allProfiles.find(p => p.id === userId);
    const newRole: UserRole = currentRole === 'admin' ? 'bidder' : 'admin';
    
    if (currentRole === 'admin' && newRole === 'bidder') {
      // Protection: You cannot demote the person who promoted you
      if (profile.promoted_by === userId) {
        toast.error("Security Alert: You cannot demote the admin who granted you your privileges!");
        return;
      }

      // Protection: The Admin who made another admin cannot remove that admin (as requested)
      if (targetProfile?.promoted_by === user.id) {
        toast.error("Policy: You cannot demote an admin that you personally promoted.");
        return;
      }
    }

    if (userId === user.id && currentRole === 'admin') {
      if (!window.confirm("Are you sure you want to remove your own admin privileges? You will lose access to this dashboard.")) {
        return;
      }
    }

    try {
      const updateData: any = { role: newRole };
      
      // Check if promoted_by column exists in our local state before trying to update it
      const hasPromotedByColumn = allProfiles.length > 0 && 'promoted_by' in allProfiles[0];

      if (hasPromotedByColumn) {
        // If promoting to admin, record who did it
        if (newRole === 'admin') {
          updateData.promoted_by = user.id;
        } else {
          // If demoting, clear the record
          updateData.promoted_by = null;
        }
      }

      const { error } = await getSupabase()
        .from('profiles')
        .update(updateData)
        .eq('id', userId);
      
      if (error) {
        if (error.message.includes('promoted_by')) {
          toast.error("Database Update Required: Please run the SQL command to add the 'promoted_by' column to the 'profiles' table.");
          // Fallback: try updating without promoted_by
          const { error: retryError } = await getSupabase()
            .from('profiles')
            .update({ role: newRole })
            .eq('id', userId);
          if (retryError) throw retryError;
        } else {
          throw error;
        }
      }
      
      toast.success(`User role updated to ${newRole}`);
      fetchAllProfiles();
      if (userId === user.id) {
        fetchProfile(userId);
      }
    } catch (e: any) {
      console.error("Toggle role failed", e);
      toast.error("Failed to update role: " + e.message);
    }
  };

  const handleRequestCredits = async () => {
    if (!user || !profile) return;
    
    if (requestAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setLoading(true);
    try {
      const { error } = await getSupabase()
        .from('credit_requests')
        .insert({
          user_id: user.id,
          user_email: user.email,
          amount: requestAmount,
          status: 'pending'
        });
      
      if (error) throw error;
      
      toast.success("Credit request submitted!", {
        description: "An admin will review your request shortly.",
      });
    } catch (e: any) {
      console.error("Credit request failed", e);
      toast.error("Failed to submit request: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (request: CreditRequest, finalAmount: number, note: string) => {
    if (profile?.role !== 'admin') return;
    
    setLoading(true);
    try {
      const supabase = getSupabase();
      
      const { error: updateError } = await supabase
        .from('credit_requests')
        .update({ 
          status: 'approved',
          amount: finalAmount,
          admin_note: note
        })
        .eq('id', request.id);
      
      if (updateError) throw updateError;
      
      const { data: targetProfile, error: profileError } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', request.user_id)
        .single();
      
      if (profileError) throw profileError;
      
      const { error: creditError } = await supabase
        .from('profiles')
        .update({ credits: (targetProfile?.credits || 0) + finalAmount })
        .eq('id', request.user_id);
      
      if (creditError) throw creditError;
      
      await logTransaction(request.user_id, request.user_email, finalAmount, 'admin_adjustment', `Approved credit request: ${request.id}. Note: ${note}`);
      
      toast.success("Request approved!");
      fetchCreditRequests();
      fetchAllProfiles();
      setEditingRequest(null);
    } catch (e: any) {
      console.error("Approval failed", e);
      toast.error("Failed to approve: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequest = async (requestId: string, note: string) => {
    if (profile?.role !== 'admin') return;
    
    setLoading(true);
    try {
      const { error } = await getSupabase()
        .from('credit_requests')
        .update({ 
          status: 'rejected',
          admin_note: note
        })
        .eq('id', requestId);
      
      if (error) throw error;
      
      toast.success("Request rejected");
      fetchCreditRequests();
      setEditingRequest(null);
    } catch (e: any) {
      console.error("Rejection failed", e);
      toast.error("Failed to reject: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllUserData = async () => {
    if (profile?.role !== 'admin') return;
    
    const confirmDelete = window.confirm("CRITICAL WARNING: This will delete ALL user profiles, bids, transactions, and requests. This action CANNOT be undone. Are you absolutely sure?");
    if (!confirmDelete) return;

    const doubleConfirm = window.confirm("FINAL WARNING: You are about to wipe the entire user database. All users (except potentially yourself if the trigger handles it) will lose their data. Proceed?");
    if (!doubleConfirm) return;

    setLoading(true);
    try {
      const supabase = getSupabase();
      
      // Delete in order to respect potential foreign keys
      // 1. Bids (references auctions and profiles)
      const { error: bidsError } = await supabase.from('bids').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (bidsError) console.warn("Bids deletion error:", bidsError);

      // 2. Auctions (references profiles)
      const { error: auctionsError } = await supabase.from('auctions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (auctionsError) console.warn("Auctions deletion error:", auctionsError);

      // 3. Transactions
      const { error: transError } = await supabase.from('credit_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (transError) console.warn("Transactions deletion error:", transError);

      // 4. Requests
      const { error: reqError } = await supabase.from('credit_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (reqError) console.warn("Requests deletion error:", reqError);

      // 5. Profiles (Keep the current admin)
      const { error: profError } = await supabase.from('profiles').delete().neq('id', profile.id);
      if (profError) throw profError;

      toast.success("Database Wiped", {
        description: "All user data (except your own profile) has been deleted.",
      });
      
      // Refresh all data
      fetchAllProfiles();
      fetchTransactions();
      fetchCreditRequests();
      fetchAuctions();
    } catch (e: any) {
      console.error("Database wipe failed", e);
      toast.error("Failed to wipe database: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const supabase = getSupabase();
      if (authMode === 'register') {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user) {
          // The database trigger 'handle_new_user' automatically creates 
          // the profile in the 'profiles' table upon signup.
          // We just need to fetch it.
          await fetchProfile(data.user.id);
          setUser(data.user);
        }
      } else {
        console.log("Attempting sign in with", email);
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          console.error("Sign in error:", error);
          throw error;
        }
        console.log("Sign in successful, user:", data.user);
        if (data.user) {
          setUser(data.user);
          await fetchProfile(data.user.id);
        }
      }
      setShowAuth(false);
    } catch (error: any) {
      console.error("Auth error:", error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await getSupabase().auth.signOut();
      setUser(null);
      setProfile(null);
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  const handlePlaceBid = async () => {
    if (!selectedAuction || !profile) return;
    
    // Client-side validations
    const minRequired = (selectedAuction.current_bid || selectedAuction.min_bid) + (selectedAuction.min_increment || 1);
    if (bidAmount < minRequired) {
      toast.error(`Minimum bid is ${formatCurrency(minRequired)}`);
      return;
    }
    if (profile.credits < bidAmount) {
      toast.error("Insufficient credits");
      return;
    }
    if (new Date(selectedAuction.end_time) < new Date()) {
      toast.error("Auction has already ended");
      return;
    }
    if (profile.role === 'admin' && selectedAuction.created_by === profile.id) {
      toast.error("Admins cannot bid on their own auctions");
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabase();
      
      // Use the atomic RPC function
      const { error: rpcError } = await supabase.rpc('place_bid_v2', {
        p_auction_id: selectedAuction.id,
        p_bidder_id: profile.id,
        p_amount: bidAmount
      });

      if (rpcError) {
        throw rpcError;
      }

      // Update local profile credits
      await fetchProfile(profile.id);
      
      // Update auctions list
      await fetchAuctions();

      // Notify via socket
      socketService.placeBid({
        auctionId: selectedAuction.id,
        bidderId: profile.id,
        amount: bidAmount,
        bidderEmail: profile.email
      });

      setBidSuccess(true);
      setTimeout(() => {
        setSelectedAuction(null);
        setBidSuccess(false);
      }, 3500);
    } catch (e: any) {
      console.error("Bidding error:", e);
      alert("Failed to place bid: " + (e.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const openBidModal = async (auction: Auction) => {
    setSelectedAuction(auction);
    setBidAmount((auction.current_bid || auction.min_bid) + 10);
    setIsAiLoading(true);
    const aiSuggestions = await getSmartBidSuggestion(auction.current_bid || auction.min_bid, auction.min_bid);
    setSuggestions(aiSuggestions);
    setIsAiLoading(false);
    socketService.joinAuction(auction.id);
  };

  const handleGenerateDescription = async () => {
    if (!newAuction.title) return;
    setIsAiLoading(true);
    const desc = await generateAuctionDescription(newAuction.title, "General");
    setNewAuction(prev => ({ ...prev, description: desc }));
    setIsAiLoading(false);
  };

  const handleUpdateAuction = async (id: string, updates: any) => {
    if (!profile || profile.role !== 'admin') return;
    try {
      const { error } = await getSupabase().from('auctions').update(updates).eq('id', id);
      if (error) throw error;
      fetchAuctions();
      toast.success("Auction updated successfully!");
    } catch (e: any) {
      console.error("Update auction failed", e);
      toast.error("Failed to update auction: " + e.message);
    }
  };

  const handleDeleteAuction = async (id: string) => {
    if (!profile || profile.role !== 'admin') return;
    if (!confirm("Are you sure you want to delete this auction? This will also delete all associated bids.")) return;
    try {
      const { error } = await getSupabase().from('auctions').delete().eq('id', id);
      if (error) throw error;
      fetchAuctions();
    } catch (e: any) {
      console.error("Delete auction failed", e);
      alert("Failed to delete auction: " + e.message);
    }
  };

  const handleCloseAuction = async (id: string) => {
    if (!profile || profile.role !== 'admin') return;
    if (!confirm("Are you sure you want to manually close this auction and declare the current highest bidder as the winner?")) return;
    try {
      const { error } = await getSupabase()
        .from('auctions')
        .update({ status: 'completed', end_time: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      fetchAuctions();
      alert("Auction closed successfully!");
    } catch (e: any) {
      console.error("Close auction failed", e);
      alert("Failed to close auction: " + e.message);
    }
  };

  const handleCreateAuction = async () => {
    if (!profile || profile.role !== 'admin') return;
    
    if (new Date(newAuction.end_time) <= new Date(newAuction.start_time)) {
      toast.error("End time must be after start time");
      return;
    }

    try {
      const { error } = await getSupabase().from('auctions').insert({
        ...newAuction,
        current_bid: newAuction.min_bid,
        status: 'active',
        created_by: profile.id
      });
      if (error) throw error;
      
      setShowCreateModal(false);
      fetchAuctions();
      toast.success("Auction created successfully!");
    } catch (e: any) {
      console.error("Create auction failed", e);
      toast.error("Failed to create auction: " + e.message);
    }
  };

  if (configError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-red-100">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-4">Setup Required</h2>
          <p className="text-gray-600 mb-8 leading-relaxed">
            {configError}
          </p>
          <div className="bg-gray-50 rounded-2xl p-4 text-left mb-8">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Required Variables:</p>
            <ul className="space-y-1">
              <li className="text-sm font-mono text-gray-600">VITE_SUPABASE_URL</li>
              <li className="text-sm font-mono text-gray-600">VITE_SUPABASE_ANON_KEY</li>
            </ul>
          </div>
          <p className="text-sm text-gray-400">
            Please add these to your environment variables in the Secrets panel.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-medium animate-pulse">Forging your experience...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="relative overflow-hidden bg-indigo-900 text-white py-24 lg:py-32">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.5),transparent_50%)]" />
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="lg:grid lg:grid-cols-2 lg:gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
              >
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-12 h-12 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center border border-white/20">
                    <Gavel size={28} className="text-indigo-400" />
                  </div>
                  <span className="text-2xl font-black tracking-tight">BidForge</span>
                </div>
                <h1 className="text-5xl lg:text-7xl font-black mb-6 leading-tight">
                  The Future of <br />
                  <span className="text-indigo-400">Real-Time</span> Auctions
                </h1>
                <p className="text-xl text-indigo-100 mb-10 max-w-lg leading-relaxed">
                  Experience the thrill of live bidding with credit-based systems, AI-powered insights, and instant updates.
                </p>
                <div className="flex flex-wrap gap-4">
                  <button 
                    onClick={() => { setAuthMode('register'); setShowAuth(true); }}
                    className="px-8 py-4 bg-white text-indigo-900 rounded-2xl font-bold text-lg hover:bg-indigo-50 transition-all shadow-xl shadow-indigo-500/20 active:scale-95"
                  >
                    Get Started Free
                  </button>
                  <button 
                    onClick={() => { setAuthMode('login'); setShowAuth(true); }}
                    className="px-8 py-4 bg-indigo-800 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all border border-indigo-700 active:scale-95"
                  >
                    Sign In
                  </button>
                </div>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="hidden lg:block relative"
              >
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-indigo-500/20 border border-indigo-500/30" />
                      <div>
                        <div className="w-24 h-3 bg-white/20 rounded-full mb-2" />
                        <div className="w-16 h-2 bg-white/10 rounded-full" />
                      </div>
                    </div>
                    <div className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-full text-sm font-bold border border-emerald-500/30">
                      Live Bidding
                    </div>
                  </div>
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                            <TrendingUp size={20} />
                          </div>
                          <div>
                            <div className="w-32 h-3 bg-white/10 rounded-full mb-2" />
                            <div className="w-20 h-2 bg-white/5 rounded-full" />
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="w-16 h-4 bg-indigo-400/20 rounded-full mb-1" />
                          <div className="w-12 h-2 bg-white/5 rounded-full ml-auto" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showAuth && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAuth(false)}
                className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
              >
                <div className="p-8">
                  <div className="text-center mb-8">
                    <h2 className="text-3xl font-black text-gray-900 mb-2">
                      {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
                    </h2>
                    <p className="text-gray-500">
                      {authMode === 'login' ? 'Sign in to start bidding' : 'Join the elite auction community'}
                    </p>
                  </div>
                  <form onSubmit={handleAuth} className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Email Address</label>
                      <input 
                        type="email" 
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                        placeholder="name@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Password</label>
                      <input 
                        type="password" 
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                        placeholder="••••••••"
                      />
                    </div>
                    {authMode === 'register' && (
                      <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                        <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1">Account Type</p>
                        <p className="text-sm text-indigo-700 font-medium">Standard Bidder Account</p>
                        <p className="text-[10px] text-indigo-400 mt-1 italic">Admin privileges must be granted by an existing administrator.</p>
                      </div>
                    )}
                    <button 
                      type="submit"
                      disabled={loading}
                      className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] mt-4"
                    >
                      {loading ? 'Processing...' : (authMode === 'login' ? 'Sign In' : 'Create Account')}
                    </button>
                  </form>
                  <div className="mt-6 text-center">
                    <button 
                      onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                      className="text-sm font-bold text-indigo-600 hover:text-indigo-700"
                    >
                      {authMode === 'login' ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <Toaster position="top-right" richColors />
      <Navbar 
        user={user} 
        profile={profile} 
        onLogout={handleLogout}
        currentView={currentView}
        setCurrentView={setCurrentView}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h2 className="text-3xl font-black text-gray-900">
              {currentView === 'admin' ? 'Admin Dashboard' : currentView === 'history' ? 'My Bidding History' : currentView === 'profile' ? 'My Profile' : 'Active Auctions'}
            </h2>
            <p className="text-gray-500 mt-1">
              {currentView === 'admin' 
                ? 'Manage your platform and monitor live activity' 
                : currentView === 'history'
                ? 'Track your past bids and won items'
                : currentView === 'profile'
                ? 'Manage your account settings and credits'
                : 'Browse and bid on exclusive items in real-time'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {profile?.role === 'admin' && currentView === 'admin' && (
              <button 
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
              >
                <Plus size={20} />
                New Auction
              </button>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search auctions..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none w-full md:w-64 shadow-sm"
              />
            </div>
          </div>
        </div>

        {currentView === 'admin' && profile?.role === 'admin' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              {[
                { label: 'Total Users', value: allProfiles.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Active Auctions', value: stats.activeAuctions, icon: Gavel, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                { label: 'Total Bids', value: stats.totalBids, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Projected Revenue', value: formatCurrency(stats.revenue), icon: Wallet, color: 'text-amber-600', bg: 'bg-amber-50' },
              ].map((stat, i) => (
                <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className={cn("p-3 rounded-xl", stat.bg, stat.color)}>
                      <stat.icon size={24} />
                    </div>
                  </div>
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">{stat.label}</p>
                  <p className="text-2xl font-black text-gray-900 mt-1">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4 mb-6">
              {[
                { id: 'users', label: 'Users', icon: Users },
                { id: 'auctions', label: 'Auctions', icon: Gavel },
                { id: 'transactions', label: 'Credit Transactions', icon: Wallet },
                { id: 'requests', label: 'Credit Requests', icon: Bell },
                { id: 'danger', label: 'Danger Zone', icon: AlertCircle },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setAdminTab(tab.id as any)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all",
                    adminTab === tab.id 
                      ? (tab.id === 'danger' ? "bg-red-600 text-white shadow-lg shadow-red-100" : "bg-indigo-600 text-white shadow-lg shadow-indigo-100")
                      : "bg-white text-gray-500 hover:bg-gray-50 border border-gray-100"
                  )}
                >
                  <tab.icon size={18} />
                  {tab.label}
                </button>
              ))}
            </div>

            {adminTab === 'users' ? (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mb-10">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                  <h3 className="text-xl font-black text-gray-900">User Management</h3>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{allProfiles.length} Total Users</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-50/50">
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">User</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Role</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Credits</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {allProfiles.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                                {p.email[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-gray-900">{p.email}</p>
                                <p className="text-xs text-gray-400">ID: {p.id.slice(0, 8)}...</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                              p.role === 'admin' ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                            )}>
                              {p.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono font-bold text-gray-900">
                            {formatCurrency(p.credits)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => handleToggleRole(p.id, p.role)}
                                className={cn(
                                  "p-2 rounded-lg transition-all",
                                  p.role === 'admin' ? "text-amber-600 hover:bg-amber-50" : "text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"
                                )}
                                title={p.role === 'admin' ? "Revoke Admin" : "Grant Admin"}
                              >
                                <Shield size={18} />
                              </button>
                              <button 
                                onClick={() => {
                                  const amount = prompt("Enter amount to ADD (positive) or TAKE (negative):", "0");
                                  if (amount !== null) {
                                    const diff = parseInt(amount);
                                    if (!isNaN(diff)) {
                                      handleUpdateCredits(p.id, p.credits + diff);
                                    }
                                  }
                                }}
                                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                title="Adjust Credits"
                              >
                                <Wallet size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : adminTab === 'auctions' ? (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mb-10">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                  <h3 className="text-xl font-black text-gray-900">Auction Management</h3>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{auctions.length} Total Auctions</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-50/50">
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Auction</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Bids</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">End Time</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {auctions.map((a) => (
                        <tr key={a.id} className="hover:bg-gray-50/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <img src={(a.image_url && a.image_url.trim() !== "") ? a.image_url : `https://picsum.photos/seed/${a.id}/100/100`} className="w-10 h-10 rounded-lg object-cover" referrerPolicy="no-referrer" />
                              <div>
                                <p className="font-bold text-gray-900">{a.title}</p>
                                <p className="text-xs text-gray-400">Min: {formatCurrency(a.min_bid)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                              a.status === 'active' ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"
                            )}>
                              {a.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono font-bold text-gray-900">
                            {formatCurrency(a.current_bid)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {new Date(a.end_time).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {a.status === 'active' && (
                                <button 
                                  onClick={() => handleCloseAuction(a.id)}
                                  title="Close Auction"
                                  className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                >
                                  <CheckCircle size={18} />
                                </button>
                              )}
                              <button 
                                onClick={() => {
                                  setEditingAuctionId(a.id);
                                  setNewAuction({
                                    title: a.title,
                                    description: a.description,
                                    min_bid: a.min_bid,
                                    start_time: new Date(a.start_time).toISOString().slice(0, 16),
                                    end_time: new Date(a.end_time).toISOString().slice(0, 16),
                                    image_url: a.image_url
                                  });
                                  setShowCreateModal(true);
                                }}
                                title="Edit Auction"
                                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                              >
                                <Edit size={18} />
                              </button>
                              <button 
                                onClick={() => handleDeleteAuction(a.id)}
                                title="Delete Auction"
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : adminTab === 'requests' ? (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mb-10">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                  <h3 className="text-xl font-black text-gray-900">Credit Requests</h3>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{creditRequests.filter(r => r.status === 'pending').length} Pending</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-50/50">
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">User</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Amount</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Date</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {creditRequests.map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50/30 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-bold text-gray-900">{r.user_email}</p>
                            <p className="text-xs text-gray-400 font-mono">{r.user_id}</p>
                            {r.admin_note && (
                              <p className="text-xs text-indigo-500 mt-1 italic">Note: {r.admin_note}</p>
                            )}
                          </td>
                          <td className="px-6 py-4 font-mono font-bold text-indigo-600">
                            +{formatCurrency(r.amount)}
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                              r.status === 'pending' ? "bg-amber-50 text-amber-600" :
                              r.status === 'approved' ? "bg-emerald-50 text-emerald-600" :
                              "bg-red-50 text-red-600"
                            )}>
                              {r.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-400">
                            {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {r.status === 'pending' && (
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => {
                                    setEditingRequest(r);
                                    setAdminAdjustedAmount(r.amount);
                                    setAdminNote('');
                                  }}
                                  className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                  title="Review Request"
                                >
                                  <Edit size={18} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                      {creditRequests.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
                            No credit requests found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : adminTab === 'danger' ? (
              <div className="bg-white rounded-3xl border-2 border-red-100 shadow-sm overflow-hidden mb-10">
                <div className="p-8 text-center">
                  <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertCircle size={40} />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2">Danger Zone</h3>
                  <p className="text-gray-500 max-w-md mx-auto mb-10">
                    These actions are destructive and cannot be undone. Please proceed with extreme caution.
                  </p>
                  
                  <div className="max-w-xl mx-auto p-6 bg-red-50 rounded-2xl border border-red-100 text-left">
                    <h4 className="font-bold text-red-900 mb-2 flex items-center gap-2">
                      <Trash2 size={18} />
                      Wipe User Database
                    </h4>
                    <p className="text-sm text-red-700 mb-6">
                      This will delete all user profiles (except yours), all bids, all credit transactions, and all credit requests. This is typically used for resetting the app for a new testing phase.
                    </p>
                    <button 
                      onClick={handleDeleteAllUserData}
                      disabled={loading}
                      className="w-full py-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading ? 'Processing...' : 'Delete All User Data'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mb-10">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                  <h3 className="text-xl font-black text-gray-900">Credit Transactions</h3>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{transactions.length} Total Logs</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-50/50">
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Date</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">User</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Type</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Amount</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {transactions.map((t) => (
                        <tr key={t.id} className="hover:bg-gray-50/30 transition-colors">
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {new Date(t.created_at).toLocaleString()}
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-bold text-gray-900">{t.user_email}</p>
                            <p className="text-[10px] text-gray-400">ID: {t.user_id.slice(0, 8)}...</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                              t.type === 'admin_adjustment' ? "bg-amber-50 text-amber-600" : 
                              t.type === 'test_credit' ? "bg-emerald-50 text-emerald-600" : "bg-gray-50 text-gray-600"
                            )}>
                              {t.type.replace('_', ' ')}
                            </span>
                          </td>
                          <td className={cn(
                            "px-6 py-4 font-mono font-bold",
                            t.amount >= 0 ? "text-emerald-600" : "text-red-600"
                          )}>
                            {t.amount >= 0 ? '+' : ''}{formatCurrency(t.amount)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 italic">
                            {t.reason || '-'}
                          </td>
                        </tr>
                      ))}
                      {transactions.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-10 text-center text-gray-400 italic">
                            No transactions logged yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {currentView === 'history' ? (
            <div className="col-span-full space-y-6">
              {userBids.length === 0 ? (
                <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                  <History size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 font-medium">You haven't placed any bids yet.</p>
                  <button 
                    onClick={() => setCurrentView('auctions')}
                    className="mt-4 text-indigo-600 font-bold hover:underline"
                  >
                    Start bidding now
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {userBids.map((bid) => {
                    const auction = bid.auction;
                    const isWinning = auction.current_bid === bid.amount;
                    const isCompleted = auction.status === 'completed';
                    const isWinner = auction.winner_id === user?.id;

                    return (
                      <motion.div 
                        key={bid.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center gap-6"
                      >
                        <div className="w-full sm:w-32 h-24 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                          <img 
                            src={(auction.image_url && auction.image_url.trim() !== "") ? auction.image_url : `https://picsum.photos/seed/${auction.id}/400/300`} 
                            alt={auction.title}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-gray-900 truncate">{auction.title}</h4>
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                              isCompleted 
                                ? (isWinner ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")
                                : (isWinning ? "bg-indigo-100 text-indigo-700" : "bg-amber-100 text-amber-700")
                            )}>
                              {isCompleted 
                                ? (isWinner ? "Won" : "Lost")
                                : (isWinning ? "Winning" : "Outbid")}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 line-clamp-1 mb-2">{auction.description}</p>
                          <div className="flex items-center gap-4 text-xs font-medium text-gray-400">
                            <div className="flex items-center gap-1">
                              <Clock size={14} />
                              {isCompleted ? 'Ended' : formatDistanceToNow(new Date(auction.end_time), { addSuffix: true })}
                            </div>
                            <div className="flex items-center gap-1">
                              <TrendingUp size={14} />
                              Your Bid: <span className="text-gray-900 font-bold">{formatCurrency(bid.amount)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Current Price</p>
                            <p className="text-xl font-black text-gray-900">{formatCurrency(auction.current_bid)}</p>
                          </div>
                          {!isCompleted && !isWinning && (
                            <button 
                              onClick={() => {
                                setSelectedAuction(auction);
                                setCurrentView('auctions');
                              }}
                              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all"
                            >
                              Bid Again
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : currentView === 'profile' ? (
            <div className="col-span-full max-w-2xl mx-auto w-full">
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="h-32 bg-gradient-to-r from-indigo-600 to-violet-600" />
                <div className="px-8 pb-8">
                  <div className="relative -mt-12 mb-6">
                    <div className="w-24 h-24 bg-white rounded-2xl shadow-lg flex items-center justify-center text-indigo-600 text-4xl font-black border-4 border-white">
                      {profile?.email[0].toUpperCase()}
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-2xl font-black text-gray-900">{profile?.email}</h3>
                      <p className="text-gray-500 font-medium capitalize">{profile?.role} Account</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Balance</p>
                        <p className="text-2xl font-black text-indigo-600">{formatCurrency(profile?.credits || 0)}</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Member Since</p>
                        <p className="text-lg font-bold text-gray-900">March 2026</p>
                      </div>
                    </div>

                    <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                          <Wallet size={20} />
                        </div>
                        <h4 className="font-bold text-gray-900">Credit Management</h4>
                      </div>
                      <p className="text-sm text-indigo-700 mb-6 leading-relaxed">
                        You need credits to place bids. Enter the amount you wish to request from the admin.
                      </p>
                      
                      <div className="mb-4">
                        <label className="block text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1.5">Request Amount ($)</label>
                        <input 
                          type="number" 
                          value={requestAmount}
                          onChange={e => setRequestAmount(Number(e.target.value))}
                          className="w-full px-4 py-3 bg-white border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-indigo-600"
                          placeholder="Enter amount..."
                        />
                      </div>

                      <button 
                        onClick={handleRequestCredits}
                        disabled={loading}
                        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
                      >
                        {loading ? 'Processing...' : `Request ${formatCurrency(requestAmount)} Credits`}
                      </button>
                    </div>

                    <button 
                      onClick={handleLogout}
                      className="w-full py-3 border-2 border-red-50 text-red-600 rounded-xl font-bold hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                    >
                      <LogOut size={18} />
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            filteredAuctions.map(auction => (
              <AuctionCard 
                key={auction.id} 
                auction={auction} 
                onBid={openBidModal}
              />
            ))
          )}
          {currentView !== 'history' && filteredAuctions.length === 0 && (
            <div className="col-span-full py-20 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                <Gavel size={40} />
              </div>
              <h3 className="text-xl font-bold text-gray-900">No auctions found</h3>
              <p className="text-gray-500">Try adjusting your search or check back later!</p>
            </div>
          )}
        </div>
      </main>

      <AnimatePresence>
        {selectedAuction && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAuction(null)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              {bidSuccess ? (
                <div className="p-12 text-center flex flex-col items-center justify-center min-h-[450px]">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 12 }}
                    className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6"
                  >
                    <Check size={48} strokeWidth={3} />
                  </motion.div>
                  <h2 className="text-3xl font-black text-gray-900 mb-2">Bid Confirmed!</h2>
                  <p className="text-gray-500 font-medium mb-8">Your bid has been successfully placed.</p>
                  
                  <div className="w-full grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">New Current Bid</p>
                      <p className="text-xl font-black text-indigo-600">{formatCurrency(bidAmount)}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">Time Remaining</p>
                      <p className="text-xl font-black text-amber-600">{formatTimeRemaining(new Date(selectedAuction.end_time), now)}</p>
                    </div>
                  </div>
                  
                  <p className="mt-8 text-xs text-gray-400 animate-pulse">Closing in a few seconds...</p>
                </div>
              ) : (
                <div className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-black text-gray-900">Place Your Bid</h2>
                    <button onClick={() => setSelectedAuction(null)} className="p-2 hover:bg-gray-100 rounded-full">
                      <X size={20} />
                    </button>
                  </div>

                  <div className="flex items-center gap-4 mb-8 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                    <img 
                      src={(selectedAuction.image_url && selectedAuction.image_url.trim() !== "") ? selectedAuction.image_url : `https://picsum.photos/seed/${selectedAuction.id}/200/200`} 
                      className="w-16 h-16 rounded-xl object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">{selectedAuction.title}</h3>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-sm text-indigo-600 font-bold">
                          Current: {formatCurrency(selectedAuction.current_bid || selectedAuction.min_bid)}
                        </p>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                          <Clock size={12} />
                          {formatTimeRemaining(new Date(selectedAuction.end_time), now)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-bold text-gray-700">Your Bid Amount</label>
                        <span className="text-xs font-bold text-gray-400">Min: {formatCurrency((selectedAuction.current_bid || selectedAuction.min_bid) + 1)}</span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-gray-400">$</span>
                        <input 
                          type="number" 
                          value={bidAmount}
                          onChange={e => setBidAmount(Number(e.target.value))}
                          className="w-full pl-10 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-3xl font-black text-indigo-600 focus:border-indigo-500 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles size={16} className="text-amber-500" />
                        <span className="text-sm font-bold text-gray-700">Smart Bid Suggestions</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {isAiLoading ? (
                          [1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)
                        ) : (
                          suggestions.map((s, i) => (
                            <button 
                              key={i}
                              onClick={() => setBidAmount(s)}
                              className={cn(
                                "py-3 rounded-xl border-2 font-bold transition-all",
                                bidAmount === s ? "border-indigo-600 bg-indigo-50 text-indigo-600" : "border-gray-100 text-gray-500 hover:border-gray-200"
                              )}
                            >
                              ${s}
                            </button>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                      <AlertCircle className="text-amber-600 shrink-0" size={20} />
                      <p className="text-xs text-amber-800 leading-relaxed font-medium">
                        Bidding will lock your credits. If you are outbid, credits are returned. If you win, they are permanently deducted.
                      </p>
                    </div>

                    <button 
                      onClick={handlePlaceBid}
                      disabled={loading || bidAmount <= (selectedAuction.current_bid || selectedAuction.min_bid)}
                      className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-xl hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all active:scale-[0.98]"
                    >
                      {loading ? 'Processing...' : 'Confirm Bid'}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black text-gray-900">{editingAuctionId ? 'Edit Auction' : 'Create New Auction'}</h2>
                  <button onClick={() => {
                    setShowCreateModal(false);
                    setEditingAuctionId(null);
                  }} className="p-2 hover:bg-gray-100 rounded-full">
                    <X size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Item Title</label>
                      <input 
                        type="text" 
                        value={newAuction.title}
                        onChange={e => setNewAuction(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="e.g. Vintage Rolex Submariner"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-sm font-bold text-gray-700">Description</label>
                        <button 
                          onClick={handleGenerateDescription}
                          disabled={isAiLoading || !newAuction.title}
                          className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:text-indigo-700 disabled:opacity-50"
                        >
                          <Sparkles size={12} />
                          AI Generate
                        </button>
                      </div>
                      <textarea 
                        rows={4}
                        value={newAuction.description}
                        onChange={e => setNewAuction(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                        placeholder="Describe the item..."
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Minimum Bid ($)</label>
                      <input 
                        type="number" 
                        value={newAuction.min_bid}
                        onChange={e => setNewAuction(prev => ({ ...prev, min_bid: Number(e.target.value) }))}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Min Bid Increment ($)</label>
                      <input 
                        type="number" 
                        value={newAuction.min_increment}
                        onChange={e => setNewAuction(prev => ({ ...prev, min_increment: Number(e.target.value) }))}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="e.g. 10"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Start Date & Time</label>
                      <input 
                        type="datetime-local" 
                        value={newAuction.start_time}
                        onChange={e => setNewAuction(prev => ({ ...prev, start_time: e.target.value }))}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">End Date & Time</label>
                      <input 
                        type="datetime-local" 
                        value={newAuction.end_time}
                        onChange={e => setNewAuction(prev => ({ ...prev, end_time: e.target.value }))}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Image URL</label>
                      <input 
                        type="text" 
                        value={newAuction.image_url}
                        onChange={e => setNewAuction(prev => ({ ...prev, image_url: e.target.value }))}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="https://images.unsplash.com/..."
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end gap-3">
                  <button 
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingAuctionId(null);
                    }}
                    className="px-6 py-3 text-gray-500 font-bold hover:text-gray-700"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={editingAuctionId ? () => {
                      handleUpdateAuction(editingAuctionId, newAuction);
                      setShowCreateModal(false);
                      setEditingAuctionId(null);
                    } : handleCreateAuction}
                    className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
                  >
                    {editingAuctionId ? 'Save Changes' : 'Create Auction'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingRequest && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingRequest(null)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-black text-gray-900">Review Request</h2>
                  <button onClick={() => setEditingRequest(null)} className="p-2 hover:bg-gray-100 rounded-full">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">User</p>
                    <p className="font-bold text-gray-900">{editingRequest.user_email}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Requested Amount ($)</label>
                    <div className="flex items-center gap-3">
                      <input 
                        type="number" 
                        value={adminAdjustedAmount}
                        onChange={e => setAdminAdjustedAmount(Number(e.target.value))}
                        className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-indigo-600"
                      />
                      <button 
                        onClick={() => setAdminAdjustedAmount(editingRequest.amount / 2)}
                        className="px-3 py-3 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all"
                      >
                        Half
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Admin Note</label>
                    <textarea 
                      rows={3}
                      value={adminNote}
                      onChange={e => setAdminNote(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                      placeholder="Add a reason or note..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-4">
                    <button 
                      onClick={() => handleRejectRequest(editingRequest.id, adminNote)}
                      disabled={loading}
                      className="py-3 border-2 border-red-50 text-red-600 rounded-xl font-bold hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                    >
                      <X size={18} />
                      Reject
                    </button>
                    <button 
                      onClick={() => handleApproveRequest(editingRequest, adminAdjustedAmount, adminNote)}
                      disabled={loading}
                      className="py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-2"
                    >
                      <Check size={18} />
                      Approve
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
