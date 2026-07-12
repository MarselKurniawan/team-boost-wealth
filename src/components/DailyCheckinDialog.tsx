import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/database";
import { CalendarCheck, Gift, Sparkles, Coins, Lock, Check, Flame } from "lucide-react";

interface CheckinRecord {
  day_number: number;
  reward_amount: number;
  checked_in_at: string;
}

interface DailyCheckinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const DAY_LABELS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

const getTodayDayNumber = (): number => {
  const jsDay = new Date().getDay();
  return jsDay === 0 ? 7 : jsDay;
};

const getStartOfWeek = (): Date => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
};

const DailyCheckinDialog = ({ open, onOpenChange, onSuccess }: DailyCheckinDialogProps) => {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [checkins, setCheckins] = useState<CheckinRecord[]>([]);
  const [canCheckin, setCanCheckin] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [rewardAmount, setRewardAmount] = useState(0);
  const [isChecking, setIsChecking] = useState(false);

  const todayDayNumber = getTodayDayNumber();

  useEffect(() => {
    if (open && user) loadCheckins();
  }, [open, user]);

  const loadCheckins = async () => {
    if (!user) return;
    const startOfWeek = getStartOfWeek();
    const { data } = await supabase
      .from("daily_checkins")
      .select("day_number, reward_amount, checked_in_at")
      .eq("user_id", user.id)
      .gte("checked_in_at", startOfWeek.toISOString())
      .order("checked_in_at", { ascending: true });

    const records = (data || []) as CheckinRecord[];
    setCheckins(records);

    const today = new Date().toDateString();
    const checkedToday = records.some(
      (r) => new Date(r.checked_in_at).toDateString() === today
    );
    setCanCheckin(!checkedToday);
    setShowReward(false);
  };

  const handleCheckin = async () => {
    if (!user || !profile || !canCheckin || isChecking) return;
    setIsChecking(true);

    try {
      const reward = Math.floor(Math.random() * 900) + 100;
      setRewardAmount(reward);

      await supabase.from("daily_checkins").insert({
        user_id: user.id,
        day_number: todayDayNumber,
        reward_amount: reward,
      });

      await supabase
        .from("profiles")
        .update({ balance: profile.balance + reward })
        .eq("user_id", user.id);

      setCanCheckin(false);
      setShowReward(true);
      await refreshProfile();
      onSuccess?.();

      toast({
        title: "🎁 Berhasil!",
        description: `Anda mendapat ${formatCurrency(reward)}`,
      });
    } catch (error) {
      console.error("Checkin error:", error);
      toast({
        title: "Gagal Check-in",
        description: "Terjadi kesalahan, coba lagi nanti.",
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  const checkedDaysMap = new Map<number, CheckinRecord>();
  checkins.forEach((c) => checkedDaysMap.set(c.day_number, c));
  const streak = checkins.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 overflow-hidden border-0">
        {/* Gradient header */}
        <div className="relative overflow-hidden pt-6 pb-14 px-5 bg-gradient-to-br from-[#1e3a8a] via-[#1e40af] to-[#3b82f6]">
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute top-4 -left-8 w-24 h-24 rounded-full bg-cyan-300/20 blur-xl" />
          <Sparkles className="absolute top-3 right-6 w-3.5 h-3.5 text-white/40" />

          <DialogHeader className="relative text-left space-y-0.5">
            <p className="text-[9px] uppercase tracking-[0.3em] text-white/70 font-semibold">Absen Harian</p>
            <DialogTitle className="text-white font-heading text-xl font-bold flex items-center gap-2">
              <CalendarCheck className="w-5 h-5" />
              Check-in Hari Ini
            </DialogTitle>
          </DialogHeader>

          <div className="relative mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/25 px-3 py-1">
            <Flame className="w-3 h-3 text-amber-200" />
            <span className="text-[10px] font-semibold text-white">
              Streak minggu ini: {streak} hari
            </span>
          </div>
        </div>

        <div className="px-5 -mt-8 pb-5 space-y-4">
          {/* Reward card / calendar */}
          {showReward ? (
            <div className="relative rounded-2xl bg-white border border-primary/10 shadow-lg p-5 text-center overflow-hidden">
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(14)].map((_, i) => (
                  <Sparkles
                    key={i}
                    className="absolute animate-confetti"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      width: 10 + Math.random() * 8,
                      height: 10 + Math.random() * 8,
                      color: ["#3b82f6", "#06b6d4", "#f59e0b", "#22c55e"][i % 4],
                      animationDelay: `${Math.random() * 0.4}s`,
                    }}
                  />
                ))}
              </div>
              <div className="relative mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1e40af] to-[#3b82f6] flex items-center justify-center shadow-md">
                <Coins className="w-8 h-8 text-white" />
              </div>
              <p className="relative mt-3 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                Hadiah Hari Ini
              </p>
              <p className="relative mt-1 font-heading text-3xl font-bold text-primary break-all">
                +{formatCurrency(rewardAmount)}
              </p>
              <p className="relative mt-1 text-[10px] text-success font-semibold">
                Ditambahkan ke saldo
              </p>
            </div>
          ) : (
            <div className="rounded-2xl bg-white border border-primary/10 shadow-lg p-4">
              <p className="text-center text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                Minggu Ini
              </p>
              <div className="mt-3 grid grid-cols-7 gap-1.5">
                {DAY_LABELS.map((label, i) => {
                  const dayNum = i + 1;
                  const record = checkedDaysMap.get(dayNum);
                  const isChecked = !!record;
                  const isToday = dayNum === todayDayNumber;
                  const isFuture = dayNum > todayDayNumber;
                  const isMissed = !isChecked && !isToday && !isFuture;

                  return (
                    <div key={dayNum} className="flex flex-col items-center gap-1">
                      <div
                        className={`w-9 h-10 rounded-xl flex items-center justify-center text-[11px] font-bold transition-all ${
                          isChecked
                            ? "bg-gradient-to-br from-[#1e40af] to-[#3b82f6] text-white shadow-md"
                            : isToday && canCheckin
                            ? "bg-primary/10 border-2 border-primary text-primary"
                            : isToday && !canCheckin
                            ? "bg-gradient-to-br from-[#1e40af] to-[#3b82f6] text-white"
                            : isMissed
                            ? "bg-destructive/5 text-destructive/40 border border-dashed border-destructive/20"
                            : "bg-muted/60 text-muted-foreground/60"
                        }`}
                      >
                        {isChecked ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : isMissed ? (
                          <Lock className="w-3 h-3" />
                        ) : (
                          <Gift className={`w-3.5 h-3.5 ${isToday ? "" : "opacity-50"}`} />
                        )}
                      </div>
                      <span
                        className={`text-[9px] font-semibold uppercase tracking-wider ${
                          isToday
                            ? "text-primary"
                            : isChecked
                            ? "text-primary/70"
                            : isMissed
                            ? "text-destructive/40"
                            : "text-muted-foreground"
                        }`}
                      >
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-center text-[10px] text-muted-foreground">
                Hari terlewat tidak bisa diklaim mundur
              </p>
            </div>
          )}

          {!showReward && (
            <p className="text-center text-[11px] text-foreground/80">
              {canCheckin
                ? `Klaim hadiah acak hari ini (${DAY_LABELS[todayDayNumber - 1]})`
                : "Anda sudah check-in — kembali besok 🎉"}
            </p>
          )}

          <Button
            onClick={handleCheckin}
            disabled={!canCheckin || isChecking}
            className="w-full h-11 rounded-full bg-gradient-to-r from-[#1e40af] to-[#3b82f6] hover:opacity-95 text-white text-xs font-bold shadow-md"
          >
            <Gift className="w-4 h-4 mr-1.5" />
            {isChecking ? "Memproses..." : canCheckin ? "Klaim Sekarang" : "Sudah Check-in ✓"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DailyCheckinDialog;
