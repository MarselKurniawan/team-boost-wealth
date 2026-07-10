import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { formatCurrency, Product } from "@/lib/database";

interface ProductCardProps {
  product: Product;
  onViewDetail: (product: Product) => void;
  onInvest: (product: Product) => void;
}

const ProductCard = ({ product, onViewDetail, onInvest }: ProductCardProps) => {
  const hasPromoPrice = product.promo_price !== null && product.promo_price !== undefined;
  const hasPromoDailyIncome = product.promo_daily_income !== null && product.promo_daily_income !== undefined;
  const hasPromoValidity = product.promo_validity !== null && product.promo_validity !== undefined;

  const displayPrice = hasPromoPrice ? product.promo_price! : product.price;
  const displayDailyIncome = hasPromoDailyIncome ? product.promo_daily_income! : product.daily_income;
  const displayValidity = hasPromoValidity ? product.promo_validity! : product.validity;
  const totalEarning = displayDailyIncome * displayValidity;

  const vipLabel = product.vip_level > 0 ? `VIP ${product.vip_level}` : "Reguler";
  const isLocked = (product as any).profit_mode === 'locked';

  return (
    <div className="modal-card p-4">
      <div className="flex gap-3">
        <button
          onClick={() => onViewDetail(product)}
          className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border border-border bg-muted"
        >
          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-bold text-primary leading-tight truncate">
              {product.name}
            </h3>
            <Badge className="bg-muted text-primary hover:bg-muted border border-border text-[10px] font-semibold px-2 py-0 shrink-0">
              {vipLabel}
            </Badge>
          </div>

          {isLocked && (
            <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-muted px-2 py-0.5 rounded-full">
              <Lock className="w-2.5 h-2.5" /> Profit Terkunci
            </div>
          )}

          <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2">
            <div className="min-w-0">
              <div className="flex items-baseline gap-1">
                {hasPromoDailyIncome && (
                  <span className="text-[9px] text-muted-foreground line-through break-all">
                    {formatCurrency(product.daily_income)}
                  </span>
                )}
                <p className="text-[11px] font-bold text-primary break-all">{formatCurrency(displayDailyIncome)}</p>
              </div>
              <p className="text-[9px] text-muted-foreground">
                {isLocked ? "Profit/hari (locked)" : "Pendapatan Harian"}
              </p>
            </div>

            <div className="min-w-0">
              <p className="text-[11px] font-bold text-primary break-all">{formatCurrency(totalEarning)}</p>
              <p className="text-[9px] text-muted-foreground">
                {isLocked ? "Payout saat selesai" : "Total Pendapatan"}
              </p>
            </div>

            <div className="min-w-0">
              <p className="text-[11px] font-bold text-primary">{displayValidity} Hari</p>
              <p className="text-[9px] text-muted-foreground">Masa Berlaku</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <div className="flex items-baseline gap-1.5 min-w-0">
          {hasPromoPrice && (
            <span className="text-[10px] text-muted-foreground line-through break-all">
              {formatCurrency(product.price)}
            </span>
          )}
          <span className="text-base font-bold text-primary break-all">
            {formatCurrency(displayPrice)}
          </span>
        </div>
        <Button
          onClick={() => onInvest(product)}
          className="rounded-full px-6 h-8 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          Beli
        </Button>
      </div>
    </div>
  );
};

export default ProductCard;
