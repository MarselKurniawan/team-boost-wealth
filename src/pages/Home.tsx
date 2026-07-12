import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Bell, Search, Plus, ArrowDownToLine, MoreHorizontal, ChevronRight, Gift, PartyPopper, Coins, Bot, CalendarCheck, Repeat, Share2, LogOut, ShieldCheck, Sun, Moon, TrendingUp } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { getProducts, getInvestments, formatCurrency, canClaimToday, processReferralRabat, Product, Investment } from "@/lib/database";
import { useTheme } from "@/hooks/useTheme";
import RechargeDialog from "@/components/RechargeDialog";
import WithdrawDialog from "@/components/WithdrawDialog";
import InvestDialog from "@/components/InvestDialog";
import DailyCheckinDialog from "@/components/DailyCheckinDialog";
import SpinWheelDialog from "@/components/SpinWheelDialog";
import CouponDialog from "@/components/CouponDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const Home = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, profile, isAdmin, signOut, refreshProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [investments, setInvestments] = useState<Investment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [investOpen, setInvestOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
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
        getProducts()
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

  const handleLogout = async () => {
    await signOut();
    toast({ title: "Logout Berhasil", description: "Sampai jumpa lagi!" });
    navigate("/auth");
  };

  const balance = profile?.balance || 0;
  const totalIncome = profile?.total_income || 0;
  const activeInvestments = investments.filter(i => i.status === 'active');
  const totalDailyIncome = activeInvestments.reduce((sum, i) => sum + i.daily_income, 0);
  const claimableInvestments = activeInvestments.filter(inv => canClaimToday(inv.last_claimed_at, inv.created_at));
  const totalClaimable = claimableInvestments.reduce((sum, inv) => sum + inv.daily_income, 0);
  const deltaPct = balance > 0 ? Math.min(((totalIncome / balance) * 100), 99.9).toFixed(1) : "0.0";

  const handleInvest = (product: Product) => { setSelectedProduct(product); setInvestOpen(true); };
  const handleOpenClaimDialog = () => { setClaimed(false); setShowConfetti(false); setClaimDialogOpen(true); };

  const handleClaimAll = async () => {
    if (!user || !profile || claimableInvestments.length === 0 || isClaiming) return;
    setIsClaiming(true);
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      let totalClaimed = 0, claimedCount = 0;
      for (const investment of claimableInvestments) {
        const { data, error } = await supabase.rpc('claim_investment_atomic' as any, { _investment_id: investment.id });
        if (error) { console.error('claim rpc error', error); continue; }
        const res = data as any;
        if (!res?.claimed) continue;
        await processReferralRabat(user.id, Number(res.amount));
        totalClaimed += Number(res.amount); claimedCount += 1;
      }
      setClaimed(true); setShowConfetti(true); await loadData();
      toast({ title: "🎉 Klaim Berhasil!", description: `Anda mendapatkan ${formatCurrency(totalClaimed)} dari ${claimedCount} robot` });
      setTimeout(() => setClaimDialogOpen(false), 2500);
    } catch (error) {
      toast({ title: "Gagal Klaim", description: "Terjadi kesalahan.", variant: "destructive" });
    } finally { setIsClaiming(false); }
  };

  const displayName = profile?.name?.split(" ")[0] || "Investor";
  const investmentTiles = activeInvestments.slice(0, 6);
  const recommended = products.filter(p => p.is_active).slice(0, 6);

  return (
    <div className="pb-8">
      {/* SKY HERO */}
      <div className="relative overflow-hidden rounded-b-[32px] pb-6" style={{
        background: "linear-gradient(180deg, #3B8BD9 0%, #62A9E6 55%, #8FC5F0 100%)"
      }}>
        {/* Clouds */}
        <div className="absolute inset-0 pointer-events-none opacity-90">
          <div className="absolute -top-6 -left-10 w-56 h-40 rounded-full bg-white/40 blur-2xl" />
          <div className="absolute top-24 -right-16 w-72 h-52 rounded-full bg-white/50 blur-3xl" />
          <div className="absolute top-40 left-1/3 w-40 h-24 rounded-full bg-white/35 blur-2xl" />
          <div className="absolute bottom-8 right-6 w-28 h-16 rounded-full bg-white/40 blur-xl" />
        </div>

        <div className="relative z-10 px-5 pt-5">
          {/* Top row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center text-[#1e40af] font-bold text-sm">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <p className="text-white text-[15px] font-semibold">Hi, {displayName}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => navigate("/product")} className="w-9 h-9 rounded-full bg-white/25 backdrop-blur flex items-center justify-center text-white">
                <Search className="w-4 h-4" />
              </button>
              <button onClick={() => navigate("/notifications")} className="w-9 h-9 rounded-full bg-white/25 backdrop-blur flex items-center justify-center text-white">
                <Bell className="w-4 h-4" />
              </button>
              {isAdmin && (
                <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-full bg-white/25 backdrop-blur flex items-center justify-center text-white">
                  <ShieldCheck className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Portfolio */}
          <div className="mt-6">
            <p className="text-white/80 text-[12px] font-medium">My Portfolio</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-white text-[38px] font-heading font-bold tracking-tight leading-none break-all">
                {formatCurrency(balance)}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-white" />
              <span className="text-white text-[12px] font-semibold">
                {formatCurrency(totalIncome)} ({deltaPct}%)
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-5 flex items-center gap-2">
            <button onClick={() => setRechargeOpen(true)}
              className="flex-1 h-11 rounded-full bg-white/95 hover:bg-white text-[#1e40af] font-semibold text-[13px] flex items-center justify-center gap-1.5 transition">
              <Plus className="w-4 h-4" /> Deposit
            </button>
            <button onClick={() => setWithdrawOpen(true)}
              className="flex-1 h-11 rounded-full bg-white/25 backdrop-blur hover:bg-white/35 text-white font-semibold text-[13px] flex items-center justify-center gap-1.5 transition border border-white/40">
              <ArrowDownToLine className="w-4 h-4" /> Withdraw
            </button>
            <button onClick={handleLogout}
              className="w-11 h-11 rounded-full bg-white/25 backdrop-blur hover:bg-white/35 text-white flex items-center justify-center border border-white/40">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* REFERRAL BANNER */}
      <div className="px-5 mt-5">
        <button onClick={() => navigate("/team")}
          className="w-full rounded-2xl bg-[#FFF4E4] border border-[#F4D9AE] p-3.5 flex items-center gap-3 text-left hover:border-[#E8B96C] transition">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#F5B764] to-[#E88A3A] flex items-center justify-center text-white shrink-0">
            <Gift className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-[#5A3A1B]">Dapatkan bonus per referral!</p>
            <p className="text-[11px] text-[#8B6635] mt-0.5">Ajak teman & raih komisi harian</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0">
            <ChevronRight className="w-4 h-4 text-[#5A3A1B]" />
          </div>
        </button>
      </div>

      {/* YOUR INVESTMENTS */}
      <div className="px-5 mt-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[14px] font-heading font-bold text-foreground">Your investments</p>
          <button onClick={() => navigate("/product")} className="text-[11px] font-semibold text-primary flex items-center gap-0.5">
            <Plus className="w-3 h-3" /> New investment
          </button>
        </div>

        {investmentTiles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center">
            <div className="w-11 h-11 rounded-full bg-primary/10 mx-auto flex items-center justify-center mb-2">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <p className="text-[12px] font-semibold text-foreground">Belum ada robot aktif</p>
            <p className="text-[11px] text-muted-foreground mt-1">Mulai investasi pertama Anda</p>
            <Button onClick={() => navigate("/product")} className="mt-3 h-8 text-[11px] rounded-full px-4">Lihat produk</Button>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5 pb-1">
            {investmentTiles.map(inv => (
              <div key={inv.id} onClick={() => navigate("/account")}
                className="shrink-0 w-[128px] rounded-2xl bg-card border border-border p-3 cursor-pointer hover:border-primary/40 transition">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
                <p className="text-[11px] font-semibold text-foreground truncate">{inv.product_name}</p>
                <p className="text-[13px] font-bold text-foreground mt-1 break-all">{formatCurrency(inv.total_earned)}</p>
                <p className="text-[10px] text-primary font-semibold mt-0.5">+{formatCurrency(inv.daily_income)}/d</p>
              </div>
            ))}
          </div>
        )}

        <button onClick={() => navigate("/account")} className="mt-3 mx-auto block text-[11px] text-primary font-semibold underline underline-offset-4">
          See all investments
        </button>
      </div>

      {/* QUICK ACTIONS row */}
      <div className="px-5 mt-6">
        <div className="grid grid-cols-3 gap-2.5">
          <button onClick={() => setCheckinOpen(true)} className="rounded-2xl bg-card border border-border p-3 flex flex-col items-center gap-1.5 hover:border-primary/40 transition">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <CalendarCheck className="w-4 h-4 text-primary" />
            </div>
            <p className="text-[10px] font-semibold text-foreground">Check-in</p>
          </button>
          <button onClick={() => setSpinOpen(true)} className="rounded-2xl bg-card border border-border p-3 flex flex-col items-center gap-1.5 hover:border-primary/40 transition">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <Gift className="w-4 h-4 text-primary" />
            </div>
            <p className="text-[10px] font-semibold text-foreground">Kotak Kejutan</p>
          </button>
          <button onClick={() => setCouponOpen(true)} className="rounded-2xl bg-card border border-border p-3 flex flex-col items-center gap-1.5 hover:border-primary/40 transition">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <Repeat className="w-4 h-4 text-primary" />
            </div>
            <p className="text-[10px] font-semibold text-foreground">Kupon</p>
          </button>
        </div>
      </div>

      {/* CLAIM banner */}
      {claimableInvestments.length > 0 && (
        <div className="px-5 mt-5">
          <button onClick={handleOpenClaimDialog}
            className="w-full rounded-2xl bg-primary text-primary-foreground p-3.5 flex items-center gap-3 text-left hover:opacity-95 transition">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold">Klaim Pendapatan Hari Ini</p>
              <p className="text-[10px] opacity-80">{claimableInvestments.length} robot siap diklaim</p>
            </div>
            <p className="text-[13px] font-bold break-all">+{formatCurrency(totalClaimable)}</p>
          </button>
        </div>
      )}

      {/* RECOMMENDED */}
      {recommended.length > 0 && (
        <div className="px-5 mt-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[14px] font-heading font-bold text-foreground">Recommended</p>
            <Link to="/product" className="text-[11px] font-semibold text-primary">See all</Link>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5">
            {recommended.map(p => (
              <button key={p.id} onClick={() => handleInvest(p)}
                className="shrink-0 w-[168px] rounded-2xl bg-card border border-border p-3 text-left hover:border-primary/40 transition">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-foreground truncate">{p.name}</p>
                    <p className="text-[9px] text-muted-foreground">VIP {p.vip_level}</p>
                  </div>
                </div>
                <p className="text-[13px] font-bold text-foreground break-all">{formatCurrency(p.price)}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3 text-primary" />
                  <p className="text-[10px] text-primary font-semibold">+{formatCurrency(p.daily_income)}/d</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Dialogs */}
      <RechargeDialog open={rechargeOpen} onOpenChange={setRechargeOpen} onSuccess={loadData} />
      <WithdrawDialog open={withdrawOpen} onOpenChange={setWithdrawOpen} balance={balance} onSuccess={loadData} />
      <DailyCheckinDialog open={checkinOpen} onOpenChange={setCheckinOpen} onSuccess={loadData} />
      <SpinWheelDialog open={spinOpen} onOpenChange={setSpinOpen} onSuccess={loadData} />
      <CouponDialog open={couponOpen} onOpenChange={setCouponOpen} onSuccess={loadData} prefillCode={couponPrefill} />
      <InvestDialog open={investOpen} onOpenChange={setInvestOpen} product={selectedProduct} balance={balance} onSuccess={loadData} />

      <Dialog open={claimDialogOpen} onOpenChange={setClaimDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-base font-heading">
              {claimed ? "🎉 Selamat!" : "Klaim Pendapatan Robot"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center">
              {claimed ? <PartyPopper className="w-10 h-10 text-primary-foreground" /> : <Gift className="w-10 h-10 text-primary-foreground" />}
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
