import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Product, formatCurrency, createInvestment, createTransaction, updateProfile, processReferralCommission, getUserProductInvestmentCount } from "@/lib/database";
import { useAuth } from "@/hooks/useAuth";
import { TrendingUp, CheckCircle2, Minus, Plus, Lock, X, Wallet, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useVipTitles } from "@/hooks/useVipTitles";

interface InvestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  balance: number;
  onSuccess: () => void;
}

const InvestDialog = ({ open, onOpenChange, product, balance, onSuccess }: InvestDialogProps) => {
  const { toast } = useToast();
  const { titleFor } = useVipTitles();
  const { user, profile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [ownedCount, setOwnedCount] = useState(0);

  useEffect(() => {
    if (!open || !product || !user) return;
    setQuantity(1);
    const termType = (product as any).term_type === 'short' ? 'short' : 'long';
    getUserProductInvestmentCount(user.id, product.id, termType).then(setOwnedCount);
  }, [open, product, user]);

  if (!product) return null;

  // Produk jangka pendek: WAJIB hanya bisa dibeli 1x seumur hidup (walau kontrak sudah selesai).
  // Produk jangka panjang: pakai max_per_user (null/0 = unlimited).
  const isShortTerm = (product as any).term_type === 'short';
  const limit = isShortTerm ? 1 : (product.max_per_user && product.max_per_user > 0 ? product.max_per_user : null);
  const remaining = limit == null ? 99 : Math.max(0, limit - ownedCount);
  const stock = (product as any).stock as number | null | undefined;
  const outOfStock = stock != null && stock <= 0;
  const stockCap = stock == null ? 99 : Math.max(0, stock);
  const maxBuyable = Math.min(99, remaining, stockCap);
  const limitReached = (limit != null && remaining <= 0) || outOfStock;

  const totalPrice = product.price * quantity;
  const totalDailyIncome = product.daily_income * quantity;
  const totalIncome = product.total_income * quantity;
  const canInvest = balance >= totalPrice && !limitReached && quantity <= maxBuyable;

  const handleInvest = async () => {
    if (outOfStock) {
      toast({
        title: "Stok Habis",
        description: "Produk ini sudah habis dan tidak dapat dibeli.",
        variant: "destructive",
      });
      return;
    }
    if (limitReached) {
      toast({
        title: "Batas Pembelian Tercapai",
        description: `Anda sudah membeli produk ini sebanyak ${ownedCount}x (maks. ${limit}).`,
        variant: "destructive",
      });
      return;
    }
    if (stock != null && quantity > stock) {
      toast({
        title: "Stok Tidak Cukup",
        description: `Sisa stok hanya ${stock} unit.`,
        variant: "destructive",
      });
      return;
    }
    if (limit != null && quantity > remaining) {
      toast({
        title: "Melebihi Batas",
        description: `Anda hanya bisa membeli ${remaining} unit lagi (maks. ${limit} per user).`,
        variant: "destructive",
      });
      return;
    }
    if (balance < totalPrice) {
      toast({
        title: "Saldo Tidak Cukup",
        description: `Anda membutuhkan ${formatCurrency(totalPrice - balance)} lagi.`,
        variant: "destructive",
      });
      return;
    }

    if (!user || !profile) {
      toast({
        title: "Error",
        description: "Silakan login terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Atomically decrement stock (server-side guarded). Skips if stock is unlimited.
      if (stock != null) {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: stockOk, error: stockErr } = await supabase.rpc('decrement_product_stock' as any, {
          _product_id: product.id,
          _qty: quantity,
        });
        if (stockErr || !stockOk) {
          setIsLoading(false);
          toast({
            title: "Stok Habis",
            description: "Produk ini baru saja habis. Silakan pilih produk lain.",
            variant: "destructive",
          });
          onSuccess();
          return;
        }
      }

      // Deduct balance
      await updateProfile(user.id, {
        balance: profile.balance - totalPrice,
      });

      // Create investment with quantity multiplied values
      await createInvestment({
        user_id: user.id,
        product_id: product.id,
        product_name: quantity > 1 ? `${product.name} (x${quantity})` : product.name,
        amount: totalPrice,
        daily_income: totalDailyIncome,
        total_income: totalIncome,
        validity: product.validity,
        days_remaining: product.validity,
        total_earned: 0,
        status: 'active',
        term_type: (product as any).term_type === 'short' ? 'short' : 'long',
        profit_mode: (product as any).profit_mode === 'locked' ? 'locked' : 'daily',
      } as any);

      // Create transaction record
      await createTransaction({
        user_id: user.id,
        type: 'invest',
        amount: totalPrice,
        status: 'success',
        description: `Pembelian Produk${quantity > 1 ? ` (x${quantity})` : ''}`,
      });

      // Process referral commission for upline (commission on purchase)
      await processReferralCommission(user.id, totalPrice);

      setIsLoading(false);
      setSuccess(true);

      setTimeout(() => {
        setSuccess(false);
        setQuantity(1);
        onOpenChange(false);
        onSuccess();
      }, 2000);
    } catch (error) {
      setIsLoading(false);
      toast({
        title: "Error",
        description: "Gagal memproses investasi. Silakan coba lagi.",
        variant: "destructive",
      });
    }
  };

  const close = () => {
    if (isLoading) return;
    setSuccess(false);
    setQuantity(1);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!isLoading) { setSuccess(false); setQuantity(1); onOpenChange(o); } }}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden border-0 rounded-3xl">
        {success ? (
          <div className="py-14 px-6 text-center space-y-4 bg-white">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-neutral-900">Investasi Berhasil!</h3>
              <p className="text-sm text-neutral-500 mt-1">
                Anda akan mulai mendapat income harian
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Gradient header */}
            <div className="relative bg-gradient-to-br from-emerald-500 via-emerald-600 to-green-700 px-6 pt-6 pb-12 rounded-b-[2rem] text-white overflow-hidden">
              {/* soft decorative circles */}
              <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10" />
              <div className="pointer-events-none absolute top-8 right-16 w-16 h-16 rounded-full bg-white/10" />

              <button
                type="button"
                onClick={close}
                disabled={isLoading}
                className="absolute top-5 right-5 w-8 h-8 rounded-full border border-white/40 flex items-center justify-center hover:bg-white/10 transition-colors"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>

              <p className="text-[11px] font-semibold tracking-widest uppercase text-white/70 relative z-10">
                Investasi
              </p>
              <h2 className="text-2xl font-bold mt-1 relative z-10">Konfirmasi Pembelian</h2>
              <p className="text-sm text-white/80 mt-1 relative z-10">
                Review detail sebelum melanjutkan
              </p>
            </div>

            {/* Floating icon badge straddling header/body */}
            <div className="relative">
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-16 h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center ring-1 ring-black/5">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="bg-white px-6 pt-12 pb-6 space-y-4">
              {/* Product name + vip badge */}
              <div className="text-center space-y-1">
                <h3 className="font-semibold text-neutral-900">{product.name}</h3>
                <span className="inline-block text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                  {titleFor(product.vip_level)}
                </span>
              </div>

              {/* Quantity selector */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Jumlah
                </label>
                {limit != null && (
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Maks {limit}/user &middot; sudah punya {ownedCount} &middot; sisa {remaining}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="h-11 w-11 shrink-0 rounded-full border border-emerald-200 text-emerald-700 flex items-center justify-center disabled:opacity-40 hover:bg-emerald-50 transition-colors"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      min={1}
                      max={maxBuyable}
                      value={quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        setQuantity(Math.max(1, Math.min(maxBuyable || 1, val)));
                      }}
                      disabled={limitReached}
                      className="h-11 text-center rounded-full border-emerald-100 bg-emerald-50/40 focus-visible:ring-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.min(maxBuyable, quantity + 1))}
                    disabled={quantity >= maxBuyable || limitReached}
                    className="h-11 w-11 shrink-0 rounded-full border border-emerald-200 text-emerald-700 flex items-center justify-center disabled:opacity-40 hover:bg-emerald-50 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Stats card */}
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Harga per unit</span>
                  <span className="font-semibold text-neutral-800">{formatCurrency(product.price)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Penghasilan Harian</span>
                  <span className="font-semibold text-emerald-600">
                    {formatCurrency(totalDailyIncome)}
                    {quantity > 1 && <span className="text-xs text-neutral-400 ml-1">({quantity}x)</span>}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Masa Berlaku</span>
                  <span className="font-semibold text-neutral-800">{product.validity} Hari</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Total Penghasilan</span>
                  <span className="font-bold text-emerald-700">
                    {formatCurrency(totalIncome)}
                    {quantity > 1 && <span className="text-xs text-neutral-400 ml-1">({quantity}x)</span>}
                  </span>
                </div>
                <div className="flex justify-between text-sm pt-1 border-t border-emerald-100">
                  <span className="text-neutral-500">ROI</span>
                  <span className="font-bold text-emerald-600">
                    +{((product.total_income / product.price - 1) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Total price */}
              <div className="rounded-2xl bg-gradient-to-r from-emerald-600 to-green-700 p-4 text-white flex items-center justify-between">
                <span className="text-sm font-medium text-white/85">Total Investasi</span>
                <span className="text-2xl font-bold">{formatCurrency(totalPrice)}</span>
              </div>

              {/* Balance check */}
              <div className={`rounded-2xl p-4 flex items-center justify-between ${canInvest ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${canInvest ? 'bg-emerald-100' : 'bg-red-100'}`}>
                    <Wallet className={`w-4 h-4 ${canInvest ? 'text-emerald-600' : 'text-red-500'}`} />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Saldo Anda</p>
                    <p className="text-sm font-bold text-neutral-800">{formatCurrency(balance)}</p>
                  </div>
                </div>
                {!canInvest && balance < totalPrice && (
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-600">
                    Saldo Kurang
                  </span>
                )}
              </div>
              {balance < totalPrice && (
                <p className="text-xs text-red-500 -mt-2 px-1">
                  Butuh {formatCurrency(totalPrice - balance)} lagi untuk investasi ini
                </p>
              )}

              {limitReached && (
                <div className="rounded-2xl p-3.5 bg-red-50 border border-red-100 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <Lock className="w-3.5 h-3.5 text-red-500" />
                  </div>
                  <p className="text-xs text-red-500 leading-relaxed">
                    {outOfStock
                      ? "Stok produk ini sudah habis."
                      : isShortTerm
                        ? "Produk uji coba ini hanya bisa dibeli 1x seumur hidup dan tidak bisa dibeli ulang."
                        : `Anda sudah mencapai batas pembelian produk ini (${limit}/user).`}
                  </p>
                </div>
              )}

              {!limitReached && canInvest && (
                <div className="rounded-2xl p-3.5 bg-emerald-50 border border-emerald-100 flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  <p className="text-xs text-emerald-700 leading-relaxed">
                    Income harian mulai dihitung segera setelah pembelian dikonfirmasi.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={close}
                  disabled={isLoading}
                  className="flex-1 h-12 rounded-full border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-semibold"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  onClick={handleInvest}
                  disabled={isLoading || !canInvest}
                  className="flex-[2] h-12 rounded-full bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 font-semibold shadow-md shadow-emerald-900/10"
                >
                  {isLoading
                    ? "Memproses..."
                    : outOfStock
                      ? "Stok Habis"
                      : limitReached
                        ? "Batas Tercapai"
                        : `Investasi ${formatCurrency(totalPrice)}`}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InvestDialog;
