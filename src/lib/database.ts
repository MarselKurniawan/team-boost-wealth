import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type ReferralTeamRow = Database['public']['Functions']['get_referral_team']['Returns'][number];

// Types
export interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  balance: number;
  total_income: number;
  total_recharge: number;
  total_withdraw: number;
  team_income: number;
  rabat_income: number;
  vip_level: number;
  referral_code: string | null;
  referred_by: string | null;
  level?: 'A' | 'B' | 'C';
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  daily_income: number;
  total_income: number;
  validity: number;
  vip_level: number;
  image: string;
  is_active: boolean;
  created_at: string;
  category: string;
  promo_price: number | null;
  promo_daily_income: number | null;
  promo_validity: number | null;
  max_per_user: number | null;
  term_type?: string;
  stock?: number | null;
}

export type ProductCategory = 'reguler' | 'promo' | 'vip';

export interface Investment {
  id: string;
  user_id: string;
  product_id: string | null;
  product_name: string;
  amount: number;
  daily_income: number;
  total_income: number;
  validity: number;
  days_remaining: number;
  total_earned: number;
  status: string;
  last_claimed_at: string | null;
  created_at: string;
  term_type?: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  status: string;
  description: string;
  created_at: string;
  payment_metadata?: unknown;
  payment_reference?: string | null;
  payment_method?: string | null;
}

export interface BankAccount {
  id: string;
  user_id: string;
  account_type: string;
  provider: string;
  account_number: string;
  account_name: string;
  created_at: string;
}

export interface Coupon {
  id: string;
  code: string;
  is_used: boolean;
  used_by: string | null;
  reward_amount: number | null;
  created_at: string;
  used_at: string | null;
  max_uses: number;
  current_uses: number;
  reward_min: number;
  reward_max: number;
}

// Hitung pembelian user untuk suatu produk.
// - Produk JANGKA PANJANG: hanya kontrak AKTIF yg dihitung -> boleh beli lagi setelah kontrak selesai.
// - Produk JANGKA PENDEK: SEMUA riwayat dihitung -> hanya boleh beli 1x seumur hidup.
export const getUserProductInvestmentCount = async (
  userId: string,
  productId: string,
  termType: 'long' | 'short' = 'long',
): Promise<number> => {
  let query = supabase
    .from('investments')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('product_id', productId);
  if (termType !== 'short') {
    query = query.eq('status', 'active');
  }
  const { count, error } = await query;
  if (error) {
    console.error('Error counting product investments:', error);
    return 0;
  }
  return count || 0;
};


// Format currency helper
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Commission rates by tier (on purchase)
// Tier A (VIP 3+) = 10%, Tier B (VIP 2) = 3%, Tier C (VIP 1) = 2%
export const getCommissionRate = (vipLevel: number): number => {
  if (vipLevel >= 3) return 0.10; // Tier A - 10%
  if (vipLevel === 2) return 0.03; // Tier B - 3%
  return 0.02; // Tier C - 2%
};

// Rabat rates by tier (on daily profit)
// Tier A (VIP 3+) = 5%, Tier B (VIP 2) = 3%, Tier C (VIP 1) = 2%
export const getRabatRate = (vipLevel: number): number => {
  if (vipLevel >= 3) return 0.05; // Tier A - 5%
  if (vipLevel === 2) return 0.03; // Tier B - 3%
  return 0.02; // Tier C - 2%
};

// Get tier label based on VIP level
export const getTierLabel = (vipLevel: number): string => {
  if (vipLevel >= 3) return 'A';
  if (vipLevel === 2) return 'B';
  return 'C';
};

// Process referral commission when user invests (via Edge Function to bypass RLS)
export const processReferralCommission = async (userId: string, investAmount: number): Promise<void> => {
  try {
    const { data, error } = await supabase.functions.invoke('process-referral', {
      body: {
        userId,
        amount: investAmount,
        type: 'commission'
      }
    });

    if (error) {
      console.error('Error calling process-referral function:', error);
      return;
    }

    if (data?.reward > 0) {
      console.log(`Commission processed: ${data.reward} for ${data.referrerName}`);
    }
  } catch (error) {
    console.error('Error processing referral commission:', error);
  }
};

