import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, TrendingUp, Share2, Crown, Award, Copy, MessageCircle, Send, Info } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency, Profile, updateProfile } from "@/lib/database";
import { getMultiLevelTeam, MultiLevelTeam, COMMISSION_RATES, RABAT_RATES, VIP_THRESHOLDS, loadVipThresholds, calculateVipLevel } from "@/lib/teamUtils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Team = () => {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [team, setTeam] = useState<MultiLevelTeam>({ levelA: [], levelB: [], levelC: [], total: 0 });
  const [longTermIds, setLongTermIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("all");

  const [thresholdsReady, setThresholdsReady] = useState(false);

  const loadData = async () => {
    await loadVipThresholds();
    setThresholdsReady(true);
    if (profile?.referral_code) {
      const teamData = await getMultiLevelTeam(profile.referral_code);
      setTeam(teamData);

      // Fetch which downlines have at least one LONG-term investment.
      // Short-term investments don't count toward VIP requirements.
      const allIds = [
        ...teamData.levelA.map(m => m.user_id),
        ...teamData.levelB.map(m => m.user_id),
        ...teamData.levelC.map(m => m.user_id),
      ].filter(Boolean);
      if (allIds.length > 0) {
        const { data, error } = await supabase.rpc('get_long_term_investors', { _user_ids: allIds });
        if (!error && Array.isArray(data)) {
          setLongTermIds(new Set(data as unknown as string[]));
        }
      } else {
        setLongTermIds(new Set());
      }
    }
    await refreshProfile();
  };

  useEffect(() => {
    loadData();
  }, [profile?.referral_code]);

  const currentVipLevel = profile?.vip_level ?? 0;
  // Hitung member yang qualified untuk VIP: HARUS punya investasi jangka panjang.
  // Pembelian produk jangka pendek TIDAK dihitung sebagai syarat naik VIP.
  const isQualified = (m: Profile) => longTermIds.has(m.user_id);
  const purchasedLevelA = team.levelA.filter(isQualified);
  const purchasedLevelB = team.levelB.filter(isQualified);
  const purchasedLevelC = team.levelC.filter(isQualified);
  const totalReferrals = purchasedLevelA.length + purchasedLevelB.length + purchasedLevelC.length;
  const personalDeposit = Number(profile?.total_recharge || 0);
  const referralCode = profile?.referral_code || '';
  const referralLink = `${window.location.origin}/auth?ref=${referralCode}`;

  // Threshold berikutnya: cari level pertama yang BELUM terpenuhi (member ATAU deposit kurang)
  const ascending = VIP_THRESHOLDS.slice().reverse();
  const nextVipThreshold = ascending.find(t => totalReferrals < t.members || personalDeposit < t.deposit);
  const currentThreshold = ascending.slice().reverse().find(t => totalReferrals >= t.members && personalDeposit >= t.deposit);
  const nextVipLevel = nextVipThreshold ? nextVipThreshold.level : 5;
  const requiredReferrals = nextVipThreshold ? nextVipThreshold.members : VIP_THRESHOLDS[0].members;
  const requiredDeposit = nextVipThreshold ? nextVipThreshold.deposit : VIP_THRESHOLDS[0].deposit;
  const prevRequired = currentThreshold ? currentThreshold.members : 0;
  const prevDeposit = currentThreshold ? currentThreshold.deposit : 0;
  const memberProgress = requiredReferrals > prevRequired
    ? Math.min(((totalReferrals - prevRequired) / (requiredReferrals - prevRequired)) * 100, 100)
    : 100;
  const depositProgress = requiredDeposit > prevDeposit
    ? Math.min(((personalDeposit - prevDeposit) / (requiredDeposit - prevDeposit)) * 100, 100)
    : 100;
  const progressPercentage = Math.min(memberProgress, depositProgress);

  // Auto-sync VIP level: kalau user sudah memenuhi syarat tapi profile masih lebih rendah, naikkan.
  useEffect(() => {
    if (!thresholdsReady || !profile?.user_id) return;
    const computed = calculateVipLevel(totalReferrals, personalDeposit);
    if (computed > currentVipLevel) {
      updateProfile(profile.user_id, { vip_level: computed } as any).then(() => refreshProfile());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thresholdsReady, totalReferrals, personalDeposit, currentVipLevel, profile?.user_id]);

  // Current and next rabat rate
  const currentRabat = RABAT_RATES.A; // simplified
  const nextRabat = currentVipLevel < 5 ? `${(currentRabat + 1)}%` : `${currentRabat}%`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Tersalin!", description: "Berhasil disalin ke clipboard" });
  };

  const shareWhatsApp = () => {
    const message = `🤖 Bergabung dengan Apptronik — Robot AI Humanoid!\n\nKode undangan: ${referralCode}\nDaftar: ${referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const shareTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(`Kode referral: ${referralCode}`)}`, '_blank');
  };

  const teamLevels = [
    { level: "A", name: "Level A", description: "Bawahan Langsung", commission: COMMISSION_RATES.A, rabat: RABAT_RATES.A, members: team.levelA, badgeColor: "bg-primary text-primary-foreground" },
    { level: "B", name: "Level B", description: "Generasi Kedua", commission: COMMISSION_RATES.B, rabat: RABAT_RATES.B, members: team.levelB, badgeColor: "bg-accent text-accent-foreground" },
    { level: "C", name: "Level C", description: "Generasi Ketiga", commission: COMMISSION_RATES.C, rabat: RABAT_RATES.C, members: team.levelC, badgeColor: "bg-secondary text-secondary-foreground" },
  ];

  const displayPhone = (phone?: string | null) => {
    if (!phone) return "-";
    return String(phone).replace(/\D/g, "");
  };

  const renderMemberCard = (member: Profile, level: string, badgeColor: string) => {
    const depositAmount = Number(member.total_recharge || 0);
    const hasDeposited = depositAmount > 0;
    return (
      <div
        key={member.id}
        className={`p-2.5 rounded-lg ${hasDeposited ? "bg-muted" : "bg-muted/40 opacity-70"}`}
      >
        <div className="flex items-center gap-1.5 flex-wrap mb-1">
          <p className="text-xs font-semibold text-foreground truncate min-w-0">{member.name}</p>
          <Badge className={`text-[9px] px-1 py-0 ${badgeColor}`}>{level}</Badge>
          {hasDeposited ? (
            <Badge variant="success" className="text-[9px] px-1 py-0">Aktif</Badge>
          ) : (
            <Badge variant="outline" className="text-[9px] px-1 py-0 text-muted-foreground border-muted-foreground/30">
              Belum Deposit
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
          <p className="text-[10px] text-muted-foreground">📱 {displayPhone(member.phone)}</p>
          <p className="text-[10px] text-muted-foreground">VIP {member.vip_level}</p>
          <p className="text-[10px] text-muted-foreground">
            Daftar: {new Date(member.created_at).toLocaleDateString("id-ID")}
          </p>
          <p className={`text-[10px] font-semibold break-all ${hasDeposited ? "text-success" : "text-muted-foreground"}`}>
            {formatCurrency(depositAmount)}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 p-4 pt-5">

      {/* Referral Link & Code */}
      <Card className="border-border/50">
        <CardContent className="p-4 space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Tautan undangan saya:</p>
            <p className="text-xs text-primary break-all">{referralLink}</p>
          </div>
          
          <Button 
            className="w-full h-9 text-xs font-semibold"
            onClick={() => copyToClipboard(referralLink)}
          >
            Salin tautan undangan
          </Button>

          <Separator />

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Kode undangan: <span className="text-primary font-bold">{referralCode}</span></span>
            <Button size="sm" variant="destructive" className="text-[10px] h-7 px-3 rounded-full" onClick={() => copyToClipboard(referralCode)}>
              Salin
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Share Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="h-9 text-xs gap-1.5 border-success/40 text-success hover:bg-success/10" onClick={shareWhatsApp}>
          <MessageCircle className="w-3.5 h-3.5" />
          WhatsApp
        </Button>
        <Button variant="outline" className="h-9 text-xs gap-1.5 border-primary/40 text-primary hover:bg-primary/10" onClick={shareTelegram}>
          <Send className="w-3.5 h-3.5" />
          Telegram
        </Button>
      </div>

      {/* Info tip */}
      <Card className="bg-muted/50 border-border/50">
        <CardContent className="p-3 flex items-start gap-2">
          <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Semakin tinggi level VIP, semakin besar hadiah pembelian ulang.
          </p>
        </CardContent>
      </Card>

      {/* Invitation Stats */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-center text-foreground mb-3">Undangan saya</p>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div>
              <p className="text-lg font-bold text-primary">{totalReferrals} <span className="text-xs font-normal text-muted-foreground">orang</span></p>
              <p className="text-[10px] text-muted-foreground">Sudah beli produk</p>
            </div>
            <div>
              <p className="text-lg font-bold text-primary">{purchasedLevelA.length} <span className="text-xs font-normal text-muted-foreground">orang</span></p>
              <p className="text-[10px] text-muted-foreground">Langsung (Level A)</p>
            </div>
          </div>
          <p className="text-[10px] text-center text-muted-foreground mt-2">Hanya member yang sudah membeli produk dihitung untuk naik VIP.</p>
        </CardContent>
      </Card>

      {/* VIP Progress Card (dua syarat: member & deposit pribadi) */}
      <Card className="border-border/50">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Crown className="w-4 h-4 text-vip-gold" />
              <p className="text-xs font-semibold">Progress menuju VIP {nextVipLevel}</p>
            </div>
            <Badge className="bg-secondary/20 text-secondary border-0 text-[10px]">VIP {currentVipLevel} sekarang</Badge>
          </div>

          <div>
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span className="text-muted-foreground">Member tim</span>
              <span className="font-semibold">{totalReferrals} / {requiredReferrals}</span>
            </div>
            <Progress value={memberProgress} className="h-1.5" />
          </div>

          <div>
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span className="text-muted-foreground">Akumulasi deposit pribadi</span>
              <span className="font-semibold break-all">{formatCurrency(personalDeposit)} / {formatCurrency(requiredDeposit)}</span>
            </div>
            <Progress value={depositProgress} className="h-1.5" />
          </div>

          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Wajib penuhi <b>kedua syarat</b> (jumlah member & akumulasi deposit pribadi) untuk naik VIP. Saat ini progress terkecil: <b>{Math.floor(progressPercentage)}%</b>.
          </p>
        </CardContent>
      </Card>

      {/* Income Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5">Total Komisi</p>
            <p className="text-xs font-bold text-primary">{formatCurrency(profile?.team_income || 0)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5">Total Rabat</p>
            <p className="text-xs font-bold text-vip-gold">{formatCurrency(profile?.rabat_income || 0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Commission Structure */}
      <Card className="border-border/50">
        <CardContent className="p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Award className="w-4 h-4 text-primary" />
            <p className="text-xs font-semibold text-foreground">Struktur Komisi & Rabat</p>
          </div>
          <div className="space-y-2">
            {teamLevels.map((level) => (
              <div key={level.level} className="bg-muted/50 rounded-lg p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <Badge className={`text-[9px] px-1.5 py-0 ${level.badgeColor}`}>{level.level}</Badge>
                    <span className="text-[11px] font-medium text-foreground">{level.name}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{level.description}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] mt-1">
                  <span className="text-muted-foreground">Komisi: <span className="font-bold text-primary">{level.commission}%</span></span>
                  <span className="text-muted-foreground">Rabat: <span className="font-bold text-vip-gold">{level.rabat}%</span></span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card className="border-border/50">
        <CardContent className="p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Users className="w-4 h-4 text-primary" />
            <p className="text-xs font-semibold text-foreground">Anggota Tim ({team.total})</p>
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 mb-2 h-8">
              <TabsTrigger value="all" className="text-[10px]">Semua</TabsTrigger>
              <TabsTrigger value="A" className="text-[10px]">Level A</TabsTrigger>
              <TabsTrigger value="B" className="text-[10px]">Level B</TabsTrigger>
              <TabsTrigger value="C" className="text-[10px]">Level C</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-0">
              {team.total === 0 ? (
                <div className="text-center py-6">
                  <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Belum ada anggota tim</p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[70vh] overflow-y-auto pr-1">

                  {team.levelA.map(m => renderMemberCard(m, "A", teamLevels[0].badgeColor))}
                  {team.levelB.map(m => renderMemberCard(m, "B", teamLevels[1].badgeColor))}
                  {team.levelC.map(m => renderMemberCard(m, "C", teamLevels[2].badgeColor))}
                </div>
              )}
            </TabsContent>
            
            {teamLevels.map((level) => (
              <TabsContent key={level.level} value={level.level} className="mt-0">
                {level.members.length === 0 ? (
                  <div className="text-center py-6">
                    <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Belum ada anggota {level.name}</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-[70vh] overflow-y-auto pr-1">
                    {level.members.map(m => renderMemberCard(m, level.level, level.badgeColor))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

// Need to import Separator
import { Separator } from "@/components/ui/separator";

export default Team;
