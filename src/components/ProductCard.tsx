import { Button } from "@/components/ui/button";
import { Lock, ArrowUpRight, TrendingUp, Clock, Coins } from "lucide-react";
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

  const isLocked = (product as any).profit_mode === "locked" || product.category === "vip" || (product.vip_level ?? 0) > 0;
  const roiPct = displayPrice > 0 ? Math.round(((totalEarning - displayPrice) / displayPrice) * 100) : 0;

  return (
    <article className="group relative overflow-hidden rounded-2xl bg-white border border-blue-100/70 shadow-[0_4px_18px_-10px_rgba(30,64,175,0.25)] hover:shadow-[0_10px_25px_-10px_rgba(30,64,175,0.4)] hover:-translate-y-0.5 transition-all">
      {/* Corner decoration */}
      <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-blue-50/70 pointer-events-none" />
      <div className="absolute -bottom-6 -left-6 w-16 h-16 rounded-full bg-cyan-50/60 pointer-events-none" />

      {/* Top ribbon */}
      <div className="relative flex items-center justify-between px-3.5 pt-3">
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
              isLocked
                ? "bg-gradient-to-r from-primary to-primary-glow text-white shadow-sm"
                : "bg-blue-50 text-primary border border-blue-100"
            }`}
          >
            {isLocked ? <Lock className="w-2.5 h-2.5" /> : <TrendingUp className="w-2.5 h-2.5" />}
            {isLocked ? "Kontrak" : "Harian"}
          </span>
          {hasPromoPrice && (
            <span className="inline-flex px-1.5 py-0.5 rounded-md bg-destructive/10 text-destructive text-[9px] font-bold">
              PROMO
            </span>
          )}
        </div>
        <span className="text-[9px] font-mono text-muted-foreground">#{String(product.id).slice(0, 6)}</span>
      </div>

      {/* Body */}
      <div className="relative flex gap-3 p-3.5 pt-3">
        <button
          onClick={() => onViewDetail(product)}
          className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-blue-100 to-blue-50 ring-1 ring-blue-100"
        >
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent" />
        </button>

        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-heading font-bold text-foreground leading-tight line-clamp-2">
              {product.name}
            </h3>
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 text-primary text-[9px] font-semibold">
                <Clock className="w-2.5 h-2.5" /> {displayValidity} hari
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-cyan-50 text-cyan-700 text-[9px] font-semibold">
                <Coins className="w-2.5 h-2.5" /> ROI {roiPct}%
              </span>
            </div>
          </div>

          <div className="mt-2 flex items-baseline gap-1.5">
            {hasPromoPrice && (
              <span className="text-[10px] text-muted-foreground line-through">
                {formatCurrency(product.price)}
              </span>
            )}
            <span className="text-base font-heading font-bold text-primary break-all">
              {formatCurrency(displayPrice)}
            </span>
          </div>
        </div>
      </div>

      {/* Stats + CTA */}
      <div className="relative mx-3.5 mb-3.5 rounded-xl bg-gradient-to-br from-blue-50/80 to-cyan-50/50 border border-blue-100/60 p-2.5 flex items-center gap-2">
        <div className="flex-1 grid grid-cols-2 gap-2">
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
              {isLocked ? "Profit/hari" : "Harian"}
            </p>
            <p className="text-[11px] font-bold text-foreground break-all">
              {formatCurrency(displayDailyIncome)}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
              {isLocked ? "Payout akhir" : "Total return"}
            </p>
            <p className="text-[11px] font-bold text-primary break-all">
              {formatCurrency(totalEarning)}
            </p>
          </div>
        </div>
        <Button
          onClick={() => onInvest(product)}
          className="h-10 px-3 rounded-xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground hover:shadow-lg hover:shadow-primary/30 text-[11px] font-bold shrink-0"
        >
          Beli <ArrowUpRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </article>
  );
};

export default ProductCard;
