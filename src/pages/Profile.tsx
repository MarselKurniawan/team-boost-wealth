import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/database";
import { useState, useEffect } from "react";
import {
  User as UserIcon, Shield, LogOut, ChevronRight, Copy, Eye, EyeOff,
  ClipboardList, Receipt, Crown, Users, ArrowDownToLine, ArrowUpFromLine,
  Bell, Settings, Lock, Globe, Landmark, Headphones, Share2, Gift,
  CalendarCheck, FileText,
} from "lucide-react";
import ProfileDialog from "@/components/ProfileDialog";
import CouponDialog from "@/components/CouponDialog";
import BankAccountDialog from "@/components/BankAccountDialog";
import CompanyProfileDialog from "@/components/CompanyProfileDialog";
import RechargeDialog from "@/components/RechargeDialog";
import WithdrawDialog from "@/components/WithdrawDialog";
import ReferralDialog from "@/components/ReferralDialog";
import DailyCheckinDialog from "@/components/DailyCheckinDialog";
import SpinWheelDialog from "@/components/SpinWheelDialog";
import TransactionHistoryDialog from "@/components/TransactionHistoryDialog";

const Profile = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { profile, isAdmin, signOut, refreshProfile } = useAuth();

  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"profile" | "password">("profile");
  const [couponDialogOpen, setCouponDialogOpen] = useState(false);
  const [bankDialogOpen, setBankDialogOpen] = useState(false);
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [referralOpen, setReferralOpen] = useState(false);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [spinOpen, setSpinOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [balanceHidden, setBalanceHidden] = useState(false);

  const openProfileDialog = (mode: "profile" | "password") => {
    setDialogMode(mode);
    setProfileDialogOpen(true);
  };

  useEffect(() => {
    const action = searchParams.get("action");
    if (!action) return;
    if (action === "bank") setBankDialogOpen(true);
    else if (action === "coupon") setCouponDialogOpen(true);
    else if (action === "company") setCompanyDialogOpen(true);
    else if (action === "recharge") setRechargeOpen(true);
    else if (action === "withdraw") setWithdrawOpen(true);
    else if (action === "referral") setReferralOpen(true);
    else if (action === "checkin") setCheckinOpen(true);
    else if (action === "spin") setSpinOpen(true);
    else if (action === "settings") openProfileDialog("profile");
    else if (action === "password") openProfileDialog("password");
    searchParams.delete("action");
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleCopyUID = () => {
    if (profile?.user_id) {
      navigator.clipboard.writeText(profile.user_id.slice(0, 8).toUpperCase());
      toast({ title: "Tersalin", description: "UID disalin" });
    }
  };

  const handleLogout = async () => {
    await signOut();
    toast({ title: "Logout Berhasil" });
    navigate("/auth");
  };

  if (!profile) return null;

  const uid = profile.user_id.slice(0, 6).toUpperCase();


  const gridItems = [
    { icon: ClipboardList, label: "Pesanan", desc: "Riwayat investasi saya", action: () => navigate("/account") },
    { icon: Receipt, label: "Tagihan", desc: "Riwayat transaksi", action: () => setHistoryOpen(true) },
    { icon: Crown, label: "VIP", desc: "Komisi maks 15%", action: () => setReferralOpen(true) },
    { icon: Users, label: "Tim", desc: "Kelola tim & referral", action: () => navigate("/team") },
  ];

  const listItems = [
    { icon: ArrowDownToLine, label: "Riwayat Deposit", action: () => setHistoryOpen(true) },
    { icon: ArrowUpFromLine, label: "Riwayat Penarikan", action: () => setHistoryOpen(true) },
    { icon: Landmark, label: "Akun Bank", action: () => setBankDialogOpen(true) },
    { icon: Gift, label: "Kupon", action: () => setCouponDialogOpen(true) },
    { icon: CalendarCheck, label: "Check-in Harian", action: () => setCheckinOpen(true) },
    { icon: Bell, label: "Notifikasi", badge: 1, action: () => navigate("/notifications") },
    { icon: Globe, label: "Bahasa", value: "Indonesia", action: () => toast({ title: "Bahasa", description: "Saat ini hanya Bahasa Indonesia" }) },
    { icon: Lock, label: "Ganti Password", action: () => openProfileDialog("password") },
    { icon: Settings, label: "Pengaturan", action: () => openProfileDialog("profile") },
    { icon: Headphones, label: "Layanan Pelanggan", action: () => toast({ title: "Hubungi Kami", description: "WhatsApp: +62 812-3456-7890" }) },
    { icon: FileText, label: "Tentang & Legal", action: () => setCompanyDialogOpen(true) },
  ];

  return (
    <div className="bg-[#f4f6fb] min-h-screen pb-8">
      {/* Header banner */}
      <div className="bg-primary pt-8 pb-20 px-4">
        <p className="text-[10px] uppercase tracking-[0.28em] text-primary-foreground/60 text-center">
          Akun Saya
        </p>
      </div>

      <div className="px-4 -mt-14 space-y-3">
        {/* Identity card */}
        <div className="bg-white rounded-2xl border border-primary/10 shadow-sm p-4">
          <div className="flex items-start gap-3">
            <div className="w-14 h-14 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center shrink-0">
              <UserIcon className="w-7 h-7 text-primary" strokeWidth={1.75} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-heading font-bold text-foreground truncate">{profile.name}</h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold">
                  <Crown className="w-2.5 h-2.5" /> VIP{profile.vip_level}
                </span>
                {isAdmin && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold">
                    <Shield className="w-2.5 h-2.5" /> Admin
                  </span>
                )}
              </div>
              <button onClick={handleCopyUID} className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary">
                UID {uid} <Copy className="w-2.5 h-2.5" />
              </button>

            </div>
          </div>
        </div>

        {/* Balance card */}
        <div className="bg-white rounded-2xl border border-primary/10 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <p className="text-[11px] text-muted-foreground">Saldo Total</p>
              <button onClick={() => setBalanceHidden(v => !v)} className="text-muted-foreground hover:text-primary">
                {balanceHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <p className="mt-1 font-heading text-3xl font-bold text-primary break-all">
            {balanceHidden ? "••••••" : formatCurrency(profile.balance || 0)}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-4 text-[10px]">
            <div>
              <p className="text-muted-foreground">Total Isi Ulang</p>
              <p className="font-semibold text-foreground break-all mt-0.5">{formatCurrency(profile.total_recharge || 0)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Pendapatan</p>
              <p className="font-semibold text-foreground break-all mt-0.5">{formatCurrency(profile.total_income || 0)}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              onClick={() => setRechargeOpen(true)}
              className="h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold"
            >
              Deposit
            </Button>
            <Button
              onClick={() => setWithdrawOpen(true)}
              variant="outline"
              className="h-10 rounded-xl border-primary/30 text-primary hover:bg-primary/5 text-xs font-semibold"
            >
              Tarik Dana
            </Button>
          </div>
        </div>

        {/* 2x2 grid */}
        <div className="grid grid-cols-2 gap-3">
          {gridItems.map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              className="bg-white rounded-2xl border border-primary/10 shadow-sm p-3 text-left hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-heading font-bold text-primary">{item.label}</span>
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <item.icon className="w-4 h-4 text-primary" strokeWidth={1.75} />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight">{item.desc}</p>
            </button>
          ))}
        </div>

        {/* Share referral CTA */}
        <button
          onClick={() => setReferralOpen(true)}
          className="w-full bg-white rounded-2xl border border-primary/10 shadow-sm p-3 flex items-center gap-3 hover:border-primary/30 transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0">
            <Share2 className="w-4 h-4 text-primary-foreground" strokeWidth={2} />
          </div>
          <div className="flex-1 text-left">
            <p className="text-xs font-heading font-bold text-foreground">Undang Teman</p>
            <p className="text-[10px] text-muted-foreground">Dapatkan komisi hingga 10% dari deposit teman</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>

        {/* Menu list */}
        <div className="bg-white rounded-2xl border border-primary/10 shadow-sm overflow-hidden">
          {listItems.map((item, i) => (
            <button
              key={item.label}
              onClick={item.action}
              className={`w-full flex items-center justify-between px-4 py-3 hover:bg-primary/5 transition-colors ${
                i !== listItems.length - 1 ? "border-b border-primary/5" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <item.icon className="w-3.5 h-3.5 text-primary" strokeWidth={1.75} />
                </div>
                <span className="text-[12px] font-medium text-foreground">{item.label}</span>
                {item.badge && (
                  <span className="w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {item.value && <span className="text-[10px] text-muted-foreground">{item.value}</span>}
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            </button>
          ))}
        </div>

        {isAdmin && (
          <button
            onClick={() => navigate("/admin")}
            className="w-full bg-primary text-primary-foreground rounded-2xl shadow-sm py-3.5 flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
          >
            <Shield className="w-4 h-4" />
            <span className="text-xs font-heading font-bold uppercase tracking-wider">Admin Dashboard</span>
          </button>
        )}

        <Button
          variant="outline"
          className="w-full h-11 rounded-2xl border-primary/20 text-primary hover:bg-primary/5"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4" /> Keluar
        </Button>

        <p className="text-center text-[10px] text-muted-foreground pt-2">
          InvestPro · v2.0
        </p>
      </div>

      {/* Dialogs */}
      <ProfileDialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen} mode={dialogMode} onSuccess={refreshProfile} />
      <CouponDialog open={couponDialogOpen} onOpenChange={setCouponDialogOpen} onSuccess={refreshProfile} />
      <BankAccountDialog open={bankDialogOpen} onOpenChange={setBankDialogOpen} onSuccess={refreshProfile} />
      <CompanyProfileDialog open={companyDialogOpen} onOpenChange={setCompanyDialogOpen} />
      <RechargeDialog open={rechargeOpen} onOpenChange={setRechargeOpen} onSuccess={refreshProfile} />
      <WithdrawDialog open={withdrawOpen} onOpenChange={setWithdrawOpen} balance={profile.balance} onSuccess={refreshProfile} />
      <ReferralDialog open={referralOpen} onOpenChange={setReferralOpen} referralCode={profile.referral_code || ""} />
      <DailyCheckinDialog open={checkinOpen} onOpenChange={setCheckinOpen} onSuccess={refreshProfile} />
      <SpinWheelDialog open={spinOpen} onOpenChange={setSpinOpen} onSuccess={refreshProfile} />
      <TransactionHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} />
    </div>
  );
};

export default Profile;
