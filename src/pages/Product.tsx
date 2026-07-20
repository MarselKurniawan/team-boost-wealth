import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, SlidersHorizontal, Check, Zap, Timer, Crown, ArrowDownWideNarrow, ArrowUpWideNarrow } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { getProducts, formatCurrency, Product } from "@/lib/database";
import InvestDialog from "@/components/InvestDialog";
import ProductDetailDialog from "@/components/ProductDetailDialog";
import ProductCard from "@/components/ProductCard";
import { useVipTitles } from "@/hooks/useVipTitles";
import { cn } from "@/lib/utils";

const ProductPage = () => {
  const { profile, refreshProfile } = useAuth();
  const { titleFor } = useVipTitles();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [investOpen, setInvestOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [priceSort, setPriceSort] = useState<"none" | "asc" | "desc">("none");
  const [validitySort, setValiditySort] = useState<"none" | "asc" | "desc">("none");
  const [vipFilter, setVipFilter] = useState<"all" | "available" | "locked">("all");
  const [vipLevelFilter, setVipLevelFilter] = useState<number | "all">("all");

  const loadData = async () => {
    const productsData = await getProducts();
    setProducts(productsData);
    await refreshProfile();
  };

  useEffect(() => { loadData(); }, []);

  const userVipLevel = profile?.vip_level || 0;
  const getPrice = (p: Product) => p.promo_price ?? p.price;
  const getValidity = (p: Product) => p.promo_validity ?? p.validity;
  const isKontrak = (p: Product) => p.category === "vip" || (p.vip_level ?? 0) > 0;

  let filteredProducts =
    activeCategory === "all"
      ? products
      : activeCategory === "kontrak"
      ? products.filter(isKontrak)
      : products.filter((p) => !isKontrak(p));

  if (vipLevelFilter !== "all") filteredProducts = filteredProducts.filter(p => p.vip_level === vipLevelFilter);

  if (priceSort !== "none") {
    filteredProducts = [...filteredProducts].sort((a, b) =>
      priceSort === "asc" ? getPrice(a) - getPrice(b) : getPrice(b) - getPrice(a)
    );
  }
  if (validitySort !== "none") {
    filteredProducts = [...filteredProducts].sort((a, b) =>
      validitySort === "asc" ? getValidity(a) - getValidity(b) : getValidity(b) - getValidity(a)
    );
  }

  let availableProducts = filteredProducts.filter(p => p.vip_level <= userVipLevel);
  let lockedProducts = filteredProducts.filter(p => p.vip_level > userVipLevel);
  if (vipFilter === "available") lockedProducts = [];
  if (vipFilter === "locked") availableProducts = [];

  const handleViewDetail = (product: Product) => { setSelectedProduct(product); setDetailOpen(true); };
  const handleInvest = (product: Product) => { setSelectedProduct(product); setInvestOpen(true); };
  const handleInvestFromDetail = () => {
    if (selectedProduct) { setDetailOpen(false); setTimeout(() => setInvestOpen(true), 200); }
  };

  const tabs = [
    { id: "all", label: "Semua", icon: Crown },
    { id: "harian", label: "Harian", icon: Zap },
    { id: "kontrak", label: "Kontrak", icon: Lock },
  ];

  const activeFiltersCount =
    (priceSort !== "none" ? 1 : 0) + (validitySort !== "none" ? 1 : 0) +
    (vipFilter !== "all" ? 1 : 0) + (vipLevelFilter !== "all" ? 1 : 0);

  return (
    <div className="pb-8">
      {/* HERO strip */}
      <div className="px-4 pt-4">
        <div className="rounded-2xl bg-gradient-to-r from-[#047857] to-[#10b981] p-3.5 text-white relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10" />
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/70 font-semibold">Katalog</p>
          <h1 className="text-lg font-heading font-bold mt-0.5">Pilih Robot Investasi</h1>
          <p className="text-[11px] text-white/80 mt-0.5">Harian untuk profit rutin, Kontrak untuk payout lebih besar</p>
        </div>
      </div>

      {/* Sticky tabs + filter */}
      <div className="sticky top-12 z-20 bg-[#f0fbf4]/95 backdrop-blur px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 grid grid-cols-3 rounded-full bg-white border border-emerald-100 p-1">
            {tabs.map(t => {
              const active = activeCategory === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveCategory(t.id)}
                  className={cn(
                    "flex items-center justify-center gap-1 h-8 rounded-full text-[11px] font-semibold transition-all",
                    active
                      ? "bg-gradient-to-br from-[#10b981] to-[#065f46] text-white shadow-md shadow-emerald-500/30"
                      : "text-foreground/70 hover:text-foreground"
                  )}
                >
                  <t.icon className="w-3 h-3" /> {t.label}
                </button>
              );
            })}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className="relative w-10 h-10 rounded-full bg-white border border-emerald-100 flex items-center justify-center text-foreground hover:border-primary/40 outline-none">
              <SlidersHorizontal className="w-4 h-4" />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs w-52">
              <DropdownMenuLabel className="text-[10px] text-muted-foreground">Urutkan Harga</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setPriceSort("none")}>
                {priceSort === "none" && <Check className="w-3 h-3 mr-1" />} Default
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPriceSort("asc")}>
                <ArrowUpWideNarrow className="w-3 h-3 mr-1" /> Termurah
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPriceSort("desc")}>
                <ArrowDownWideNarrow className="w-3 h-3 mr-1" /> Termahal
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] text-muted-foreground">Urutkan Periode</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setValiditySort("none")}>Default</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setValiditySort("asc")}>Tersingkat</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setValiditySort("desc")}>Terlama</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] text-muted-foreground">Status</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setVipFilter("all")}>Semua</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setVipFilter("available")}>Tersedia</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setVipFilter("locked")}>Terkunci</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

      </div>


      {/* Product list */}
      <div className="px-4 mt-3 space-y-2.5">
        {availableProducts.map((product) => (
          <ProductCard key={product.id} product={product} onViewDetail={handleViewDetail} onInvest={handleInvest} />
        ))}
      </div>

      {availableProducts.length === 0 && lockedProducts.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-xs">Tidak ada produk dalam kategori ini</div>
      )}

      {lockedProducts.length > 0 && (
        <div className="px-4 mt-3 space-y-2.5">
          {lockedProducts.map((product) => {
            const displayPrice = product.promo_price ?? product.price;
            return (
              <Card key={product.id} className="opacity-70 relative overflow-hidden border-emerald-100">
                <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center">
                  <div className="text-center">
                    <Lock className="w-5 h-5 text-primary mx-auto mb-1" />
                    <p className="text-[10px] text-primary font-semibold">Buka kunci {titleFor(product.vip_level)}</p>
                  </div>
                </div>
                <CardContent className="p-3">
                  <div className="flex gap-3">
                    <div className="w-24 h-24 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover grayscale" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{product.name}</p>
                      <p className="text-xs text-primary/60 mt-1">{formatCurrency(displayPrice)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ProductDetailDialog open={detailOpen} onOpenChange={setDetailOpen} product={selectedProduct} userName={profile?.name} onInvest={handleInvestFromDetail} />
      <InvestDialog open={investOpen} onOpenChange={setInvestOpen} product={selectedProduct} balance={profile?.balance || 0} onSuccess={loadData} />
    </div>
  );
};

export default ProductPage;
