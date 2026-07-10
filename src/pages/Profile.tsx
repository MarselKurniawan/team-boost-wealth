import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/database";
import { useState, useEffect } from "react";
import {
  User as UserIcon,
  Shield,
  Edit2,
  LogOut,
  ChevronRight,
  Lock,
  Landmark,
  Settings,
  Share2,
  Headphones,
  Wallet,
  Ticket,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Crown,
  Copy,
  Menu,
  ClipboardList,
  Trophy,
  Volume2,
  Gift,
  CalendarCheck,
  FileText,
  ScrollText,
  Award,
  Info,
  Download,
  Coins,
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
      toast({ title: "Tersalin!", description: "UID berhasil disalin" });
    }
  };

  const handleLogout = async () => {
    await signOut();
    toast({ title: "Logout Berhasil", description: "Sampai jumpa lagi!" });
    navigate("/auth");
  };

  if (!profile) return null;

  const quickGrid = [
    {
      icon: Share2,
      label: "Undang pengguna",
      description: "Bagikan undangan Anda",
      action: () => setReferralOpen(true),
      color: "text-accent",
    },
    {
      icon: Crown,
      label: "VIP",
      description: "Dapatkan hak eksklusif lebih banyak!",
      action: () => navigate("/team"),
      color: "text-vip-gold",
    },
    {
      icon: Landmark,
      label: "Akun Bank",
      description: "Atur rekening untuk tarik dana",
      action: () => setBankDialogOpen(true),
      color: "text-primary",
    },
    {
      icon: UserIcon,
      label: "Tim",
      description: "Bentuk tim dan lihat mereka disini!",
      action: () => navigate("/team"),
      color: "text-success",
    },
  ];

  const menuPrimary = [
    { icon: Landmark, label: "Akun Bank", action: () => setBankDialogOpen(true) },
    { icon: ClipboardList, label: "Riwayat Keuangan", action: () => setHistoryOpen(true) },
    { icon: Trophy, label: "Tantangan", action: () => navigate("/account") },
    { icon: Volume2, label: "Pemberitahuan Pesan", action: () => navigate("/notifications") },
    { icon: Gift, label: "Roda Putar", action: () => setSpinOpen(true) },
    { icon: CalendarCheck, label: "Check-in", action: () => setCheckinOpen(true) },
  ];

  const menuLegal = [
    { icon: FileText, label: "Terms of Service", action: () => setCompanyDialogOpen(true) },
    { icon: ScrollText, label: "Privacy Policy", action: () => setCompanyDialogOpen(true) },

    { icon: Info, label: "Tentang kami", action: () => setCompanyDialogOpen(true) },
    {
      icon: Headphones,
      label: "Pelayanan Pelanggan",
      action: () => toast({ title: "Hubungi Kami", description: "WhatsApp: +62 812-3456-7890" }),
    },
  ];

  const menuSettings = [
    { icon: Settings, label: "Pengaturan", action: () => openProfileDialog("profile") },
    { icon: Lock, label: "Ganti Password", action: () => openProfileDialog("password") },
  ];

  return (
    <div className="profile-stable space-y-3 p-4 pt-5">
      {/* Profile header */}
      <div className="flex items-center gap-3 pb-1">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center border border-border shrink-0">
          <UserIcon className="w-7 h-7 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h2 className="text-sm font-bold text-foreground truncate">{profile.name}</h2>
            <Badge className="text-[9px] px-1.5 py-0 h-4 bg-muted text-primary border-border hover:bg-muted">
              VIP {profile.vip_level} 👑
            </Badge>
            {isAdmin && (
              <Badge variant="outline" className="border-destructive text-destructive text-[9px] px-1 py-0 h-4">
                <Shield className="w-2.5 h-2.5 mr-0.5" /> Admin
              </Badge>
            )}
          </div>
          <button
            onClick={handleCopyUID}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground mt-0.5"
          >
            ID akun: {profile.user_id.slice(0, 6).toUpperCase()} <Copy className="w-2.5 h-2.5" />
          </button>
          <button
            onClick={() => openProfileDialog("profile")}
            className="text-[10px] text-primary flex items-center gap-0.5 mt-0.5"
          >
            Lihat atau edit profil <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <button className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center shrink-0">
          {/* menu icon */}
          <Menu className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Saldo grid 2x */}
      <div className="grid grid-cols-2 gap-2.5">
        <Card className="bg-card border-border shadow-none">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] text-muted-foreground">Isi ulang saldo</span>
              </div>
              <button
                onClick={() => setRechargeOpen(true)}
                className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-primary font-medium"
              >
                Deposito ›
              </button>
            </div>
            <p className="text-base font-bold text-foreground break-all">
              {formatCurrency(profile.total_recharge || 0)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-none">
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Coins className="w-3.5 h-3.5 text-accent" />
              <span className="text-[10px] text-muted-foreground">Saldo kuantitatif</span>
            </div>
            <p className="text-base font-bold text-foreground break-all">{formatCurrency(profile.balance || 0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Saldo detail */}
      <Card className="bg-card border-border shadow-none">
        <CardContent className="p-3.5">
          <div className="space-y-1.5 text-[11px] mb-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bertambah hari ini:</span>
              <span className="font-semibold text-foreground break-all">
                {formatCurrency(profile.total_income || 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Saldo bisa ditarik:</span>
              <span className="font-semibold text-foreground break-all">{formatCurrency(profile.balance || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Akumulasi saldo:</span>
              <span className="font-semibold text-foreground break-all">
                {formatCurrency((profile.total_income || 0) + (profile.balance || 0))}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate("/account")}
              className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
            >
              Lihat detail saldo <ChevronRight className="w-3 h-3" />
            </button>
            <Button size="sm" className="h-7 text-[11px] px-4 rounded-full" onClick={() => setWithdrawOpen(true)}>
              Tarik <ChevronRight className="w-3 h-3 ml-0.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pemberitahuan pesan marquee */}
      <div className="flex items-center gap-2 rounded-xl bg-card border border-border px-3 py-2">
        <Volume2 className="w-3.5 h-3.5 text-primary shrink-0" />
        <p className="text-[10px] text-muted-foreground truncate">
          Lengkapi misi harian untuk mendapatkan keberuntungan ekstra
        </p>
      </div>

      {/* Quick Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {quickGrid.map((item) => (
          <button
            key={item.label}
            onClick={item.action}
            className="rounded-xl bg-card border border-border hover:border-primary p-3 text-left transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-foreground">{item.label}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{item.description}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <item.icon className={`w-4 h-4 ${item.color}`} />
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Menu primary */}
      <Card className="border-border bg-card shadow-none">
        <CardContent className="p-0">
          {menuPrimary.map((item, i) => (
            <div key={item.label}>
              <button
                onClick={item.action}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <item.icon className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium text-foreground">{item.label}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              {i < menuPrimary.length - 1 && <Separator />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Menu legal */}
      <Card className="border-border bg-card shadow-none">
        <CardContent className="p-0">
          {menuLegal.map((item, i) => (
            <div key={item.label}>
              <button
                onClick={item.action}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <item.icon className="w-4 h-4 text-accent" />
                  <span className="text-xs font-medium text-foreground">{item.label}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              {i < menuLegal.length - 1 && <Separator />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Settings */}
      <Card className="border-border bg-card shadow-none">
        <CardContent className="p-0">
          {menuSettings.map((item, i) => (
            <div key={item.label}>
              <button
                onClick={item.action}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <item.icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">{item.label}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              {i < menuSettings.length - 1 && <Separator />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Admin shortcut */}
      {isAdmin && (
        <Card className="border-destructive bg-card shadow-none">
          <CardContent className="p-0">
            <button
              onClick={() => navigate("/admin")}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Shield className="w-4 h-4 text-destructive" />
                <span className="text-xs font-medium text-destructive">Admin Dashboard</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-destructive" />
            </button>
          </CardContent>
        </Card>
      )}

      {/* Logout */}
      <Card className="border-border bg-card shadow-none">
        <CardContent className="p-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <LogOut className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">Keluar</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <ProfileDialog
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
        mode={dialogMode}
        onSuccess={refreshProfile}
      />
      <CouponDialog open={couponDialogOpen} onOpenChange={setCouponDialogOpen} onSuccess={refreshProfile} />
      <BankAccountDialog open={bankDialogOpen} onOpenChange={setBankDialogOpen} onSuccess={refreshProfile} />
      <CompanyProfileDialog open={companyDialogOpen} onOpenChange={setCompanyDialogOpen} />
      <RechargeDialog open={rechargeOpen} onOpenChange={setRechargeOpen} onSuccess={refreshProfile} />
      <WithdrawDialog
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        balance={profile.balance}
        onSuccess={refreshProfile}
      />
      <ReferralDialog open={referralOpen} onOpenChange={setReferralOpen} referralCode={profile.referral_code || ""} />
      <DailyCheckinDialog open={checkinOpen} onOpenChange={setCheckinOpen} onSuccess={refreshProfile} />
      <SpinWheelDialog open={spinOpen} onOpenChange={setSpinOpen} onSuccess={refreshProfile} />
      <TransactionHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} />
    </div>
  );
};

export default Profile;
