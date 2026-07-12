import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, updateProfile, createTransaction } from "@/lib/database";
import { Sparkles, Gift, Ticket, PackageOpen } from "lucide-react";

interface SpinWheelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Reward {
  label: string;
  amount: number;
  fill: string;
  weight: number;
}
const FALLBACK_REWARDS: Reward[] = [
  { label: "1K", amount: 1000, fill: "hsl(217 90% 58%)", weight: 35 },
  { label: "2K", amount: 2000, fill: "hsl(199 89% 48%)", weight: 28 },
  { label: "3K", amount: 3000, fill: "hsl(217 90% 50%)", weight: 17 },
  { label: "5K", amount: 5000, fill: "hsl(231 80% 55%)", weight: 10 },
  { label: "10K", amount: 10000, fill: "hsl(217 90% 42%)", weight: 5 },
  { label: "15K", amount: 15000, fill: "hsl(262 70% 55%)", weight: 3 },
  { label: "25K", amount: 25000, fill: "hsl(38 92% 50%)", weight: 1.5 },
  { label: "50K", amount: 50000, fill: "hsl(45 96% 55%)", weight: 0.5 },
];

const SpinWheelDialog = ({ open, onOpenChange, onSuccess }: SpinWheelDialogProps) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<{ id: string }[]>([]);
  const [opening, setOpening] = useState(false);
  const [rewards, setRewards] = useState<Reward[]>(FALLBACK_REWARDS);
  const [pickedBox, setPickedBox] = useState<number | null>(null);
  const [revealedIdx, setRevealedIdx] = useState<number | null>(null);

  const loadRewards = async () => {
    const { data } = await supabase
      .from("spin_rewards")
      .select("label, amount, fill, weight")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (data && data.length > 0) {
      setRewards(
        data.map((r: any) => ({
          label: r.label,
          amount: Number(r.amount),
          fill: r.fill,
          weight: Number(r.weight),
        }))
      );
    }
  };

  const loadTickets = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("spin_tickets")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_used", false);
    setTickets(data || []);
  };

  useEffect(() => {
    if (open) {
      loadRewards();
      loadTickets();
      setPickedBox(null);
      setRevealedIdx(null);
    }
  }, [open, user]);

  const handlePickBox = async (boxIdx: number) => {
    if (!user || !profile || tickets.length === 0 || opening) return;
    setOpening(true);
    setPickedBox(boxIdx);

    const ticket = tickets[0];
    const totalW = rewards.reduce((a, b) => a + b.weight, 0);
    let r = Math.random() * totalW;
    let idx = 0;
    for (let i = 0; i < rewards.length; i++) {
      r -= rewards[i].weight;
      if (r <= 0) {
        idx = i;
        break;
      }
    }

    setTimeout(async () => {
      const reward = rewards[idx].amount;
      const rewardLabel = rewards[idx].label;
      const isCash = reward > 0;
      try {
        await supabase
          .from("spin_tickets")
          .update({ is_used: true, used_at: new Date().toISOString(), reward_amount: reward })
          .eq("id", ticket.id);

        if (isCash) {
          await updateProfile(user.id, {
            balance: (profile.balance || 0) + reward,
            total_income: (profile.total_income || 0) + reward,
          });
        }

        await createTransaction({
          user_id: user.id,
          type: "spin_reward",
          amount: reward,
          status: "success",
          description: isCash
            ? `Hadiah Kotak Kejutan Rp ${rewardLabel}`
            : `Hadiah Kotak Kejutan: ${rewardLabel} (klaim ke admin)`,
        });

        setRevealedIdx(idx);
        await loadTickets();
        onSuccess();
        toast({
          title: "🎉 Selamat!",
          description: isCash
            ? `Anda mendapatkan ${formatCurrency(reward)}`
            : `Anda mendapatkan ${rewardLabel}! Hubungi admin untuk klaim.`,
        });
      } catch (err) {
        toast({ title: "Gagal", description: "Gagal memproses hadiah", variant: "destructive" });
      } finally {
        setOpening(false);
      }
    }, 1600);
  };

  const reset = () => {
    setPickedBox(null);
    setRevealedIdx(null);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !opening && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0">
        {/* Gradient header */}
        <div className="relative overflow-hidden pt-6 pb-14 px-5 bg-gradient-to-br from-[#1e3a8a] via-[#1e40af] to-[#3b82f6]">
          <div className="absolute -top-8 -right-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute top-4 -left-8 w-28 h-28 rounded-full bg-cyan-300/20 blur-xl" />
          <Sparkles className="absolute top-3 right-6 w-3.5 h-3.5 text-white/40" />
          <Sparkles className="absolute top-14 left-8 w-3 h-3 text-white/30" />

          <DialogHeader className="relative text-left space-y-0.5">
            <p className="text-[9px] uppercase tracking-[0.3em] text-white/70 font-semibold">
              Reward Referral
            </p>
            <DialogTitle className="text-white font-heading text-xl font-bold flex items-center gap-2">
              <Gift className="w-5 h-5" />
              Kotak Kejutan
            </DialogTitle>
          </DialogHeader>

          <div className="relative mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/25 px-3 py-1">
            <Ticket className="w-3 h-3 text-white" />
            <span className="text-[10px] font-semibold text-white">
              {tickets.length} tiket tersedia
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="px-5 -mt-8 pb-5 space-y-4">
          <div className="rounded-2xl bg-white border border-primary/10 shadow-lg p-5">
            <p className="text-center text-[11px] text-muted-foreground">
              {revealedIdx !== null
                ? "Kotak terbuka!"
                : opening
                ? "Membuka kotak..."
                : "Pilih salah satu kotak — hadiah acak di dalam!"}
            </p>

            <div className="mt-4 grid grid-cols-3 gap-3">
              {[0, 1, 2].map((i) => {
                const isPicked = pickedBox === i;
                const isOpen = isPicked && revealedIdx !== null;
                const isDim = pickedBox !== null && !isPicked;
                return (
                  <button
                    key={i}
                    disabled={opening || tickets.length === 0 || pickedBox !== null}
                    onClick={() => handlePickBox(i)}
                    className={`group relative aspect-square rounded-2xl border-2 transition-all overflow-hidden ${
                      isOpen
                        ? "border-primary bg-gradient-to-br from-primary/20 to-cyan-100 scale-105"
                        : isPicked
                        ? "border-primary bg-primary/10 animate-pulse"
                        : isDim
                        ? "border-border bg-muted/40 opacity-40"
                        : "border-primary/30 bg-gradient-to-br from-[#1e40af] to-[#3b82f6] hover:scale-105 hover:border-primary shadow-md"
                    } disabled:cursor-not-allowed`}
                  >
                    {/* Ribbon lines */}
                    {!isOpen && (
                      <>
                        <div className={`absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 ${isDim ? "bg-muted-foreground/30" : "bg-white/40"}`} />
                        <div className={`absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 ${isDim ? "bg-muted-foreground/30" : "bg-white/40"}`} />
                      </>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                      {isOpen ? (
                        <div className="text-center px-1">
                          <PackageOpen className="w-6 h-6 text-primary mx-auto" />
                          <p className="mt-1 text-[10px] font-bold text-primary break-all leading-tight">
                            {rewards[revealedIdx!].amount > 0
                              ? formatCurrency(rewards[revealedIdx!].amount)
                              : rewards[revealedIdx!].label}
                          </p>
                        </div>
                      ) : (
                        <Gift className={`w-8 h-8 ${isDim ? "text-muted-foreground/50" : "text-white"} ${isPicked ? "animate-bounce" : ""}`} />
                      )}
                    </div>
                    {!isOpen && !isDim && (
                      <span className="absolute top-1 right-1.5 text-[9px] font-bold text-white/80">
                        #{i + 1}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {revealedIdx !== null && (
              <div className="mt-4 text-center animate-fade-in">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                  Anda mendapatkan
                </p>
                <p className="mt-0.5 font-heading text-xl font-bold text-success break-all">
                  {rewards[revealedIdx].amount > 0
                    ? formatCurrency(rewards[revealedIdx].amount)
                    : rewards[revealedIdx].label}
                </p>
              </div>
            )}
          </div>

          {revealedIdx !== null ? (
            <Button
              onClick={reset}
              disabled={tickets.length === 0}
              className="w-full h-11 rounded-full bg-gradient-to-r from-[#1e40af] to-[#3b82f6] text-white text-xs font-bold shadow-md"
            >
              <Gift className="w-4 h-4 mr-1.5" />
              {tickets.length === 0 ? "Tiket Habis" : "Buka Kotak Lagi"}
            </Button>
          ) : (
            tickets.length === 0 && (
              <p className="text-[10px] text-center text-muted-foreground">
                Undang teman pakai kode referral untuk dapat tiket gratis!
              </p>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SpinWheelDialog;
