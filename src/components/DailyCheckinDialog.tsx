import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/database";
import { CalendarCheck, Gift, Sparkles, PartyPopper, Coins, Lock } from "lucide-react";

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

// Hari dalam seminggu: 1=Senin, 2=Selasa, ..., 7=Minggu
const DAY_LABELS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

// Dapatkan nomor hari saat ini (1=Senin, ..., 7=Minggu)
const getTodayDayNumber = (): number => {
  const jsDay = new Date().getDay(); // 0=Minggu, 1=Sen, ..., 6=Sab
  return jsDay === 0 ? 7 : jsDay; // konversi: Minggu jadi 7
};

// Dapatkan tanggal awal minggu ini (Senin)
const getStartOfWeek = (): Date => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Minggu
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // mundur ke Senin
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

    // Ambil checkin mulai dari Senin minggu ini
    const startOfWeek = getStartOfWeek();

    const { data } = await supabase
      .from("daily_checkins")
      .select("day_number, reward_amount, checked_in_at")
      .eq("user_id", user.id)
      .gte("checked_in_at", startOfWeek.toISOString())
      .order("checked_in_at", { ascending: true });

    const records = (data || []) as CheckinRecord[];
    setCheckins(records);

    // Cek apakah sudah check-in hari ini
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
      // Random reward 100-999
      const reward = Math.floor(Math.random() * 900) + 100;
      setRewardAmount(reward);

      await supabase.from("daily_checkins").insert({
        user_id: user.id,
        day_number: todayDayNumber,
        reward_amount: reward,
      });

      // Tambah reward ke saldo
      await supabase
        .from("profiles")
        .update({ balance: profile.balance + reward })
        .eq("user_id", user.id);

      setCanCheckin(false);
      setShowReward(true);
      await refreshProfile();
      onSuccess?.();

      toast({
        title: "🎁 Check-in Berhasil!",
        description: `Anda mendapat hadiah ${formatCurrency(reward)}`,
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

  // Map checkin records berdasarkan day_number di minggu ini
  const checkedDaysMap = new Map<number, CheckinRecord>();
  checkins.forEach((c) => {
    checkedDaysMap.set(c.day_number, c);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border-primary/30">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-heading flex items-center justify-center gap-2">
            <CalendarCheck className="w-5 h-5 text-primary" />
            Check-in Harian
          </DialogTitle>
        </DialogHeader>

        {/* Reward animation */}
        {showReward ? (
          <div className="relative py-6">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute animate-confetti"
                  style={{
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 0.5}s`,
                    animationDuration: `${1 + Math.random() * 1}s`,
                  }}
                >
                  <Sparkles
                    className="w-4 h-4"
                    style={{
                      color: ["#00F5FF", "#FF00E5", "#FFD700", "#00FF88"][
                        Math.floor(Math.random() * 4)
                      ],
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-col items-center gap-4 animate-scale-in">
              <div className="relative animate-bounce">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-success via-primary to-accent flex items-center justify-center">
                  <PartyPopper className="w-10 h-10 text-primary-foreground" />
                </div>
                <div className="absolute -top-2 -right-2 animate-ping">
                  <Coins className="w-5 h-5 text-accent" />
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm text-muted-foreground">Hadiah Hari Ini</p>
                <p className="text-3xl font-bold text-success">
                  +{formatCurrency(rewardAmount)}
                </p>
                <p className="text-sm text-success animate-fade-in">
                  Berhasil ditambahkan ke saldo!
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Minggu ini label */}
            <p className="text-center text-xs text-muted-foreground -mb-2">
              Minggu ini — Hari terlewat tidak bisa diklaim
            </p>

            {/* 7-day grid berbasis hari kalender */}
            <div className="grid grid-cols-7 gap-1.5 py-4">
              {DAY_LABELS.map((label, i) => {
                const dayNum = i + 1; // 1=Sen, ..., 7=Min
                const record = checkedDaysMap.get(dayNum);
                const isChecked = !!record;
                const isToday = dayNum === todayDayNumber;
                const isFuture = dayNum > todayDayNumber;
                const isMissed = !isChecked && !isToday && !isFuture; // hari lalu yg terlewat

                return (
                  <div key={dayNum} className="flex flex-col items-center gap-1">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all ${
                        isChecked
                          ? "bg-success text-success-foreground shadow-md shadow-success/30"
                          : isToday && canCheckin
                          ? "bg-primary/20 border-2 border-primary text-primary animate-pulse"
                          : isToday && !canCheckin
                          ? "bg-success/60 text-success-foreground"
                          : isMissed
                          ? "bg-destructive/10 text-destructive/40"
                          : isFuture
                          ? "bg-muted text-muted-foreground/40"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isChecked ? (
                        <Gift className="w-4 h-4" />
                      ) : isMissed ? (
                        <Lock className="w-3 h-3" />
                      ) : (
                        dayNum
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-medium ${
                        isToday
                          ? "text-primary"
                          : isMissed
                          ? "text-destructive/40"
                          : "text-muted-foreground"
                      }`}
                    >
                      {label}
                    </span>
                    {isToday && (
                      <span className="text-[8px] text-primary font-bold">Hari ini</span>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="text-center text-sm text-muted-foreground">
              {canCheckin
                ? `Belum check-in hari ini (${DAY_LABELS[todayDayNumber - 1]}). Klaim hadiah acak!`
                : "Anda sudah check-in hari ini. Kembali besok! 🎉"}
            </p>

            <Button
              onClick={handleCheckin}
              disabled={!canCheckin || isChecking}
              className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground font-semibold h-12"
            >
              <CalendarCheck className="w-5 h-5 mr-2" />
              {isChecking
                ? "Memproses..."
                : canCheckin
                ? "Check-in Sekarang"
                : "Sudah Check-in ✓"}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DailyCheckinDialog;
