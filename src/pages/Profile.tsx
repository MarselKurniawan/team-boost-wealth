import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/database";
import { useState, useEffect } from "react";
import {
  User as UserIcon, Shield, LogOut, ChevronRight, Copy, Eye, EyeOff,
  ClipboardList, Receipt, Crown, Users, ArrowDownToLine, ArrowUpFromLine,
  Lock, Landmark, Headphones, Share2,
  FileText, Sparkles, TrendingUp, Wallet, Settings, Building2,
} from "lucide-react";

import ProfileDialog from "@/components/ProfileDialog";
import CouponDialog from "@/components/CouponDialog";
import BankAccountDialog from "@/components/BankAccountDialog";
import CompanyProfileDialog from "@/components/CompanyProfileDialog";
import LegalityDialog from "@/components/LegalityDialog";
import RechargeDialog from "@/components/RechargeDialog";
import WithdrawDialog from "@/components/WithdrawDialog";
import ReferralDialog from "@/components/ReferralDialog";
import DailyCheckinDialog from "@/components/DailyCheckinDialog";
import SpinWheelDialog from "@/components/SpinWheelDialog";
import TransactionHistoryDialog from "@/components/TransactionHistoryDialog";
import { useVipTitles } from "@/hooks/useVipTitles";


const Profile = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { profile, isAdmin, signOut, refreshProfile } = useAuth();
  const { titleFor } = useVipTitles();


  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"profile" | "password">("profile");
  const [couponDialogOpen, setCouponDialogOpen] = useState(false);
  const [bankDialogOpen, setBankDialogOpen] = useState(false);
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [legalityDialogOpen, setLegalityDialogOpen] = useState(false);
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
    else if (action === "legality") setLegalityDialogOpen(true);
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
    { icon: ClipboardList, label: "Pesanan", desc: "Riwayat investasi", tint: "bg-blue-50 text-blue-600", action: () => navigate("/account") },
    { icon: Receipt, label: "Tagihan", desc: "Riwayat transaksi", tint: "bg-sky-50 text-sky-600", action: () => setHistoryOpen(true) },
    { icon: Crown, label: "VIP", desc: "Komisi hingga 15%", tint: "bg-indigo-50 text-indigo-600", action: () => setReferralOpen(true) },
    { icon: Users, label: "Tim", desc: "Kelola referral", tint: "bg-cyan-50 text-cyan-600", action: () => navigate("/team") },
  ];

  const listItems = [
    { icon: ArrowDownToLine, label: "Riwayat Deposit", tint: "bg-blue-50 text-blue-600", action: () => setHistoryOpen(true) },
    { icon: ArrowUpFromLine, label: "Riwayat Penarikan", tint: "bg-sky-50 text-sky-600", action: () => setHistoryOpen(true) },
    { icon: Landmark, label: "Akun Bank", tint: "bg-indigo-50 text-indigo-600", action: () => setBankDialogOpen(true) },
    { icon: Lock, label: "Ganti Password", tint: "bg-cyan-50 text-cyan-600", action: () => openProfileDialog("password") },
    { icon: Headphones, label: "Layanan Pelanggan", tint: "bg-sky-50 text-sky-600", action: () => toast({ title: "Hubungi Kami", description: "WhatsApp: +62 812-3456-7890" }) },
    { icon: Building2, label: "Profil Perusahaan", tint: "bg-blue-50 text-blue-600", action: () => setCompanyDialogOpen(true) },
    { icon: FileText, label: "Legalitas Perusahaan", tint: "bg-indigo-50 text-indigo-600", action: () => setLegalityDialogOpen(true) },
  ];


  return (
    <div className="bg-[#f0f4fb] min-h-screen pb-10">
      {/* Decorative gradient banner */}
      <div className="relative overflow-hidden pt-6 pb-24 px-4 bg-gradient-to-br from-[#1e3a8a] via-[#1e40af] to-[#3b82f6]">
        {/* Decorative blobs */}
        <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute top-10 -left-16 w-48 h-48 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="absolute bottom-0 right-1/3 w-32 h-32 rounded-full bg-indigo-300/20 blur-2xl" />
        {/* Sparkle */}
        <Sparkles className="absolute top-6 right-6 w-5 h-5 text-white/40" />
        <Sparkles className="absolute top-16 left-8 w-3 h-3 text-white/30" />

        <div className="relative flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.32em] text-white/70 font-semibold">Akun Saya</p>
          <button onClick={() => openProfileDialog("profile")} className="text-white/80 hover:text-white">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="px-4 -mt-20 space-y-3 relative z-10">
        {/* Identity card with overlapping avatar */}
        <div className="bg-white rounded-3xl border border-white shadow-[0_10px_30px_-15px_rgba(30,64,175,0.35)] p-4 pt-8 relative">
          <div className="absolute -top-8 left-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-[#3b82f6] to-[#1e3a8a] p-[2px] shadow-lg shadow-blue-500/30">
            <div className="w-full h-full rounded-2xl bg-white flex items-center justify-center">
              <UserIcon className="w-8 h-8 text-primary" strokeWidth={1.75} />
            </div>
          </div>
          <div className="flex items-start justify-between gap-3 pl-20">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-heading font-bold text-foreground truncate">{profile.name}</h1>
                {isAdmin && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-destructive/10 text-destructive text-[9px] font-bold">
                    <Shield className="w-2.5 h-2.5" /> Admin
                  </span>
                )}
              </div>
              <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground text-[9px] font-bold shadow-sm">
                <Crown className="w-2.5 h-2.5" /> {titleFor(profile.vip_level)}
              </div>
              <button onClick={handleCopyUID} className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary">
                UID {uid} <Copy className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Balance card — decorated */}
        <div className="relative overflow-hidden rounded-3xl p-4 bg-gradient-to-br from-[#1e40af] to-[#1e3a8a] text-white shadow-[0_10px_30px_-15px_rgba(30,64,175,0.55)]">
          <div className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full bg-white/5" />
          <div className="absolute -right-2 -top-6 w-24 h-24 rounded-full bg-cyan-300/10" />
          <div className="absolute top-3 right-3">
            <Wallet className="w-16 h-16 text-white/5" strokeWidth={1} />
          </div>

          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <p className="text-[11px] text-white/70">Saldo Total</p>
                <button onClick={() => setBalanceHidden(v => !v)} className="text-white/70 hover:text-white">
                  {balanceHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <TrendingUp className="w-4 h-4 text-cyan-300" />
            </div>
            <p className="mt-1 font-heading text-3xl font-bold break-all">
              {balanceHidden ? "••••••" : formatCurrency(profile.balance || 0)}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3 text-[10px]">
              <div className="rounded-xl bg-white/10 backdrop-blur-sm px-3 py-2 border border-white/10">
                <p className="text-white/60">Isi Ulang</p>
                <p className="font-semibold break-all mt-0.5 text-white">{formatCurrency(profile.total_recharge || 0)}</p>
              </div>
              <div className="rounded-xl bg-white/10 backdrop-blur-sm px-3 py-2 border border-white/10">
                <p className="text-white/60">Pendapatan</p>
                <p className="font-semibold break-all mt-0.5 text-cyan-200">{formatCurrency(profile.total_income || 0)}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                onClick={() => setRechargeOpen(true)}
                className="h-10 rounded-xl bg-white text-primary hover:bg-white/90 text-xs font-bold shadow-md"
              >
                <ArrowDownToLine className="w-3.5 h-3.5" /> Deposit
              </Button>
              <Button
                onClick={() => setWithdrawOpen(true)}
                className="h-10 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-xs font-bold backdrop-blur-sm"
              >
                <ArrowUpFromLine className="w-3.5 h-3.5" /> Tarik Dana
              </Button>
            </div>
          </div>
        </div>

        {/* 2x2 grid with colored icon tiles */}
        <div className="grid grid-cols-2 gap-3">
          {gridItems.map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              className="bg-white rounded-2xl border border-blue-100/60 shadow-[0_4px_15px_-8px_rgba(30,64,175,0.15)] p-3 text-left hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-8px_rgba(30,64,175,0.25)] transition-all"
            >
              <div className={`w-9 h-9 rounded-xl ${item.tint} flex items-center justify-center mb-2`}>
                <item.icon className="w-4 h-4" strokeWidth={2} />
              </div>
              <p className="text-[13px] font-heading font-bold text-foreground leading-tight">{item.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{item.desc}</p>
            </button>
          ))}
        </div>

        {/* Share referral CTA — accented */}
        <button
          onClick={() => setReferralOpen(true)}
          className="w-full relative overflow-hidden rounded-2xl p-3 flex items-center gap-3 bg-gradient-to-r from-blue-50 via-white to-cyan-50 border border-blue-100 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-blue-100/50" />
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shrink-0 shadow-md relative">
            <Share2 className="w-4 h-4 text-white" strokeWidth={2.2} />
          </div>
          <div className="flex-1 text-left relative">
            <p className="text-xs font-heading font-bold text-foreground">Undang Teman</p>
            <p className="text-[10px] text-muted-foreground">Komisi hingga 10% dari deposit teman</p>
          </div>
          <ChevronRight className="w-4 h-4 text-primary shrink-0 relative" />
        </button>

        {/* Menu list */}
        <div className="bg-white rounded-2xl border border-blue-100/60 shadow-[0_4px_15px_-8px_rgba(30,64,175,0.12)] overflow-hidden">
          {listItems.map((item, i) => (
            <button
              key={item.label}
              onClick={item.action}
              className={`w-full flex items-center justify-between px-3 py-2.5 hover:bg-blue-50/50 transition-colors ${
                i !== listItems.length - 1 ? "border-b border-blue-50" : ""
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl ${item.tint} flex items-center justify-center`}>
                  <item.icon className="w-3.5 h-3.5" strokeWidth={2} />
                </div>
                <span className="text-[12px] font-medium text-foreground">{item.label}</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />

            </button>
          ))}
        </div>

        {isAdmin && (
          <button
            onClick={() => navigate("/admin")}
            className="w-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground rounded-2xl shadow-md py-3.5 flex items-center justify-center gap-2 hover:shadow-lg transition-shadow"
          >
            <Shield className="w-4 h-4" />
            <span className="text-xs font-heading font-bold uppercase tracking-wider">Admin Dashboard</span>
          </button>
        )}

        <Button
          variant="outline"
          className="w-full h-11 rounded-2xl border-blue-200 bg-white text-primary hover:bg-blue-50"
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
      <LegalityDialog open={legalityDialogOpen} onOpenChange={setLegalityDialogOpen} />
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
