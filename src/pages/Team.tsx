import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Users, Copy, Link2, Gift, Image as ImageIcon, Info, ChevronRight, Crown, Sparkles, TrendingUp } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency, Profile } from "@/lib/database";
import { getMultiLevelTeam, MultiLevelTeam, COMMISSION_RATES, RABAT_RATES } from "@/lib/teamUtils";
import { useVipTitles } from "@/hooks/useVipTitles";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Team = () => {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const { titleFor } = useVipTitles();
  const [team, setTeam] = useState<MultiLevelTeam>({ levelA: [], levelB: [], levelC: [], total: 0 });
  const [longTermIds, setLongTermIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "A" | "B" | "C">("all");

  const loadData = async () => {
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
        if (!error && Array.isArray(data)) setLongTermIds(new Set(data as unknown as string[]));
      } else setLongTermIds(new Set());
    }
    await refreshProfile();
  };

  useEffect(() => { loadData(); }, [profile?.referral_code]);

  const currentVipLevel = profile?.vip_level ?? 0;
  const currentVipTitle = titleFor(currentVipLevel);
  const referralCode = profile?.referral_code || '';
  const referralLink = `${window.location.origin}/auth?ref=${referralCode}`;

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Tersalin", description: `${label} berhasil disalin` });
  };

  const shareWhatsApp = () => {
    const message = `Bergabung dengan InvestPro!\n\nKode undangan: ${referralCode}\nDaftar: ${referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const displayPhone = (phone?: string | null) => phone ? String(phone).replace(/\D/g, "") : "-";
  const initial = (name?: string | null) => (name?.trim()?.[0] || "?").toUpperCase();
  const isQualified = (m: Profile) => longTermIds.has(m.user_id);

  const allMembers = useMemo(() => {
    const withLvl = [
      ...team.levelA.map(m => ({ m, lvl: "A" as const })),
      ...team.levelB.map(m => ({ m, lvl: "B" as const })),
      ...team.levelC.map(m => ({ m, lvl: "C" as const })),
    ];
    return filter === "all" ? withLvl : withLvl.filter(x => x.lvl === filter);
  }, [team, filter]);

  return (
    <div className="bg-[#f0f4fb] min-h-screen pb-8">
      {/* Decorative hero header */}
      <div className="relative overflow-hidden pt-8 pb-24 px-4 bg-gradient-to-br from-[#1e3a8a] via-[#1e40af] to-[#3b82f6]">
        <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute top-10 -left-16 w-48 h-48 rounded-full bg-cyan-300/20 blur-3xl" />
        <Sparkles className="absolute top-6 right-8 w-4 h-4 text-white/40" />
        <Sparkles className="absolute top-16 left-10 w-3 h-3 text-white/30" />

        <div className="relative text-center">
          <p className="text-[10px] uppercase tracking-[0.32em] text-white/70 font-semibold">Tim Referral</p>
          <h1 className="mt-1 font-heading text-2xl font-bold text-white">Ajak & Menangkan</h1>
          <p className="mt-1.5 text-[11px] text-white/80">
            Reward pembelian pertama <span className="font-bold text-white">10%</span>
          </p>
        </div>
      </div>

      <div className="px-4 -mt-16 space-y-3">
        {/* VIP identity card — dynamic title, no auto-upgrade */}
        <div className="relative overflow-hidden rounded-3xl bg-white shadow-xl border border-primary/10 p-5">
          {/* decorative crown blob */}
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-gradient-to-br from-primary/15 to-cyan-200/40 blur-2xl" />
          <div className="relative flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1e3a8a] via-[#1e40af] to-[#3b82f6] flex items-center justify-center shrink-0 shadow-md">
              <Crown className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground font-semibold">Tingkatan Saya</p>
              <p className="mt-0.5 font-heading text-xl font-bold text-foreground truncate">{currentVipTitle}</p>
              <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                <span className="text-[9px] font-bold uppercase tracking-wider">VIP {currentVipLevel}</span>
              </div>
            </div>
          </div>

          <div className="relative mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-primary/5 border border-primary/10 p-2.5 text-center">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Level A</p>
              <p className="mt-0.5 font-heading text-base font-bold text-primary">{COMMISSION_RATES.A}%</p>
              <p className="text-[8px] text-muted-foreground">Beli · {RABAT_RATES.A}% harian</p>
            </div>
            <div className="rounded-xl bg-primary/5 border border-primary/10 p-2.5 text-center">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Level B</p>
              <p className="mt-0.5 font-heading text-base font-bold text-primary">{COMMISSION_RATES.B}%</p>
              <p className="text-[8px] text-muted-foreground">Beli · {RABAT_RATES.B}% harian</p>
            </div>
            <div className="rounded-xl bg-primary/5 border border-primary/10 p-2.5 text-center">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Level C</p>
              <p className="mt-0.5 font-heading text-base font-bold text-primary">{COMMISSION_RATES.C}%</p>
              <p className="text-[8px] text-muted-foreground">Beli · {RABAT_RATES.C}% harian</p>
            </div>
          </div>

          <p className="relative mt-3 text-center text-[10px] text-muted-foreground">
            Tingkatan diatur manual oleh admin — hubungi CS untuk naik level.
          </p>
        </div>

        {/* Income summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1e40af] to-[#3b82f6] text-white p-3.5 shadow-md">
            <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/10 blur-xl" />
            <div className="relative flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              <p className="text-[10px] uppercase tracking-wider opacity-80">Total Komisi</p>
            </div>
            <p className="relative mt-1.5 font-heading text-lg font-bold break-all">
              {formatCurrency(profile?.team_income || 0)}
            </p>
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-white border border-primary/10 p-3.5 shadow-sm">
            <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-primary/10 blur-xl" />
            <div className="relative flex items-center gap-1.5">
              <Gift className="w-3.5 h-3.5 text-primary" />
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Rabat Harian</p>
            </div>
            <p className="relative mt-1.5 font-heading text-lg font-bold text-primary break-all">
              {formatCurrency(profile?.rabat_income || 0)}
            </p>
          </div>
        </div>

        {/* Invitation link box */}
        <div className="bg-white rounded-2xl border border-primary/10 shadow-sm p-4 space-y-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Link undangan saya:</p>
            <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 px-3 py-2.5">
              <Link2 className="w-3.5 h-3.5 text-primary shrink-0" />
              <p className="flex-1 min-w-0 text-[10px] text-foreground truncate">{referralLink}</p>
            </div>
          </div>
          <Button
            onClick={() => copy(referralLink, "Link undangan")}
            className="w-full h-11 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold"
          >
            <Copy className="w-4 h-4" /> Salin Link Undangan
          </Button>

          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Kode undangan:</p>
            <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-primary/20 bg-white px-3 py-2">
              <p className="flex-1 font-heading text-lg font-bold text-primary tracking-widest">{referralCode}</p>
              <button
                onClick={() => copy(referralCode, "Kode")}
                className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider hover:bg-primary/90"
              >
                Salin
              </button>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground text-center">
            Bagikan poster ke lebih banyak orang untuk reward lebih besar
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={shareWhatsApp}
              variant="outline"
              className="h-10 rounded-full border-primary/30 text-primary hover:bg-primary/5 text-[11px] font-semibold"
            >
              <WhatsAppIcon size={14} /> WhatsApp
            </Button>
            <Button
              variant="outline"
              className="h-10 rounded-full border-primary/30 text-primary hover:bg-primary/5 text-[11px] font-semibold"
              onClick={() => toast({ title: "Segera hadir", description: "Fitur poster undangan segera tersedia" })}
            >
              <ImageIcon className="w-3.5 h-3.5" /> Dapatkan Poster
            </Button>
          </div>
        </div>

        {/* Info banner */}
        <div className="bg-primary/5 border border-primary/15 rounded-2xl p-3 flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
          <p className="text-[10px] text-muted-foreground leading-relaxed flex-1">
            Semakin tinggi VIP, semakin besar reward — naik level diatur admin.
          </p>
          <button className="text-[10px] text-primary font-semibold shrink-0 flex items-center gap-0.5">
            Detail <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* Team members list */}
        <div className="bg-white rounded-2xl border border-primary/10 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-primary" />
              <p className="text-[11px] font-heading font-bold uppercase tracking-wider text-foreground">
                Anggota Tim
              </p>
            </div>
            <span className="text-[10px] text-muted-foreground">{team.total} total</span>
          </div>

          <div className="flex gap-1.5 px-4 pb-3 overflow-x-auto no-scrollbar">
            {([
              { k: "all", label: `Semua · ${team.total}` },
              { k: "A", label: `A · ${team.levelA.length}` },
              { k: "B", label: `B · ${team.levelB.length}` },
              { k: "C", label: `C · ${team.levelC.length}` },
            ] as const).map((c) => (
              <button
                key={c.k}
                onClick={() => setFilter(c.k as any)}
                className={`shrink-0 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider rounded-full transition-colors ${
                  filter === c.k
                    ? "bg-primary text-primary-foreground"
                    : "bg-primary/5 text-muted-foreground hover:bg-primary/10"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {allMembers.length === 0 ? (
            <div className="py-10 text-center border-t border-primary/5">
              <Users className="w-8 h-8 text-primary/20 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Belum ada anggota</p>
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto">
              {allMembers.map(({ m, lvl }, i) => {
                const deposit = Number(m.total_recharge || 0);
                const active = deposit > 0;
                return (
                  <div
                    key={m.id}
                    className={`flex items-center gap-3 px-4 py-2.5 ${
                      i !== allMembers.length - 1 ? "border-t border-primary/5" : "border-t border-primary/5"
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      active ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                    }`}>
                      <span className="font-heading text-sm font-bold">{initial(m.name)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[12px] font-semibold text-foreground truncate">{m.name}</p>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">{lvl}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {displayPhone(m.phone)} · {titleFor(m.vip_level)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
                        {active ? "Deposit" : "Belum"}
                      </p>
                      <p className={`text-[11px] font-mono font-bold break-all ${active ? "text-primary" : "text-muted-foreground"}`}>
                        {active ? formatCurrency(deposit) : "—"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Team;
