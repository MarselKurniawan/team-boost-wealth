import { Button } from "@/components/ui/button";
import { Lock, Zap, Percent, Calendar, Users2, ShoppingCart } from "lucide-react";
import { formatCurrency, Product } from "@/lib/database";

interface ProductCardProps {
  product: Product;
  onViewDetail: (product: Product) => void;
  onInvest: (product: Product) => void;
}

const ProductCard = ({ product, onViewDetail, onInvest }: ProductCardProps) => {
  const hasPromoPrice = product.promo_price != null;
  const hasPromoDaily = product.promo_daily_income != null;
  const hasPromoValidity = product.promo_validity != null;

  const price = hasPromoPrice ? product.promo_price! : product.price;
  const daily = hasPromoDaily ? product.promo_daily_income! : product.daily_income;
  const validity = hasPromoValidity ? product.promo_validity! : product.validity;
  const dailyPct = price > 0 ? ((daily / price) * 100).toFixed(2) : "0";
  const isKontrak = product.category === "vip" || (product.vip_level ?? 0) > 0;

  return (
    <article className="rounded-2xl bg-white border border-blue-100 shadow-[0_4px_18px_-12px_rgba(30,64,175,0.35)] overflow-hidden">
      {/* Top: image + name */}
      <div className="flex gap-3 p-3">
        <button
          onClick={() => onViewDetail(product)}
          className="relative w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-blue-50 ring-1 ring-blue-100"
        >
          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
          {hasPromoPrice && (
            <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-destructive text-white text-[8px] font-bold">
              PROMO
            </span>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[13px] font-heading font-bold text-foreground leading-tight line-clamp-2">
              {product.name}
            </h3>
            <span className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold ${
              isKontrak ? "bg-primary text-primary-foreground" : "bg-blue-50 text-primary border border-blue-100"
            }`}>
              {isKontrak ? <Lock className="w-2.5 h-2.5" /> : <Zap className="w-2.5 h-2.5" />}
              {isKontrak ? "Kontrak" : "Harian"}
            </span>
          </div>

          {/* 2x2 stats grid */}
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <div className="rounded-lg bg-blue-50/70 px-2 py-1.5">
              <div className="flex items-center gap-1 text-primary">
                <Percent className="w-2.5 h-2.5" />
                <span className="text-[9px] font-semibold">Rendimen</span>
              </div>
              <p className="text-[11px] font-bold text-foreground mt-0.5">{dailyPct}%</p>
            </div>
            <div className="rounded-lg bg-cyan-50/70 px-2 py-1.5">
              <div className="flex items-center gap-1 text-cyan-700">
                <Zap className="w-2.5 h-2.5" />
                <span className="text-[9px] font-semibold">Harian</span>
              </div>
              <p className="text-[11px] font-bold text-foreground mt-0.5 break-all">{formatCurrency(daily)}</p>
            </div>
            <div className="rounded-lg bg-blue-50/70 px-2 py-1.5">
              <div className="flex items-center gap-1 text-primary">
                <Calendar className="w-2.5 h-2.5" />
                <span className="text-[9px] font-semibold">Periode</span>
              </div>
              <p className="text-[11px] font-bold text-foreground mt-0.5">{validity} Hari</p>
            </div>
            <div className="rounded-lg bg-cyan-50/70 px-2 py-1.5">
              <div className="flex items-center gap-1 text-cyan-700">
                <Users2 className="w-2.5 h-2.5" />
                <span className="text-[9px] font-semibold">Limit</span>
              </div>
              <p className="text-[11px] font-bold text-foreground mt-0.5">Unlimited</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: price + CTA */}
      <div className="px-3 pb-3">
        <div className="rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100 p-2 flex items-center gap-2">
          <div className="flex-1 min-w-0 pl-1">
            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Investasi</p>
            <div className="flex items-baseline gap-1.5">
              {hasPromoPrice && (
                <span className="text-[10px] text-muted-foreground line-through">{formatCurrency(product.price)}</span>
              )}
              <span className="text-[14px] font-heading font-bold text-primary break-all">
                {formatCurrency(price)}
              </span>
            </div>
          </div>
          <Button
            onClick={() => onInvest(product)}
            className="h-9 px-3.5 rounded-xl bg-gradient-to-br from-[#3b82f6] to-[#1e3a8a] text-white hover:opacity-95 text-[11px] font-bold shrink-0 shadow-md shadow-blue-500/30"
          >
            <ShoppingCart className="w-3.5 h-3.5" /> Beli sekarang
          </Button>
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
