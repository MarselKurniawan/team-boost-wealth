import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/database";
import { Gift, Sparkles, PartyPopper, Coins } from "lucide-react";

interface ClaimRewardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  productName: string;
  onClaim: () => void;
}

const ClaimRewardDialog = ({ open, onOpenChange, amount, productName, onClaim }: ClaimRewardDialogProps) => {
  const [showConfetti, setShowConfetti] = useState(false);
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    if (open) { setClaimed(false); setShowConfetti(false); }
  }, [open]);

  const handleClaim = () => {
    setClaimed(true);
    setShowConfetti(true);
    onClaim();
    setTimeout(() => onOpenChange(false), 2500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm bg-gradient-to-br from-background via-background to-primary/10 border-primary/30">
        <DialogHeader><DialogTitle className="text-center text-xl font-heading">{claimed ? "🎉 Selamat!" : "Claim Income Harian"}</DialogTitle></DialogHeader>
        <div className="relative py-6">
          {showConfetti && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(20)].map((_, i) => (
                <div key={i} className="absolute animate-confetti" style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 0.5}s`, animationDuration: `${1 + Math.random() * 1}s` }}>
                  <Sparkles className="w-4 h-4" style={{ color: ['#00F5FF', '#FF00E5', '#FFD700'][Math.floor(Math.random() * 3)] }} />
                </div>
              ))}
            </div>
          )}
          <div className={`flex flex-col items-center gap-4 transition-all duration-500 ${claimed ? 'scale-110' : ''}`}>
            <div className={`relative ${claimed ? 'animate-bounce' : 'animate-pulse'}`}>
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary via-accent to-primary flex items-center justify-center">
                {claimed ? <PartyPopper className="w-12 h-12 text-primary-foreground" /> : <Gift className="w-12 h-12 text-primary-foreground" />}
              </div>
              {claimed && <div className="absolute -top-2 -right-2 animate-ping"><Coins className="w-6 h-6 text-accent" /></div>}
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm text-muted-foreground">{productName}</p>
              <p className={`text-3xl font-bold transition-all duration-300 ${claimed ? 'text-success scale-125' : 'text-foreground'}`}>{claimed ? '+' : ''}{formatCurrency(amount)}</p>
              {claimed && <p className="text-sm text-success animate-fade-in">Berhasil ditambahkan ke saldo!</p>}
            </div>
          </div>
          {claimed && <div className="absolute inset-0 bg-gradient-to-t from-success/20 to-transparent rounded-xl animate-pulse" />}
        </div>
        {!claimed && (
          <Button onClick={handleClaim} className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground font-semibold h-12">
            <Gift className="w-5 h-5 mr-2" />Claim Sekarang
          </Button>
        )}
        {claimed && <div className="flex items-center justify-center gap-2 text-success animate-fade-in"><Sparkles className="w-4 h-4" /><span className="font-medium">Income berhasil di-claim!</span><Sparkles className="w-4 h-4" /></div>}
      </DialogContent>
    </Dialog>
  );
};

export default ClaimRewardDialog;
