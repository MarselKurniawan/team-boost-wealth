import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Package, 
  Calendar, 
  TrendingUp, 
  FileText,
  CheckCircle2,
  AlertTriangle,
  Info
} from "lucide-react";
import { Product, formatCurrency } from "@/lib/database";
import { useVipTitles } from "@/hooks/useVipTitles";

interface ProductDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  userName?: string;
  onInvest?: () => void;
}

const ProductDetailDialog = ({
  open,
  onOpenChange,
  product,
  userName = "Pengguna",
  onInvest,
}: ProductDetailDialogProps) => {
  const { titleFor } = useVipTitles();
  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] p-0 overflow-hidden bg-card border-primary/20">
        <ScrollArea className="max-h-[85vh]">
          {/* Header Image */}
          <div className="relative h-48 overflow-hidden">
            <img
              src={product.image || '/placeholder.svg'}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
            <Badge variant="vip" className="absolute top-4 right-4">
              {titleFor(product.vip_level)}
            </Badge>
          </div>

          <div className="p-5 space-y-5">
            <DialogHeader className="space-y-2 text-left">
              <p className="text-xs text-muted-foreground">Detail</p>
              <DialogTitle className="text-2xl font-heading font-bold text-foreground">
                {product.name}
              </DialogTitle>
              {product.description && (
                <p className="text-sm text-muted-foreground">{product.description}</p>
              )}
            </DialogHeader>

            {/* Price & Details */}
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">Harga layanan</span>
                <span className="text-xl font-bold text-primary">
                  {formatCurrency(product.price)}
                </span>
              </div>
              <Separator className="bg-border/50" />
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Durasi layanan</span>
                </div>
                <span className="font-semibold text-foreground">{product.validity} hari</span>
              </div>
              <Separator className="bg-border/50" />
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-success" />
                  <span className="text-muted-foreground">Pemakaian harian</span>
                </div>
                <span className="font-bold text-success">
                  {formatCurrency(product.daily_income)}
                </span>
              </div>
              <Separator className="bg-border/50" />
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-accent" />
                  <span className="text-muted-foreground">Total penghasilan</span>
                </div>
                <span className="font-bold text-accent">
                  {formatCurrency(product.total_income)}
                </span>
              </div>
            </div>

            {/* Agreement Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Informasi perjanjian</h3>
              </div>

              <div className="space-y-4 text-sm">
                <div className="bg-muted/30 rounded-lg p-4 border border-border/30">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-foreground mb-1">Ruang Lingkup Perjanjian</p>
                      <p className="text-muted-foreground leading-relaxed">
                        Perjanjian ini mengatur ketentuan penggunaan layanan dan sistem penyimpanan listrik sesuai dengan spesifikasi dan kapasitas yang dipilih oleh pengguna. Segala resiko yang terjadi diluar kuasa perusahaan adalah tanggung jawab pengguna.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/30 rounded-lg p-4 border border-border/30">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-foreground mb-1">Masa Berlaku Perjanjian</p>
                      <p className="text-muted-foreground leading-relaxed">
                        Perjanjian berlaku selama masa layanan aktif ({product.validity} hari) dan dapat diperpanjang sesuai dengan ketentuan serta kesepakatan yang ditetapkan.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/30 rounded-lg p-4 border border-border/30">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-foreground mb-1">Ketentuan Umum</p>
                      <p className="text-muted-foreground leading-relaxed">
                        Seluruh hak dan kewajiban para pihak tunduk pada syarat dan ketentuan yang berlaku. Perusahaan berhak melakukan penyesuaian layanan sesuai kebijakan dan peraturan yang berlaku.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* User Agreement */}
              <div className="bg-accent/10 rounded-lg p-4 border border-accent/30">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Dengan melanjutkan, <span className="text-foreground font-semibold">{userName}</span> menyadari bahwa setiap layanan memiliki risiko dan menyetujui segala konsekuensi yang timbul.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Button */}
            {onInvest && (
              <Button 
                className="w-full neon-pulse text-lg py-6" 
                onClick={() => {
                  onOpenChange(false);
                  onInvest();
                }}
              >
                Pembelian Produk Sekarang
              </Button>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ProductDetailDialog;
