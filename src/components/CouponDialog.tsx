import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCoupon, formatCurrency } from "@/lib/database";
import { Ticket, Gift, Sparkles } from "lucide-react";

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
    if (open && prefillCode) setCouponCode(prefillCode.toUpperCase());
  }, [open, prefillCode]);

  const handleSubmit = async () => {
    if (!couponCode.trim()) {
      toast({ title: "Error", description: "Masukkan kode kupon", variant: "destructive" });
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
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Ticket className="w-5 h-5 text-accent" />Kode Kupon</DialogTitle>
          <DialogDescription>Masukkan kode kupon untuk mendapatkan hadiah</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {showReward && reward ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-vip-gold to-accent rounded-full flex items-center justify-center animate-bounce">
                <Gift className="w-10 h-10 text-white" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5 text-vip-gold" /><h3 className="text-xl font-bold text-foreground">Selamat!</h3><Sparkles className="w-5 h-5 text-vip-gold" />
                </div>
                <p className="text-sm text-muted-foreground">Anda mendapatkan hadiah</p>
                <p className="text-3xl font-bold text-success">{formatCurrency(reward)}</p>
              </div>
              <Button className="w-full mt-4" onClick={handleClose}>Klaim Hadiah</Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Kode Kupon</Label>
                <Input placeholder="Masukkan kode kupon" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} className="text-center text-lg font-mono tracking-wider" />
              </div>
              <div className="flex items-start gap-2 p-3 bg-accent/10 rounded-lg">
                <Gift className="w-4 h-4 text-accent mt-0.5" />
                <p className="text-xs text-muted-foreground">Dapatkan kode kupon dari admin untuk mendapatkan hadiah bonus!</p>
              </div>
              <Button className="w-full" size="lg" onClick={handleSubmit} disabled={isLoading || !couponCode.trim()}>
                {isLoading ? "Memproses..." : "Klaim Kupon"}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CouponDialog;