// Process rabat when user claims daily income (via Edge Function to bypass RLS)
export const processReferralRabat = async (userId: string, dailyProfit: number): Promise<void> => {
  try {
    const { data, error } = await supabase.functions.invoke('process-referral', {
      body: {
        userId,
        amount: dailyProfit,
        type: 'rabat'
      }
    });

    if (error) {
      console.error('Error calling process-referral function:', error);
      return;
    }

    if (data?.reward > 0) {
      console.log(`Rabat processed: ${data.reward} for ${data.referrerName}`);
    }
  } catch (error) {
    console.error('Error processing referral rabat:', error);
  }
};

// Profile functions
export const getProfile = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
  return data;
};

export const updateProfile = async (userId: string, updates: Partial<Profile>): Promise<boolean> => {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('user_id', userId);

  if (error) {
    console.error('Error updating profile:', error);
    return false;
  }
  return true;
};

// Products functions
export const getProducts = async (): Promise<Product[]> => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('price', { ascending: true });

  if (error) {
    console.error('Error fetching products:', error);
    return [];
  }
  return data || [];
};

export const getAllProducts = async (): Promise<Product[]> => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('price', { ascending: true });

  if (error) {
    console.error('Error fetching all products:', error);
    return [];
  }
  return data || [];
};

// Investment functions
export const getInvestments = async (userId: string): Promise<Investment[]> => {
  const { data, error } = await supabase
    .from('investments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching investments:', error);
    return [];
  }
  return data || [];
};

export const createInvestment = async (investment: Omit<Investment, 'id' | 'created_at' | 'last_claimed_at'>): Promise<Investment | null> => {
  const { data, error } = await supabase
    .from('investments')
    .insert(investment)
    .select()
    .single();

  if (error) {
    console.error('Error creating investment:', error);
    return null;
  }
  return data;
};

export const updateInvestment = async (id: string, updates: Partial<Investment>): Promise<boolean> => {
  const { error } = await supabase
    .from('investments')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Error updating investment:', error);
    return false;
  }
  return true;
};

// Klaim atomic — hanya berhasil kalau row masih punya last_claimed_at lama (anti race condition).
// Return null kalau row sudah diklaim proses lain.
export const claimInvestmentIfDue = async (
  inv: Investment
): Promise<{ amount: number; nextClaimAt: string; newDaysRemaining: number; completed: boolean } | null> => {
  const ref = inv.last_claimed_at || inv.created_at;
  if (!ref) return null;
  const nextClaimAt = new Date(new Date(ref).getTime() + CYCLE_MS).toISOString();
  const newTotalEarned = inv.total_earned + inv.daily_income;
  const newDaysRemaining = inv.days_remaining - 1;
  const completed = newDaysRemaining <= 0;

  let q = supabase
    .from('investments')
    .update({
      total_earned: newTotalEarned,
      days_remaining: newDaysRemaining,
      last_claimed_at: nextClaimAt,
      status: completed ? 'completed' : 'active',
    })
    .eq('id', inv.id);

  // Guard atomic: pastikan last_claimed_at masih sama dengan yang kita baca.
  q = inv.last_claimed_at === null
    ? q.is('last_claimed_at', null)
    : q.eq('last_claimed_at', inv.last_claimed_at);

  const { data, error } = await q.select('id');
  if (error) {
    console.error('Error claiming investment:', error);
    return null;
  }
  if (!data || data.length === 0) {
    return null; // sudah diklaim proses lain
  }
  return { amount: inv.daily_income, nextClaimAt, newDaysRemaining, completed };
};

