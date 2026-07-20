import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/database";
import { CalendarCheck, Coins, Lock, Check, Flame, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

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
        title: "Absen berhasil",
        description: `+${formatCurrency(reward)} masuk ke saldo`,
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
  const weekTotal = checkins.reduce((s, c) => s + Number(c.reward_amount || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 overflow-hidden border-0 bg-[#f0fbf4]">
        {/* Header */}
        <div className="relative px-5 pt-5 pb-4 bg-white border-b border-emerald-100">
          <DialogHeader className="text-left space-y-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#10b981] to-[#065f46] flex items-center justify-center shadow-md shadow-emerald-500/30">
                <CalendarCheck className="w-4 h-4 text-white" />
              </div>
              <div>
                <DialogTitle className="text-foreground font-heading text-[15px] font-bold leading-tight">
                  Absen Harian
                </DialogTitle>
                <p className="text-[10px] text-muted-foreground">Klaim bonus tiap hari</p>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2">
              <div className="flex items-center gap-1 text-primary">
                <Flame className="w-3 h-3" />
                <p className="text-[9px] font-semibold uppercase tracking-wider">Streak</p>
              </div>
              <p className="text-foreground text-sm font-heading font-bold leading-tight mt-0.5">
                {streak}<span className="text-[10px] font-medium text-muted-foreground ml-1">hari</span>
              </p>
            </div>
            <div className="rounded-xl bg-lime-50 border border-lime-100 px-3 py-2">
              <div className="flex items-center gap-1 text-lime-700">
                <Coins className="w-3 h-3" />
                <p className="text-[9px] font-semibold uppercase tracking-wider">Minggu ini</p>
              </div>
              <p className="text-foreground text-sm font-heading font-bold leading-tight mt-0.5 break-all">
                {formatCurrency(weekTotal)}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Weekly grid */}
          <div className="rounded-2xl bg-white border border-emerald-100 p-3.5">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[10px] font-heading font-bold uppercase tracking-wider text-foreground">
                Minggu Ini
              </p>
              <p className="text-[9px] text-muted-foreground">Sen — Min</p>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {DAY_LABELS.map((label, i) => {
                const dayNum = i + 1;
                const record = checkedDaysMap.get(dayNum);
                const isChecked = !!record;
                const isToday = dayNum === todayDayNumber;
                const isFuture = dayNum > todayDayNumber;
                const isMissed = !isChecked && !isToday && !isFuture;

                return (
                  <div key={dayNum} className="flex flex-col items-center gap-1">
                    <span
                      className={cn(
                        "text-[9px] font-semibold uppercase tracking-wider",
                        isToday ? "text-primary" : "text-muted-foreground"
                      )}
                    >
                      {label}
                    </span>
                    <div
                      className={cn(
                        "w-full aspect-square rounded-lg flex items-center justify-center text-[10px] font-heading font-bold transition-all",
                        isChecked &&
                          "bg-gradient-to-br from-[#10b981] to-[#065f46] text-white shadow-md shadow-emerald-500/30",
                        isToday &&
                          canCheckin &&
                          "bg-white text-primary border-2 border-primary border-dashed animate-pulse",
                        isToday &&
                          !canCheckin &&
                          !isChecked &&
                          "bg-gradient-to-br from-[#10b981] to-[#065f46] text-white",
                        isMissed && "bg-red-50 text-red-300 border border-red-100",
                        isFuture && "bg-emerald-50/60 text-muted-foreground/50 border border-emerald-100"
                      )}
                    >
                      {isChecked ? (
                        <Check className="w-3.5 h-3.5" strokeWidth={3} />
                      ) : isMissed ? (
                        <Lock className="w-3 h-3" />
                      ) : isToday ? (
                        <Zap className="w-3.5 h-3.5" strokeWidth={2.5} />
                      ) : (
                        <span>{dayNum}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reward card */}
          {showReward ? (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#065f46] via-[#047857] to-[#10b981] p-4 shadow-lg shadow-emerald-500/30">
              <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-lime-300/20 blur-2xl" />
              <div className="relative flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 backdrop-blur flex items-center justify-center shrink-0">
                  <Coins className="w-6 h-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] uppercase tracking-widest text-white/70 font-semibold">
                    Hadiah hari ini
                  </p>
                  <p className="text-white text-xl font-heading font-bold break-all leading-tight">
                    +{formatCurrency(rewardAmount)}
                  </p>
                  <p className="text-[10px] text-lime-200 font-semibold mt-0.5">
                    Sudah masuk saldo
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-white border border-emerald-100 px-3.5 py-3 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-heading font-bold text-foreground leading-tight">
                  {canCheckin ? "Klaim bonus acak Rp 100 – Rp 1.000" : "Absen hari ini sudah selesai"}
                </p>
                <p className="text-[9px] text-muted-foreground mt-0.5">
                  {canCheckin ? "Konsisten setiap hari untuk streak" : "Kembali besok untuk klaim lagi"}
                </p>
              </div>
            </div>
          )}

          <Button
            onClick={handleCheckin}
            disabled={!canCheckin || isChecking}
            className="w-full h-11 rounded-2xl bg-gradient-to-r from-[#10b981] to-[#065f46] hover:opacity-95 text-white text-xs font-bold shadow-md shadow-emerald-500/30 disabled:opacity-60"
          >
            {isChecking ? "Memproses..." : canCheckin ? "Absen Sekarang" : "Sudah Absen"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DailyCheckinDialog;
