import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

  return (
    <Card className="relative overflow-hidden border-border/60 bg-card">

      <div className="p-3 pt-3">
        <div className="flex gap-3">
          {/* Image */}
          <button
            onClick={() => onViewDetail(product)}
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-primary/15 to-accent/15 border border-border/40 mt-3"
          >
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </button>

          {/* Info */}
          <div className="flex-1 min-w-0 pt-1">
            <h3 className="text-xs font-bold text-primary leading-tight pr-1 truncate">
              {product.name}
            </h3>

            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-2">
              <div className="min-w-0">
                <div className="flex items-baseline gap-1">
                  {hasPromoDailyIncome && (
                    <span className="text-[8px] text-muted-foreground line-through break-all">{formatCurrency(product.daily_income)}</span>
                  )}
                  <p className="text-[11px] font-bold text-success break-all">{formatCurrency(displayDailyIncome)}</p>
                </div>
                <p className="text-[9px] text-accent">Pendapatan Harian</p>
              </div>

              <div className="min-w-0">
                <p className="text-[11px] font-bold text-vip-gold break-all">{formatCurrency(totalEarning)}</p>
                <p className="text-[9px] text-accent">Total Pendapatan</p>
              </div>

              <div className="min-w-0">
                <p className="text-[11px] font-bold text-secondary">{displayValidity} Hari</p>
                <p className="text-[9px] text-accent">Masa Berlaku</p>
              </div>

              <div className="min-w-0">
                <Badge
                  className={`text-[9px] font-semibold border-0 px-1.5 py-0 ${
                    product.vip_level > 0
                      ? "bg-vip-gold/15 text-vip-gold hover:bg-vip-gold/15"
                      : "bg-primary/15 text-primary hover:bg-primary/15"
                  }`}
                >
                  {vipLabel}
                </Badge>
                <p className="text-[9px] text-accent mt-0.5">Tingkat Produk</p>
              </div>
            </div>
          </div>
        </div>

        {product.description && (
          <p className="text-[9px] text-muted-foreground leading-snug mt-2 line-clamp-2">
            {product.description}
          </p>
        )}

        {/* Footer: price + buy */}
        <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-border/50">
          <div className="flex items-baseline gap-1.5 min-w-0">
            {hasPromoPrice && (
              <span className="text-[10px] text-muted-foreground line-through break-all">
                {formatCurrency(product.price)}
              </span>
            )}
            <span className="text-sm font-bold text-accent break-all">
              {formatCurrency(displayPrice)}
            </span>
          </div>
          <Button
            onClick={() => onInvest(product)}
            className="rounded-full px-5 h-7 text-[11px] font-semibold bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            Beli
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ProductCard;
