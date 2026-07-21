import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCoupon, formatCurrency } from "@/lib/database";
import { Ticket, Gift, X, Sparkles } from "lucide-react";

interface CouponDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  prefillCode?: string;
}

const CouponDialog = ({ open, onOpenChange, onSuccess, prefillCode }: CouponDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [couponCode, setCouponCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [reward, setReward] = useState<number | null>(null);
  const [showReward, setShowReward] = useState(false);

  useEffect(() => {
    if (open && prefillCode) setCouponCode(prefillCode.replace(/\D/g, ""));
  }, [open, prefillCode]);

  const handleSubmit = async () => {
    if (!couponCode.trim()) {
      toast({ title: "Error", description: "Masukkan kode redeem", variant: "destructive" });
      return;
    }
    if (!user) return;
    setIsLoading(true);
    const result = await useCoupon(couponCode, user.id);
    setIsLoading(false);
    if (!result.success) {
      toast({ title: "Error", description: result.message, variant: "destructive" });
      return;
    }
    setReward(result.reward || 0);
    setShowReward(true);
  };

  const handleClose = () => {
    setCouponCode("");
    setReward(null);
    setShowReward(false);
    onOpenChange(false);
    if (reward) onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden rounded-3xl border-0 shadow-2xl">
        <div className="relative bg-gradient-to-br from-[#065f46] via-[#047857] to-[#10b981] text-white px-5 pt-5 pb-8">
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" />
          <div className="absolute -left-6 -bottom-6 w-32 h-32 rounded-full bg-lime-300/15" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-[9px] uppercase tracking-[0.32em] text-white/70 font-semibold">Bonus</p>
              <h2 className="text-lg font-heading font-bold mt-0.5">Redeem Code</h2>
              <p className="text-[10px] text-white/70 mt-0.5">Masukkan kode angka dari admin</p>
            </div>
            <button onClick={handleClose} className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="bg-white px-5 pt-6 pb-6 -mt-3 rounded-t-3xl relative">
          {showReward && reward ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-[#10b981] to-[#065f46] rounded-full flex items-center justify-center animate-bounce shadow-lg shadow-emerald-500/40">
                <Gift className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-lg font-heading font-bold text-foreground">Selamat!</h3>
              <p className="text-[11px] text-muted-foreground">Kamu mendapatkan hadiah</p>
              <p className="text-2xl font-heading font-bold text-emerald-600 break-all">{formatCurrency(reward)}</p>
              <Button className="w-full h-11 rounded-full bg-gradient-to-br from-[#10b981] to-[#065f46] text-white text-xs font-bold" onClick={handleClose}>
                Klaim Sekarang
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center -mt-8 border-4 border-white shadow-sm">
                <Ticket className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary/70 text-center mb-2">Kode Angka</p>
                <Input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="• • • • • • • •"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.replace(/\D/g, ""))}
                  className="text-center text-xl font-mono tracking-[0.4em] h-14 rounded-2xl border-emerald-200 focus-visible:ring-emerald-400 bg-emerald-50/40"
                />
              </div>
              <div className="flex items-start gap-2 p-3 rounded-2xl bg-gradient-to-br from-emerald-50 to-lime-50 border border-emerald-100">
                <Sparkles className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground leading-relaxed">Redeem code diberikan admin sebagai bonus loyalitas member.</p>
              </div>
              <Button className="w-full h-11 rounded-full bg-gradient-to-br from-[#10b981] to-[#065f46] text-white text-xs font-bold shadow-md shadow-emerald-500/30" onClick={handleSubmit} disabled={isLoading || !couponCode.trim()}>
                {isLoading ? "Memproses..." : "Klaim Hadiah"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CouponDialog;
