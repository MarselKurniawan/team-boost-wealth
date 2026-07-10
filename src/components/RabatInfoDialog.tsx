import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TrendingUp, ShoppingCart, Calendar, Percent, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface RabatInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RabatInfoDialog = ({ open, onOpenChange }: RabatInfoDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Percent className="w-5 h-5 text-accent" />
            Komisi & Rabat 3 Level
          </DialogTitle>
          <DialogDescription>
            Dapatkan penghasilan dari 3 generasi bawahan Anda
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Multi-Level Explanation */}
          <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Sistem 3 Level</h3>
                <p className="text-xs text-muted-foreground">Struktur tim multi-generasi</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge className="bg-vip-gold text-white">A</Badge>
                <span>Bawahan langsung (yang Anda ajak)</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-gray-500 text-white">B</Badge>
                <span>Bawahan Level A (yang diajak Level A)</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-amber-700 text-white">C</Badge>
                <span>Bawahan Level B (yang diajak Level B)</span>
              </div>
            </div>
          </div>

          {/* Komisi Section */}
          <div className="bg-success/10 rounded-lg p-4 border border-success/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-success" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Komisi</h3>
                <p className="text-xs text-muted-foreground">Satu kali saat pembelian</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Anda mendapat komisi setiap kali bawahan <strong>membeli produk</strong>.
            </p>
            <div className="bg-background/50 rounded-lg p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Contoh: Bawahan beli Rp 100.000</p>
              <div className="space-y-1 text-sm">
                <p>Level A (10%) = <strong className="text-success">Rp 10.000</strong></p>
                <p>Level B (3%) = <strong className="text-success">Rp 3.000</strong></p>
                <p>Level C (2%) = <strong className="text-success">Rp 2.000</strong></p>
              </div>
            </div>
          </div>

          {/* Rabat Section */}
          <div className="bg-accent/10 rounded-lg p-4 border border-accent/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Rabat</h3>
                <p className="text-xs text-muted-foreground">Setiap hari dari profit</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Anda mendapat rabat dari <strong>profit harian</strong> bawahan setiap kali mereka claim.
            </p>
            <div className="bg-background/50 rounded-lg p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Contoh: Profit harian Rp 10.000</p>
              <div className="space-y-1 text-sm">
                <p>Level A (5%) = <strong className="text-accent">Rp 500</strong> /hari</p>
                <p>Level B (3%) = <strong className="text-accent">Rp 300</strong> /hari</p>
                <p>Level C (2%) = <strong className="text-accent">Rp 200</strong> /hari</p>
              </div>
            </div>
          </div>

          {/* Rate Table */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Tingkat Berdasarkan Level
            </h4>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="font-medium text-muted-foreground">Level</div>
              <div className="font-medium text-muted-foreground text-center">Komisi</div>
              <div className="font-medium text-muted-foreground text-center">Rabat</div>
              
              <div className="flex items-center gap-1">
                <Badge className="bg-vip-gold text-white text-[10px] px-1">A</Badge>
                <span className="text-foreground">Langsung</span>
              </div>
              <div className="text-success text-center font-semibold">10%</div>
              <div className="text-accent text-center font-semibold">5%</div>
              
              <div className="flex items-center gap-1">
                <Badge className="bg-gray-500 text-white text-[10px] px-1">B</Badge>
                <span className="text-foreground">Gen. 2</span>
              </div>
              <div className="text-success text-center font-semibold">3%</div>
              <div className="text-accent text-center font-semibold">3%</div>
              
              <div className="flex items-center gap-1">
                <Badge className="bg-amber-700 text-white text-[10px] px-1">C</Badge>
                <span className="text-foreground">Gen. 3</span>
              </div>
              <div className="text-success text-center font-semibold">2%</div>
              <div className="text-accent text-center font-semibold">2%</div>
            </div>
          </div>

          {/* VIP Info */}
          <div className="bg-vip-gold/10 rounded-lg p-3 border border-vip-gold/20">
            <p className="text-xs text-muted-foreground text-center">
              <strong className="text-vip-gold">💡 Tips:</strong> Total anggota tim dari semua level 
              akan dihitung untuk kenaikan VIP Anda!
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RabatInfoDialog;
