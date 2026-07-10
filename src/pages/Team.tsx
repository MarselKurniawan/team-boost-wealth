import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Users, TrendingUp, Crown, Award, Copy, Send, Info, Gift, Coins, Link2 } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
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
  const [filter, setFilter] = useState<"all" | "A" | "B" | "C">("all");
  const [thresholdsReady, setThresholdsReady] = useState(false);

  const loadData = async () => {
    await loadVipThresholds();
    setThresholdsReady(true);
    if (profile?.referral_code) {
      const teamData = await getMultiLevelTeam(profile.referral_code);
      setTeam(teamData);
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

  useEffect(() => { loadData(); }, [profile?.referral_code]);

  const currentVipLevel = profile?.vip_level ?? 0;
  const isQualified = (m: Profile) => longTermIds.has(m.user_id);
  const purchasedLevelA = team.levelA.filter(isQualified);
  const purchasedLevelB = team.levelB.filter(isQualified);
  const purchasedLevelC = team.levelC.filter(isQualified);
  const totalReferrals = purchasedLevelA.length + purchasedLevelB.length + purchasedLevelC.length;
  const personalDeposit = Number(profile?.total_recharge || 0);
  const referralCode = profile?.referral_code || '';
  const referralLink = `${window.location.origin}/auth?ref=${referralCode}`;

  const ascending = VIP_THRESHOLDS.slice().reverse();
  const nextVipThreshold = ascending.find(t => totalReferrals < t.members || personalDeposit < t.deposit);
  const currentThreshold = ascending.slice().reverse().find(t => totalReferrals >= t.members && personalDeposit >= t.deposit);
  const nextVipLevel = nextVipThreshold ? nextVipThreshold.level : 5;
  const requiredReferrals = nextVipThreshold ? nextVipThreshold.members : VIP_THRESHOLDS[0].members;
  const requiredDeposit = nextVipThreshold ? nextVipThreshold.deposit : VIP_THRESHOLDS[0].deposit;
  const prevRequired = currentThreshold ? currentThreshold.members : 0;
  const prevDeposit = currentThreshold ? currentThreshold.deposit : 0;
  const memberProgress = requiredReferrals > prevRequired
    ? Math.min(((totalReferrals - prevRequired) / (requiredReferrals - prevRequired)) * 100, 100) : 100;
  const depositProgress = requiredDeposit > prevDeposit
    ? Math.min(((personalDeposit - prevDeposit) / (requiredDeposit - prevDeposit)) * 100, 100) : 100;
  const progressPercentage = Math.min(memberProgress, depositProgress);

  useEffect(() => {
    if (!thresholdsReady || !profile?.user_id) return;
    const computed = calculateVipLevel(totalReferrals, personalDeposit);
    if (computed > currentVipLevel) {
      updateProfile(profile.user_id, { vip_level: computed } as any).then(() => refreshProfile());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thresholdsReady, totalReferrals, personalDeposit, currentVipLevel, profile?.user_id]);

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Tersalin", description: `${label} berhasil disalin` });
  };

  const shareWhatsApp = () => {
    const message = `Bergabung dengan Apptronik!\n\nKode undangan: ${referralCode}\nDaftar: ${referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };
  const shareTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(`Kode referral: ${referralCode}`)}`, '_blank');
  };

  const levelMeta = {
    A: { label: "Level A", desc: "Referral langsung", commission: COMMISSION_RATES.A, rabat: RABAT_RATES.A, count: team.levelA.length, accent: "bg-primary" },
    B: { label: "Level B", desc: "Generasi kedua", commission: COMMISSION_RATES.B, rabat: RABAT_RATES.B, count: team.levelB.length, accent: "bg-primary/60" },
    C: { label: "Level C", desc: "Generasi ketiga", commission: COMMISSION_RATES.C, rabat: RABAT_RATES.C, count: team.levelC.length, accent: "bg-primary/30" },
  } as const;

  const displayPhone = (phone?: string | null) => phone ? String(phone).replace(/\D/g, "") : "-";

  const allMembers = useMemo(() => {
    const withLvl = [
      ...team.levelA.map(m => ({ m, lvl: "A" as const })),
      ...team.levelB.map(m => ({ m, lvl: "B" as const })),
      ...team.levelC.map(m => ({ m, lvl: "C" as const })),
    ];
    return filter === "all" ? withLvl : withLvl.filter(x => x.lvl === filter);
  }, [team, filter]);

  const initial = (name?: string | null) => (name?.trim()?.[0] || "?").toUpperCase();

  return (
    <div className="pb-6">
      {/* HERO — split cobalt banner */}
      <div className="relative bg-primary text-primary-foreground px-5 pt-8 pb-14">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] opacity-70">Jaringan Tim</p>
            <h1 className="font-heading text-2xl font-bold leading-tight mt-1 truncate">{profile?.name || "Member"}</h1>
            <div className="flex items-center gap-1.5 mt-2">
              <Crown className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium">VIP {currentVipLevel}</span>
              <span className="opacity-40">·</span>
              <span className="text-[11px] opacity-80">Menuju VIP {nextVipLevel}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="font-heading text-4xl font-bold leading-none">{team.total}</p>
            <p className="text-[10px] uppercase tracking-widest mt-1 opacity-70">Total Tim</p>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-8 space-y-3">
        {/* REFERRAL STRIP */}
        <div className="bg-white border border-primary/20 shadow-[0_10px_30px_-15px_rgba(15,60,180,0.35)]">
          <div className="flex">
            <div className="w-1 bg-primary" />
            <div className="flex-1 p-3 min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Kode Undangan</p>
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <p className="font-heading text-xl font-bold text-primary tracking-widest break-all">{referralCode}</p>
                <button onClick={() => copy(referralCode, "Kode")} className="shrink-0 text-primary p-1.5 hover:bg-primary/5">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground min-w-0">
                <Link2 className="w-3 h-3 shrink-0" />
                <span className="truncate">{referralLink}</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 border-t border-border/40">
            <button onClick={() => copy(referralLink, "Tautan")} className="flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium hover:bg-muted/50 border-r border-border/40">
              <Copy className="w-3.5 h-3.5" /> Salin
            </button>
            <button onClick={shareWhatsApp} className="flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium hover:bg-muted/50 border-r border-border/40 text-[#25D366]">
              <WhatsAppIcon size={14} /> WhatsApp
            </button>
            <button onClick={shareTelegram} className="flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium hover:bg-muted/50 text-primary">
              <Send className="w-3.5 h-3.5" /> Telegram
            </button>
          </div>
        </div>

        {/* INCOME ROW — asymmetric */}
        <div className="grid grid-cols-5 gap-2">
          <div className="col-span-3 bg-primary text-primary-foreground p-3">
            <div className="flex items-center gap-1.5 opacity-80">
              <TrendingUp className="w-3 h-3" />
              <p className="text-[10px] uppercase tracking-widest">Total Komisi</p>
            </div>
            <p className="font-heading text-xl font-bold mt-1 break-all">{formatCurrency(profile?.team_income || 0)}</p>
          </div>
          <div className="col-span-2 bg-white border border-border/60 p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Gift className="w-3 h-3" />
              <p className="text-[10px] uppercase tracking-widest">Rabat</p>
            </div>
            <p className="font-heading text-base font-bold mt-1 text-primary break-all">{formatCurrency(profile?.rabat_income || 0)}</p>
          </div>
        </div>

        {/* VIP PROGRESS */}
        <div className="bg-white border border-border/60 p-3">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 bg-primary/10 flex items-center justify-center">
                <Crown className="w-3.5 h-3.5 text-primary" />
              </div>
              <div>
                <p className="text-[11px] font-semibold leading-tight">Menuju VIP {nextVipLevel}</p>
                <p className="text-[9px] text-muted-foreground">Progress terkecil: {Math.floor(progressPercentage)}%</p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-primary">{Math.floor(progressPercentage)}%</span>
          </div>
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-muted-foreground">Member qualified</span>
                <span className="font-mono">{totalReferrals}/{requiredReferrals}</span>
              </div>
              <Progress value={memberProgress} className="h-1" />
            </div>
            <div>
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-muted-foreground">Deposit pribadi</span>
                <span className="font-mono break-all text-right">{formatCurrency(personalDeposit)} / {formatCurrency(requiredDeposit)}</span>
              </div>
              <Progress value={depositProgress} className="h-1" />
            </div>
          </div>
        </div>

        {/* STRUKTUR — 3 stacked column cards */}
        <div>
          <div className="flex items-center gap-1.5 mb-2 px-0.5">
            <Award className="w-3.5 h-3.5 text-primary" />
            <p className="text-[11px] font-semibold uppercase tracking-wider">Struktur Komisi</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(["A", "B", "C"] as const).map((lvl) => {
              const meta = levelMeta[lvl];
              return (
                <div key={lvl} className="bg-white border border-border/60 overflow-hidden">
                  <div className={`${meta.accent} h-1`} />
                  <div className="p-2.5">
                    <div className="flex items-baseline justify-between">
                      <span className="font-heading text-lg font-bold text-primary">{lvl}</span>
                      <span className="text-[9px] text-muted-foreground">{meta.count} org</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground leading-tight mt-0.5">{meta.desc}</p>
                    <div className="border-t border-border/40 mt-2 pt-1.5 space-y-0.5">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground">Komisi</span>
                        <span className="font-mono font-semibold text-primary">{meta.commission}%</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground">Rabat</span>
                        <span className="font-mono font-semibold text-primary">{meta.rabat}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* MEMBERS — filter chips + horizontal-card list */}
        <div>
          <div className="flex items-center justify-between mb-2 px-0.5">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-primary" />
              <p className="text-[11px] font-semibold uppercase tracking-wider">Anggota Tim</p>
            </div>
            <span className="text-[10px] text-muted-foreground">{allMembers.length} tampil</span>
          </div>

          <div className="flex gap-1.5 mb-2 overflow-x-auto no-scrollbar">
            {([
              { k: "all", label: `Semua · ${team.total}` },
              { k: "A", label: `A · ${team.levelA.length}` },
              { k: "B", label: `B · ${team.levelB.length}` },
              { k: "C", label: `C · ${team.levelC.length}` },
            ] as const).map((c) => (
              <button
                key={c.k}
                onClick={() => setFilter(c.k as any)}
                className={`shrink-0 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider border transition-colors ${
                  filter === c.k
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-white text-muted-foreground border-border/60 hover:border-primary/40"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {allMembers.length === 0 ? (
            <div className="bg-white border border-dashed border-border/60 py-10 text-center">
              <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Belum ada anggota</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[65vh] overflow-y-auto pr-0.5">
              {allMembers.map(({ m, lvl }) => {
                const deposit = Number(m.total_recharge || 0);
                const active = deposit > 0;
                return (
                  <div key={m.id} className="bg-white border border-border/60 flex items-stretch overflow-hidden">
                    <div className={`w-10 shrink-0 flex flex-col items-center justify-center ${active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      <span className="font-heading text-base font-bold leading-none">{initial(m.name)}</span>
                      <span className="text-[8px] mt-1 font-mono">{lvl}</span>
                    </div>
                    <div className="flex-1 min-w-0 p-2.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="text-[12px] font-semibold truncate min-w-0 flex-1">{m.name}</p>
                        <span className="text-[9px] font-mono text-muted-foreground shrink-0">VIP {m.vip_level}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                        <span>{displayPhone(m.phone)}</span>
                        <span className="opacity-40">·</span>
                        <span>{new Date(m.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}</span>
                      </div>
                    </div>
                    <div className={`shrink-0 flex flex-col items-end justify-center px-2.5 py-1.5 min-w-[95px] ${active ? "bg-primary text-primary-foreground" : "bg-muted/50"}`}>
                      <span className="text-[9px] uppercase tracking-wider opacity-80">
                        {active ? "Deposit" : "Belum"}
                      </span>
                      <span className={`font-mono text-[11px] font-bold break-all text-right leading-tight mt-0.5 ${!active && "text-muted-foreground"}`}>
                        {active ? formatCurrency(deposit) : "—"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* INFO */}
        <div className="bg-primary/5 border-l-2 border-primary p-2.5 flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Hanya member dengan investasi <b>jangka panjang</b> yang dihitung untuk syarat naik VIP. Kedua syarat (member & deposit) wajib terpenuhi.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Team;