// Profit otomatis setiap 24 jam, terkunci pada jam pembelian produk.
// Tidak ada masa tenggang dan tidak ada hangus — siklus yang terlewat tetap dibayar saat auto-claim berikutnya berjalan.
export const CYCLE_MS = 24 * 60 * 60 * 1000;

export const canClaimToday = (lastClaimedAt: string | null, createdAt?: string | null): boolean => {
  const ref = lastClaimedAt || createdAt;
  if (!ref) return false;
  return Date.now() >= new Date(ref).getTime() + CYCLE_MS;
};

export const getNextClaimDelayMs = (lastClaimedAt: string | null, createdAt?: string | null): number => {
  const ref = lastClaimedAt || createdAt;
  if (!ref) return CYCLE_MS;
  return new Date(ref).getTime() + CYCLE_MS - Date.now();
};

// Geser timestamp klaim ke jadwal berikutnya (tetap selaras dengan jam pembelian).
export const getNextScheduledClaimAt = (lastClaimedAt: string | null, createdAt?: string | null): string => {
  const ref = lastClaimedAt || createdAt || new Date().toISOString();
  return new Date(new Date(ref).getTime() + CYCLE_MS).toISOString();
};

// Kompatibilitas: tidak ada lagi masa tenggang / hangus.
export const GRACE_MS = 0;
export const getGraceRemainingMs = (): number => 0;
export const isClaimExpired = (): boolean => false;

// Transaction functions
export const getTransactions = async (userId: string): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
  return data || [];
};

export const createTransaction = async (transaction: Omit<Transaction, 'id' | 'created_at'>): Promise<Transaction | null> => {
  const { data, error } = await supabase
    .from('transactions')
    .insert(transaction as any)
    .select()
    .single();

  if (error) {
    console.error('Error creating transaction:', error);
    return null;
  }
  return data;
};

export const updateTransactionStatus = async (id: string, status: string): Promise<boolean> => {
  const { error } = await supabase
    .from('transactions')
    .update({ status })
    .eq('id', id);

  if (error) {
    console.error('Error updating transaction:', error);
    return false;
  }
  return true;
};

// Bank account functions
export const getBankAccounts = async (userId: string): Promise<BankAccount[]> => {
  const { data, error } = await supabase
    .from('bank_accounts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching bank accounts:', error);
    return [];
  }
  return data || [];
};

export const createBankAccount = async (account: Omit<BankAccount, 'id' | 'created_at'>): Promise<BankAccount | null> => {
  const { data, error } = await supabase
    .from('bank_accounts')
    .insert(account)
    .select()
    .single();

  if (error) {
    console.error('Error creating bank account:', error);
    return null;
  }
  return data;
};

export const deleteBankAccount = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('bank_accounts')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting bank account:', error);
    return false;
  }
  return true;
};

// Coupon functions
export const getCoupons = async (): Promise<Coupon[]> => {
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching coupons:', error);
    return [];
  }
  return data || [];
};

export const createCoupon = async (
  code: string,
  opts?: { max_uses?: number; reward_min?: number; reward_max?: number }
): Promise<Coupon | null> => {
  const payload: any = { code };
  if (opts?.max_uses != null) payload.max_uses = Math.max(1, opts.max_uses);
  if (opts?.reward_min != null) payload.reward_min = opts.reward_min;
  if (opts?.reward_max != null) payload.reward_max = opts.reward_max;

  const { data, error } = await supabase
    .from('coupons')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('Error creating coupon:', error);
    return null;
  }
  return data as any;
};

export const useCoupon = async (code: string, _userId: string): Promise<{ success: boolean; reward?: number; message?: string }> => {
  // Logic dipindah ke edge function `redeem-coupon` agar reward dihitung server-side (anti-tamper)
  const { data, error } = await supabase.functions.invoke('redeem-coupon', {
    body: { code },
  });
  if (error) return { success: false, message: 'Gagal menggunakan kupon' };
  return data as { success: boolean; reward?: number; message?: string };
};

