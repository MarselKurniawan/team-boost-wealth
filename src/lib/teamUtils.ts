import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { Profile, getVipSettings } from './database';

type ReferralTeamRow = Database['public']['Functions']['get_referral_team']['Returns'][number];

export interface TeamMember extends Profile {
  level: 'A' | 'B' | 'C';
}

export interface MultiLevelTeam {
  levelA: Profile[]; // Direct referrals
  levelB: Profile[]; // 2nd generation
  levelC: Profile[]; // 3rd generation
  total: number;
}

// Commission rates by level (on purchase)
export const COMMISSION_RATES = {
  A: 10, // 10%
  B: 3,  // 3%
  C: 2,  // 2%
};

// Rabat rates by level (on daily profit)
export const RABAT_RATES = {
  A: 5, // 5%
  B: 3, // 3%
  C: 2, // 2%
};

// Default VIP thresholds (fallback if DB fetch fails)
export let VIP_THRESHOLDS = [
  { level: 5, members: 300, deposit: 0 },
  { level: 4, members: 200, deposit: 0 },
  { level: 3, members: 100, deposit: 0 },
  { level: 2, members: 50, deposit: 0 },
  { level: 1, members: 10, deposit: 0 },
];

// Load VIP thresholds from database
export const loadVipThresholds = async () => {
  const settings = await getVipSettings();
  if (settings.length > 0) {
    VIP_THRESHOLDS = settings
      .map(s => ({ level: s.vip_level, members: s.required_members, deposit: Number(s.required_deposit || 0) }))
      .sort((a, b) => b.level - a.level);
  }
  return VIP_THRESHOLDS;
};

// Calculate VIP level from total team count AND personal deposit (total_recharge)
// Naik VIP wajib MEMENUHI dua syarat sekaligus: jumlah member & akumulasi deposit.
export const calculateVipLevel = (totalMembers: number, totalDeposit: number = 0): number => {
  for (const tier of VIP_THRESHOLDS) {
    // Skip tier yang belum dikonfigurasi (members & deposit dua-duanya 0/kosong)
    // supaya user tidak otomatis naik ke level tertinggi.
    if ((tier.members ?? 0) <= 0 && (tier.deposit ?? 0) <= 0) continue;
    if (totalMembers >= tier.members && totalDeposit >= tier.deposit) return tier.level;
  }
  return 0;
};

// Get multi-level team members (3 levels deep)
export const getMultiLevelTeam = async (referralCode: string): Promise<MultiLevelTeam> => {
  const result: MultiLevelTeam = {
    levelA: [],
    levelB: [],
    levelC: [],
    total: 0,
  };

  if (!referralCode) return result;

  // Gunakan RPC security-definer agar bisa membaca Level A/B/C dari rantai referral.
  // VIP setting tidak ikut menentukan siapa yang muncul di tim.
  const { data, error } = await supabase.rpc('get_referral_team', {
    _referral_code: referralCode,
  });

  if (error) {
    console.error('Error fetching team via get_referral_team:', error);
    return result;
  }

  const rows: ReferralTeamRow[] = data || [];
  for (const row of rows) {
    const { level, ...profile } = row;
    if (level === 'A') result.levelA.push(profile as Profile);
    else if (level === 'B') result.levelB.push(profile as Profile);
    else if (level === 'C') result.levelC.push(profile as Profile);
  }

  const byDate = (a: Profile, b: Profile) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  result.levelA.sort(byDate);
  result.levelB.sort(byDate);
  result.levelC.sort(byDate);

  result.total = result.levelA.length + result.levelB.length + result.levelC.length;

  return result;
};

// Get flat list of all team members with their levels
export const getAllTeamMembersWithLevel = (team: MultiLevelTeam): TeamMember[] => {
  const members: TeamMember[] = [];

  team.levelA.forEach(member => {
    members.push({ ...member, level: 'A' });
  });

  team.levelB.forEach(member => {
    members.push({ ...member, level: 'B' });
  });

  team.levelC.forEach(member => {
    members.push({ ...member, level: 'C' });
  });

  return members;
};
