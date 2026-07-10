import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Share2, Copy, Send } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

interface ReferralDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referralCode: string;
}

const ReferralDialog = ({ open, onOpenChange, referralCode }: ReferralDialogProps) => {
  const { toast } = useToast();

  const referralLink = `${window.location.origin}/auth?ref=${referralCode}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Tersalin!",
      description: "Kode referral berhasil disalin",
    });
  };

  const shareWhatsApp = () => {
    const message = `🚀 Bergabung dengan INVESTPRO Robot AI Humanoid!\n\nGunakan kode undangan: ${referralCode}\n\nDaftar: ${referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const shareTelegram = () => {
    const message = `🚀 Bergabung dengan INVESTPRO Robot!\n\nKode undangan: ${referralCode}\n\nDaftar: ${referralLink}`;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            Bagikan Kode Referral
          </DialogTitle>
          <DialogDescription>
            Ajak teman dan dapatkan komisi dari setiap transaksi mereka
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Referral Code */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Kode Referral Anda</p>
            <div className="flex gap-2">
              <Input
                value={referralCode}
                readOnly
                className="text-center text-xl font-bold tracking-widest"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(referralCode)}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Referral Link */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Link Referral</p>
            <div className="flex gap-2">
              <Input
                value={referralLink}
                readOnly
                className="text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(referralLink)}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Share Buttons */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Bagikan via</p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="flex items-center gap-2 bg-green-500/10 border-green-500/30 hover:bg-green-500/20"
                onClick={shareWhatsApp}
              >
                <WhatsAppIcon size={20} className="text-green-500" />
                <span>WhatsApp</span>
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-2 bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20"
                onClick={shareTelegram}
              >
                <Send className="w-5 h-5 text-blue-500" />
                <span>Telegram</span>
              </Button>
            </div>
          </div>

          {/* Benefits */}
          <div className="bg-muted rounded-lg p-4">
            <h4 className="font-semibold text-sm mb-3">Keuntungan Referral</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-success" />
                Komisi 1-10% dari setiap transaksi
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-success" />
                Naik level VIP dengan mengajak teman
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-success" />
                Akses produk investasi eksklusif
              </li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReferralDialog;
