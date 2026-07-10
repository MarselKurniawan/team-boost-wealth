import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lock, ArrowUpRight } from "lucide-react";
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
  const isLocked = (product as any).profit_mode === "locked";

  return (
    <article className="group border border-border bg-card hover:border-foreground transition-colors">
      {/* Metadata bar — top */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
            {vipLabel}
          </span>
          {isLocked && (
            <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.18em] text-primary font-semibold">
              <Lock className="w-2.5 h-2.5" /> Locked
            </span>
          )}
        </div>
        <span className="text-[10px] font-mono text-muted-foreground">
          #{String(product.id).slice(0, 6)}
        </span>
      </div>

      {/* Horizontal body */}
      <div className="flex gap-0">
        <button
          onClick={() => onViewDetail(product)}
          className="w-28 h-28 flex-shrink-0 border-r border-border bg-muted overflow-hidden"
        >
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </button>

        <div className="flex-1 min-w-0 p-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-heading font-semibold text-foreground leading-tight truncate">
              {product.name}
            </h3>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 mt-3">
              <Stat
                label={isLocked ? "Profit/hari" : "Harian"}
                value={formatCurrency(displayDailyIncome)}
                strike={hasPromoDailyIncome ? formatCurrency(product.daily_income) : undefined}
              />
              <Stat label="Durasi" value={`${displayValidity} hari`} />
            </div>
          </div>
        </div>
      </div>

      {/* Action row — asymmetric, action on right, price left */}
      <div className="flex items-stretch border-t border-border">
        <div className="flex-1 px-4 py-3 border-r border-border">
          <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
            {isLocked ? "Payout akhir" : "Total return"}
          </p>
          <p className="text-sm font-heading font-semibold text-foreground break-all">
            {formatCurrency(totalEarning)}
          </p>
        </div>
        <div className="flex-1 px-4 py-3">
          <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Harga</p>
          <div className="flex items-baseline gap-1.5">
            {hasPromoPrice && (
              <span className="text-[10px] text-muted-foreground line-through">
                {formatCurrency(product.price)}
              </span>
            )}
            <span className="text-sm font-heading font-semibold text-foreground break-all">
              {formatCurrency(displayPrice)}
            </span>
          </div>
        </div>
        <Button
          onClick={() => onInvest(product)}
          className="h-auto px-5 rounded-none border-0 bg-foreground text-background hover:bg-primary"
        >
          Beli <ArrowUpRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </article>
  );
};

const Stat = ({ label, value, strike }: { label: string; value: string; strike?: string }) => (
  <div className="min-w-0">
    <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
    <div className="flex items-baseline gap-1">
      {strike && <span className="text-[9px] text-muted-foreground line-through break-all">{strike}</span>}
      <p className="text-[12px] font-semibold text-foreground break-all">{value}</p>
    </div>
  </div>
);

export default ProductCard;
