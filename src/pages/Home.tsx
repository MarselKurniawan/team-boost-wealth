import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Gift, PartyPopper, Coins, CalendarCheck, Ticket, Download, Share2, BookOpen,
  ChevronRight, Sparkles, TrendingUp, ShoppingBag, Wallet, ArrowUpFromLine, Zap,
} from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { getProducts, getInvestments, formatCurrency, canClaimToday, processReferralRabat, Product, Investment } from "@/lib/database";
import RechargeDialog from "@/components/RechargeDialog";
import WithdrawDialog from "@/components/WithdrawDialog";
import InvestDialog from "@/components/InvestDialog";
import DailyCheckinDialog from "@/components/DailyCheckinDialog";
import SpinWheelDialog from "@/components/SpinWheelDialog";
import CouponDialog from "@/components/CouponDialog";
import ProductCard from "@/components/ProductCard";
import ProductDetailDialog from "@/components/ProductDetailDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const Home = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, profile, refreshProfile } = useAuth();

  const [investments, setInvestments] = useState<Investment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [investOpen, setInvestOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [spinOpen, setSpinOpen] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponPrefill, setCouponPrefill] = useState<string>("");

  useEffect(() => {
    const action = searchParams.get("action");
    const couponParam = searchParams.get("coupon");
    if (couponParam) {
      setCouponPrefill(couponParam.toUpperCase());
      setCouponOpen(true);
      searchParams.delete("coupon");
      setSearchParams(searchParams, { replace: true });
      return;
    }
    if (!action) return;
    if (action === "recharge") setRechargeOpen(true);
    else if (action === "withdraw") setWithdrawOpen(true);
    else if (action === "checkin") setCheckinOpen(true);
    else if (action === "spin") setSpinOpen(true);
    else if (action === "coupon") setCouponOpen(true);
    searchParams.delete("action");
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const loadData = async () => {
    if (user) {
      const [investmentsData, productsData] = await Promise.all([
        getInvestments(user.id),
        getProducts(),
      ]);
      setInvestments(investmentsData);
      setProducts(productsData);
    }
    await refreshProfile();
  };

  useEffect(() => { loadData(); }, [user]);

  const autoClaimLock = useMemo(() => ({ running: false }), []);
  useEffect(() => {
    if (!user || !profile || investments.length === 0) return;
    const runAutoClaim = async () => {
      if (autoClaimLock.running) return;
      autoClaimLock.running = true;
      try {
        const { getInvestments } = await import('@/lib/database');
        const { supabase } = await import('@/integrations/supabase/client');
        const fresh = await getInvestments(user.id);
        const claimable = fresh.filter(inv => inv.status === 'active' && canClaimToday(inv.last_claimed_at, inv.created_at));
        if (claimable.length === 0) return;
        let total = 0, count = 0;
        for (const inv of claimable) {
          const { data, error } = await supabase.rpc('claim_investment_atomic' as any, { _investment_id: inv.id });
          if (error) { console.error('claim rpc error', error); continue; }
          const res = data as any;
          if (!res?.claimed) continue;
          await processReferralRabat(user.id, Number(res.amount));
          total += Number(res.amount); count += 1;
        }
        if (total > 0) {
          await loadData();
          toast({ title: '💰 Profit Otomatis Masuk', description: `+${formatCurrency(total)} dari ${count} robot` });
        }
      } finally { autoClaimLock.running = false; }
    };
    runAutoClaim();
    const id = setInterval(runAutoClaim, 60_000);
    return () => clearInterval(id);
  }, [user, profile, investments, autoClaimLock]);

  const balance = profile?.balance || 0;
  const activeInvestments = investments.filter(i => i.status === 'active');
  const claimableInvestments = activeInvestments.filter(inv => canClaimToday(inv.last_claimed_at, inv.created_at));
  const totalClaimable = claimableInvestments.reduce((sum, inv) => sum + inv.daily_income, 0);

  const handleInvest = (product: Product) => { setSelectedProduct(product); setInvestOpen(true); };
  const handleViewDetail = (product: Product) => { setSelectedProduct(product); setDetailOpen(true); };
  const handleInvestFromDetail = () => { if (selectedProduct) { setDetailOpen(false); setTimeout(() => setInvestOpen(true), 200); } };
  const handleOpenClaimDialog = () => { setClaimed(false); setClaimDialogOpen(true); };

  const handleClaimAll = async () => {
    if (!user || !profile || claimableInvestments.length === 0 || isClaiming) return;
    setIsClaiming(true);
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      let totalClaimed = 0, claimedCount = 0;
      for (const investment of claimableInvestments) {
        const { data, error } = await supabase.rpc('claim_investment_atomic' as any, { _investment_id: investment.id });
        if (error) continue;
        const res = data as any;
        if (!res?.claimed) continue;
        await processReferralRabat(user.id, Number(res.amount));
        totalClaimed += Number(res.amount); claimedCount += 1;
      }
      setClaimed(true); await loadData();
      toast({ title: "🎉 Klaim Berhasil!", description: `Anda mendapatkan ${formatCurrency(totalClaimed)} dari ${claimedCount} robot` });
      setTimeout(() => setClaimDialogOpen(false), 2200);
    } catch {
      toast({ title: "Gagal Klaim", description: "Terjadi kesalahan.", variant: "destructive" });
    } finally { setIsClaiming(false); }
  };

  const productList = products.filter(p => p.is_active).slice(0, 8);

  const quickActions = [
    { icon: Download, label: "Unduh App", action: () => toast({ title: "Segera hadir", description: "Aplikasi mobile sedang dalam pengembangan" }) },
    { icon: WhatsAppIcon, label: "WhatsApp", action: () => window.open("https://wa.me/6281234567890", "_blank") },
    { icon: Share2, label: "Undang", action: () => navigate("/team") },
    { icon: BookOpen, label: "Tutorial", action: () => navigate("/profile?action=company") },
  ];

  return (
    <div className="pb-8">
      {/* PROMO BANNER — invita 2 style */}
      <div className="px-4 pt-4">
        <button
          onClick={() => navigate("/team")}
          className="relative w-full overflow-hidden rounded-2xl p-3.5 flex items-center gap-3 text-left bg-gradient-to-r from-[#dbeafe] via-[#e0e7ff] to-[#cffafe] border border-blue-200/60 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-heading font-bold text-primary leading-tight">
              Ajak 2 teman <ArrowUpFromLine className="inline w-3 h-3 rotate-90" /> DAPAT Rp10.000
            </p>
            <p className="text-[11px] text-primary/80 mt-0.5 font-semibold">+Rp120.000 jika mereka investasi</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#3b82f6] to-[#1e3a8a] flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/30">
            <Gift className="w-7 h-7 text-white" strokeWidth={2} />
          </div>
        </button>
      </div>

      {/* QUICK ACTIONS 4-icons */}
      <div className="px-4 mt-4">
        <div className="grid grid-cols-4 gap-2">
          {quickActions.map((a) => (
            <button
              key={a.label}
              onClick={a.action}
              className="flex flex-col items-center gap-1.5 py-2.5 rounded-2xl bg-white border border-blue-100 hover:border-primary/40 hover:-translate-y-0.5 transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100 flex items-center justify-center text-primary">
                <a.icon className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-semibold text-foreground">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* TWO INFO CARDS */}
      <div className="px-4 mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white border border-blue-100 p-3 shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-6 h-6 rounded-lg bg-blue-50 text-primary flex items-center justify-center">
              <Sparkles className="w-3 h-3" />
            </div>
            <p className="text-[11px] font-heading font-bold text-foreground">Bonus Member</p>
          </div>
          <p className="text-[10px] text-muted-foreground leading-snug">
            Penawaran terbatas 1.030 slot. Klaim reward hingga Rp10.000 gratis.
          </p>
          <button
            onClick={() => setCheckinOpen(true)}
            className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-[#fde68a] to-[#fbbf24] text-[10px] font-bold text-amber-900"
          >
            Klaim
          </button>
        </div>
        <div className="rounded-2xl bg-white border border-blue-100 p-3 shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-6 h-6 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <CalendarCheck className="w-3 h-3" />
            </div>
            <p className="text-[11px] font-heading font-bold text-foreground">Check-in Harian</p>
          </div>
          <p className="text-[10px] text-muted-foreground leading-snug">
            30 hari · hingga Rp65.000 · mulai dari Rp150 setiap hari.
          </p>
          <button
            onClick={() => setCheckinOpen(true)}
            className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-[#3b82f6] to-[#1e3a8a] text-white text-[10px] font-bold"
          >
            Check-in
          </button>
        </div>
      </div>

      {/* WALLET STRIP */}
      <div className="px-4 mt-4">
        <div className="rounded-2xl bg-gradient-to-r from-[#1e40af] to-[#3b82f6] p-3.5 text-white shadow-md shadow-blue-500/30 relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10" />
          <div className="absolute right-8 bottom-2">
            <Wallet className="w-10 h-10 text-white/10" strokeWidth={1} />
          </div>
          <div className="relative flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] text-white/70">Saldo Anda</p>
              <p className="text-[18px] font-heading font-bold break-all leading-tight">{formatCurrency(balance)}</p>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button onClick={() => setRechargeOpen(true)} className="h-8 px-3 rounded-full bg-white text-primary text-[11px] font-bold flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Deposit
              </button>
              <button onClick={() => setWithdrawOpen(true)} className="h-8 px-3 rounded-full bg-white/20 border border-white/40 text-[11px] font-bold">
                Tarik
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CLAIM BANNER */}
      {claimableInvestments.length > 0 && (
        <div className="px-4 mt-3">
          <button
            onClick={handleOpenClaimDialog}
            className="w-full rounded-2xl bg-gradient-to-r from-emerald-50 to-cyan-50 border border-emerald-200 p-3 flex items-center gap-3 text-left hover:shadow-md transition"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold text-emerald-900">Klaim Pendapatan Hari Ini</p>
              <p className="text-[10px] text-emerald-700">{claimableInvestments.length} robot siap diklaim</p>
            </div>
            <p className="text-[13px] font-heading font-bold text-emerald-700 break-all">+{formatCurrency(totalClaimable)}</p>
          </button>
        </div>
      )}

      {/* PRODUCT LIST */}
      <div className="px-4 mt-5">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <div className="w-1 h-4 rounded-full bg-primary" />
            <h2 className="text-[14px] font-heading font-bold text-foreground">Daftar Produk</h2>
          </div>
          <Link to="/product" className="text-[11px] font-semibold text-primary flex items-center gap-0.5">
            Semua <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {productList.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-blue-200 p-6 text-center bg-white">
            <ShoppingBag className="w-8 h-8 text-primary/50 mx-auto mb-2" />
            <p className="text-[12px] font-semibold text-foreground">Belum ada produk</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {productList.map((p) => (
              <ProductCard key={p.id} product={p} onViewDetail={handleViewDetail} onInvest={handleInvest} />
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <RechargeDialog open={rechargeOpen} onOpenChange={setRechargeOpen} onSuccess={loadData} />
      <WithdrawDialog open={withdrawOpen} onOpenChange={setWithdrawOpen} balance={balance} onSuccess={loadData} />
      <DailyCheckinDialog open={checkinOpen} onOpenChange={setCheckinOpen} onSuccess={loadData} />
      <SpinWheelDialog open={spinOpen} onOpenChange={setSpinOpen} onSuccess={loadData} />
      <CouponDialog open={couponOpen} onOpenChange={setCouponOpen} onSuccess={loadData} prefillCode={couponPrefill} />
      <InvestDialog open={investOpen} onOpenChange={setInvestOpen} product={selectedProduct} balance={balance} onSuccess={loadData} />
      <ProductDetailDialog open={detailOpen} onOpenChange={setDetailOpen} product={selectedProduct} userName={profile?.name} onInvest={handleInvestFromDetail} />

      <Dialog open={claimDialogOpen} onOpenChange={setClaimDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-base font-heading">
              {claimed ? "🎉 Selamat!" : "Klaim Pendapatan Robot"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#1e3a8a] flex items-center justify-center">
              {claimed ? <PartyPopper className="w-10 h-10 text-white" /> : <Gift className="w-10 h-10 text-white" />}
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">{claimableInvestments.length} robot aktif</p>
              <p className="text-2xl font-bold text-foreground break-all">
                {claimed ? '+' : ''}{formatCurrency(totalClaimable)}
              </p>
            </div>
          </div>
          {!claimed && (
            <Button onClick={handleClaimAll} disabled={isClaiming} className="w-full h-11 text-sm font-semibold rounded-full">
              <Coins className="w-4 h-4 mr-2" />
              {isClaiming ? 'Memproses...' : 'Klaim Sekarang'}
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Home;