export const deleteCoupon = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('coupons')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting coupon:', error);
    return false;
  }
  return true;
};

// Admin functions
export const getAllProfiles = async (): Promise<Profile[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all profiles:', error);
    return [];
  }
  return data || [];
};

export const getAllTransactions = async (): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all transactions:', error);
    return [];
  }
  return data || [];
};

export const getAllInvestments = async (): Promise<Investment[]> => {
  const { data, error } = await supabase
    .from('investments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all investments:', error);
    return [];
  }
  return data || [];
};

export const setUserAdmin = async (userId: string, isAdmin: boolean): Promise<boolean> => {
  if (isAdmin) {
    const { error } = await supabase
      .from('user_roles')
      .upsert({ user_id: userId, role: 'admin' });
    
    if (error) {
      console.error('Error setting admin role:', error);
      return false;
    }
  } else {
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role', 'admin');
    
    if (error) {
      console.error('Error removing admin role:', error);
      return false;
    }
  }
  return true;
};

export const deleteUser = async (userId: string): Promise<boolean> => {
  const { data, error } = await supabase.functions.invoke('delete-user', {
    body: { user_id: userId },
  });
  if (error) {
    console.error('Error deleting user:', error);
    return false;
  }
  return data?.success || false;
};

export const getTeamMembers = async (referralCode: string): Promise<Profile[]> => {
  const { data, error } = await supabase.rpc('get_referral_team', {
    _referral_code: referralCode,
  });

  if (error) {
    console.error('Error fetching team members:', error);
    return [];
  }
  return ((data || []) as ReferralTeamRow[]).sort((a, b) => {
    const levelOrder = { A: 0, B: 1, C: 2 } as const;
    const levelDiff = (levelOrder[(a.level as 'A' | 'B' | 'C') || 'A'] ?? 0) - (levelOrder[(b.level as 'A' | 'B' | 'C') || 'A'] ?? 0);
    if (levelDiff !== 0) return levelDiff;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  }) as Profile[];
};

export const getPendingTransactions = async (): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching pending transactions:', error);
    return [];
  }
  return data || [];
};

export const checkIsAdmin = async (userId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle();

  if (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
  return !!data;
};

// Product admin functions
export const createProduct = async (product: Omit<Product, 'id' | 'created_at'>): Promise<Product | null> => {
  const { data, error } = await supabase
    .from('products')
    .insert(product)
    .select()
    .single();

  if (error) {
    console.error('Error creating product:', error);
    return null;
  }
  return data;
};

export const updateProduct = async (id: string, updates: Partial<Product>): Promise<boolean> => {
  const { error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Error updating product:', error);
    return false;
  }
  return true;
};

export const deleteProduct = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting product:', error);
    return false;
  }
  return true;
};

// VIP Settings
export interface VipSetting {
  id: string;
  vip_level: number;
  required_members: number;
  required_deposit: number;
  updated_at: string;
}

export const getVipSettings = async (): Promise<VipSetting[]> => {
  const { data, error } = await supabase
    .from('vip_settings')
    .select('*')
    .order('vip_level', { ascending: true });

  if (error) {
    console.error('Error fetching VIP settings:', error);
    return [];
  }
  return (data || []).map((d: any) => ({
    ...d,
    required_deposit: Number(d.required_deposit ?? 0),
  })) as VipSetting[];
};

export const updateVipSetting = async (
  vipLevel: number,
  requiredMembers: number,
  requiredDeposit: number = 0,
): Promise<boolean> => {
  const { error } = await supabase
    .from('vip_settings')
    .upsert({
      vip_level: vipLevel,
      required_members: requiredMembers,
      required_deposit: requiredDeposit,
      updated_at: new Date().toISOString(),
    } as any, { onConflict: 'vip_level' });

  if (error) {
    console.error('Error upserting VIP setting:', error);
    return false;
  }
  return true;
};
