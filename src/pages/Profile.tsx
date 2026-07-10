import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/database";
import { useState, useEffect } from "react";
import {
  User as UserIcon, Shield, LogOut, ChevronRight, Lock, Landmark, Settings, Share2,
  Headphones, Wallet, Building2, ArrowUpRight, ArrowDownRight, Copy, ClipboardList,
  Trophy, Volume2, Gift, CalendarCheck, FileText, ScrollText, Info, Coins,
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

  const menuGroups: { title: string; items: { icon: any; label: string; action: () => void }[] }[] = [
    {
      title: "Aset",
      items: [
        { icon: Landmark, label: "Akun Bank", action: () => setBankDialogOpen(true) },
        { icon: ClipboardList, label: "Riwayat Keuangan", action: () => setHistoryOpen(true) },
        { icon: Wallet, label: "Kupon", action: () => setCouponDialogOpen(true) },
      ],
    },
    {
      title: "Aktivitas",
      items: [
        { icon: Trophy, label: "Tantangan", action: () => navigate("/account") },
        { icon: Gift, label: "Roda Putar", action: () => setSpinOpen(true) },
        { icon: CalendarCheck, label: "Check-in Harian", action: () => setCheckinOpen(true) },
        { icon: Share2, label: "Undang Pengguna", action: () => setReferralOpen(true) },
      ],
    },
    {
      title: "Preferensi",
      items: [
        { icon: Settings, label: "Pengaturan Profil", action: () => openProfileDialog("profile") },
        { icon: Lock, label: "Ganti Password", action: () => openProfileDialog("password") },
        { icon: Volume2, label: "Notifikasi", action: () => navigate("/notifications") },
      ],
    },
    {
      title: "Perusahaan",
      items: [
        { icon: Building2, label: "Tentang Kami", action: () => setCompanyDialogOpen(true) },
        { icon: FileText, label: "Terms of Service", action: () => setCompanyDialogOpen(true) },
        { icon: ScrollText, label: "Privacy Policy", action: () => setCompanyDialogOpen(true) },
        { icon: Headphones, label: "Pelayanan Pelanggan", action: () => toast({ title: "Hubungi Kami", description: "WhatsApp: +62 812-3456-7890" }) },
        { icon: Info, label: "FAQ", action: () => setCompanyDialogOpen(true) },
      ],
    },
  ];

  return (
    <div className="profile-stable">
      {/* Split-panel header with grid pattern */}
      <section className="relative border-b border-border pattern-grid">
        <div className="relative px-6 pt-10 pb-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[9px] uppercase tracking-[0.28em] text-muted-foreground mb-3">
                Member profile
              </p>
              <h1 className="text-2xl font-heading font-bold text-foreground leading-none tracking-tight truncate">
                {profile.name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.18em]">
                <span className="px-2 py-1 border border-foreground text-foreground font-semibold">
                  VIP {profile.vip_level}
                </span>
                {isAdmin && (
                  <span className="px-2 py-1 border border-destructive text-destructive font-semibold inline-flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Admin
                  </span>
                )}
                <button
                  onClick={handleCopyUID}
                  className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                >
                  ID {profile.user_id.slice(0, 6).toUpperCase()} <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>
            <div className="w-16 h-16 border border-foreground bg-background flex items-center justify-center shrink-0">
              <UserIcon className="w-8 h-8 text-foreground" strokeWidth={1.5} />
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <Button variant="default" size="sm" className="flex-1" onClick={() => openProfileDialog("profile")}>
              Edit Profil
            </Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={() => setReferralOpen(true)}>
              <Share2 className="w-3.5 h-3.5" /> Undang
            </Button>
          </div>
        </div>
      </section>

      {/* Balance strip — asymmetric 3-cell */}
      <section className="grid grid-cols-3 border-b border-border">
        <BalanceCell label="Saldo" value={formatCurrency(profile.balance || 0)} accent />
        <BalanceCell label="Isi Ulang" value={formatCurrency(profile.total_recharge || 0)} />
        <BalanceCell label="Pendapatan" value={formatCurrency(profile.total_income || 0)} />
      </section>

      {/* Recharge / Withdraw quick actions */}
      <section className="grid grid-cols-2 border-b border-border">
        <button
          onClick={() => setRechargeOpen(true)}
          className="flex items-center justify-between px-5 py-4 border-r border-border hover:bg-muted transition-colors group"
        >
          <div className="text-left">
            <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Tambah Saldo</p>
            <p className="text-sm font-heading font-semibold text-foreground mt-0.5">Isi Ulang</p>
          </div>
          <ArrowUpRight className="w-4 h-4 text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
        <button
          onClick={() => setWithdrawOpen(true)}
          className="flex items-center justify-between px-5 py-4 hover:bg-muted transition-colors group"
        >
          <div className="text-left">
            <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Tarik Dana</p>
            <p className="text-sm font-heading font-semibold text-foreground mt-0.5">Withdraw</p>
          </div>
          <ArrowDownRight className="w-4 h-4 text-foreground group-hover:translate-y-0.5 transition-transform" />
        </button>
      </section>

      {/* Menu groups */}
      {menuGroups.map((group) => (
        <section key={group.title} className="border-b border-border">
          <div className="px-5 pt-6 pb-2">
            <p className="text-[9px] uppercase tracking-[0.28em] text-muted-foreground">{group.title}</p>
          </div>
          <div>
            {group.items.map((item, i) => (
              <button
                key={item.label}
                onClick={item.action}
                className={`w-full flex items-center justify-between px-5 py-4 hover:bg-muted transition-colors ${
                  i !== group.items.length - 1 ? "border-b border-border/60" : ""
                }`}
              >
                <div className="flex items-center gap-4">
                  <item.icon className="w-4 h-4 text-foreground" strokeWidth={1.75} />
                  <span className="text-[13px] font-medium text-foreground">{item.label}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </section>
      ))}

      {isAdmin && (
        <section className="border-b border-border">
          <button
            onClick={() => navigate("/admin")}
            className="w-full flex items-center justify-between px-5 py-4 bg-foreground text-background hover:bg-primary transition-colors"
          >
            <div className="flex items-center gap-4">
              <Shield className="w-4 h-4" strokeWidth={1.75} />
              <span className="text-[13px] font-semibold uppercase tracking-wider">Admin Dashboard</span>
            </div>
            <ChevronRight className="w-4 h-4" />
          </button>
        </section>
      )}

      <section className="px-5 py-8">
        <Button variant="outline" className="w-full" onClick={handleLogout}>
          <LogOut className="w-4 h-4" /> Keluar
        </Button>
        <p className="mt-6 text-center text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          InvestPro · v2.0
        </p>
      </section>

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

const BalanceCell = ({ label, value, accent }: { label: string; value: string; accent?: boolean }) => (
  <div className={`px-4 py-5 border-r last:border-r-0 border-border ${accent ? "bg-foreground text-background" : ""}`}>
    <p className={`text-[9px] uppercase tracking-[0.18em] ${accent ? "text-background/60" : "text-muted-foreground"}`}>
      {label}
    </p>
    <p className="text-[13px] font-heading font-semibold mt-2 break-all">{value}</p>
  </div>
);

export default Profile;
