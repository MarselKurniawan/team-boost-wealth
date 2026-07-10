import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, updateProfile, createTransaction } from "@/lib/database";
import { Sparkles, Gift, Ticket } from "lucide-react";

interface SpinWheelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Reward { label: string; amount: number; fill: string; weight: number; }
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

// Helper: build SVG path untuk satu segmen pie
const polarToCart = (cx: number, cy: number, r: number, deg: number) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

const segmentPath = (cx: number, cy: number, r: number, startDeg: number, endDeg: number) => {
  const start = polarToCart(cx, cy, r, endDeg);
  const end = polarToCart(cx, cy, r, startDeg);
  const largeArc = endDeg - startDeg <= 180 ? 0 : 1;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
};

const SpinWheelDialog = ({ open, onOpenChange, onSuccess }: SpinWheelDialogProps) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<{ id: string }[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [resultIdx, setResultIdx] = useState<number | null>(null);
  const [REWARDS, setRewards] = useState<Reward[]>(FALLBACK_REWARDS);
  const N = REWARDS.length || 1;
  const SEGMENT_DEG = 360 / N;

  const loadRewards = async () => {
    const { data } = await supabase
      .from("spin_rewards")
      .select("label, amount, fill, weight")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (data && data.length > 0) {
      setRewards(data.map((r: any) => ({ label: r.label, amount: Number(r.amount), fill: r.fill, weight: Number(r.weight) })));
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
      setResultIdx(null);
    }
  }, [open, user]);

  const handleSpin = async () => {
    if (!user || !profile || tickets.length === 0 || spinning) return;
    setSpinning(true);
    setResultIdx(null);

    const ticket = tickets[0];
    const totalW = REWARDS.reduce((a, b) => a + b.weight, 0);
    let r = Math.random() * totalW;
    let idx = 0;
    for (let i = 0; i < REWARDS.length; i++) {
      r -= REWARDS[i].weight;
      if (r <= 0) { idx = i; break; }
    }

    // Pointer di atas (12 o'clock). Pusat segmen idx ada di sudut idx*SEG + SEG/2 (searah jam dari atas).
    // Wheel berputar berlawanan: untuk bawa segmen ke atas, perlu rotate -(idx*SEG + SEG/2).
    const targetAngle = -(idx * SEGMENT_DEG + SEGMENT_DEG / 2);
    const currentMod = ((rotation % 360) + 360) % 360;
    const desiredMod = ((targetAngle % 360) + 360) % 360;
    let delta = desiredMod - currentMod;
    if (delta <= 0) delta += 360;
    const finalRotation = rotation + 360 * 6 + delta;
    setRotation(finalRotation);

    setTimeout(async () => {
      const reward = REWARDS[idx].amount;
      const rewardLabel = REWARDS[idx].label;
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
            ? `Hadiah Roda Keberuntungan Rp ${rewardLabel}`
            : `Hadiah Roda Keberuntungan: ${rewardLabel} (klaim ke admin)`,
        });

        setResultIdx(idx);
        await loadTickets();
        onSuccess();
        toast({
          title: "🎉 Selamat!",
          description: isCash ? `Anda mendapatkan ${formatCurrency(reward)}` : `Anda mendapatkan ${rewardLabel}! Hubungi admin untuk klaim.`,
        });
      } catch (err) {
        toast({ title: "Gagal", description: "Gagal memproses spin", variant: "destructive" });
      } finally {
        setSpinning(false);
      }
    }, 3600);
  };

  const SIZE = 260;
  const CENTER = SIZE / 2;
  const RADIUS = SIZE / 2 - 6;

  return (
    <Dialog open={open} onOpenChange={(o) => !spinning && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-2">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="w-4 h-4 text-primary" /> Roda Keberuntungan
          </DialogTitle>
          <DialogDescription className="text-[11px]">
            Putar roda untuk dapat hadiah. 1 referral berhasil = 1 putaran.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 space-y-3">
          {/* Tickets */}
          <div className="flex items-center justify-between bg-card/60 border border-border/60 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              <Ticket className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] text-muted-foreground">Tiket Tersedia</span>
            </div>
            <Badge className="bg-primary/15 text-primary border-primary/30 hover:bg-primary/15 text-[10px]">
              {tickets.length} tiket
            </Badge>
          </div>

          {/* Wheel */}
          <div className="relative mx-auto" style={{ width: SIZE, height: SIZE + 16 }}>
            {/* Pointer */}
            <div className="absolute left-1/2 -translate-x-1/2 top-0 z-20">
              <svg width="22" height="22" viewBox="0 0 22 22">
                <path d="M11 22 L2 4 Q11 0 20 4 Z" fill="hsl(var(--primary))" stroke="hsl(var(--background))" strokeWidth="1.5" />
              </svg>
            </div>

            {/* Outer ring */}
            <div
              className="absolute top-3 left-0 rounded-full"
              style={{
                width: SIZE,
                height: SIZE,
                background: "hsl(var(--primary) / 0.25)",
                padding: 4,
              }}
            >
              <svg
                width={SIZE - 8}
                height={SIZE - 8}
                viewBox={`0 0 ${SIZE} ${SIZE}`}
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: spinning ? "transform 3.5s cubic-bezier(0.17, 0.67, 0.16, 0.99)" : "none",
                  willChange: "transform",
                  display: "block",
                }}
              >
                {REWARDS.map((rw, i) => {
                  const startDeg = i * SEGMENT_DEG;
                  const endDeg = (i + 1) * SEGMENT_DEG;
                  const midDeg = startDeg + SEGMENT_DEG / 2;
                  const labelPos = polarToCart(CENTER, CENTER, RADIUS * 0.65, midDeg);
                  return (
                    <g key={i}>
                      <path
                        d={segmentPath(CENTER, CENTER, RADIUS, startDeg, endDeg)}
                        fill={rw.fill}
                        stroke="hsl(var(--background))"
                        strokeWidth="1.5"
                      />
                      <text
                        x={labelPos.x}
                        y={labelPos.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize="13"
                        fontWeight="700"
                        fill="white"
                        transform={`rotate(${midDeg} ${labelPos.x} ${labelPos.y})`}
                      >
                        {rw.label}
                      </text>
                    </g>
                  );
                })}
                {/* Center hub */}
                <circle cx={CENTER} cy={CENTER} r="22" fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="2" />
              </svg>

              {/* Center icon overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-10 h-10 rounded-full bg-card border-2 border-primary/40 flex items-center justify-center">
                  <Gift className="w-4 h-4 text-primary" />
                </div>
              </div>
            </div>
          </div>

          {/* Result */}
          {resultIdx !== null && !spinning && (
            <div className="text-center py-1">
              <p className="text-[10px] text-muted-foreground">Anda mendapatkan</p>
              <p className="text-lg font-bold text-success break-all">
                {REWARDS[resultIdx].amount > 0 ? formatCurrency(REWARDS[resultIdx].amount) : REWARDS[resultIdx].label}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-3 space-y-2">
          <Button
            className="w-full h-10 text-xs font-semibold"
            onClick={handleSpin}
            disabled={spinning || tickets.length === 0}
          >
            {spinning ? "Memutar..." : tickets.length === 0 ? "Tidak Ada Tiket" : "PUTAR SEKARANG"}
          </Button>
          {tickets.length === 0 && (
            <p className="text-[10px] text-center text-muted-foreground">
              Undang teman pakai kode referral untuk dapat tiket spin gratis!
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SpinWheelDialog;
