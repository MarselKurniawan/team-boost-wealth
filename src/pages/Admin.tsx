import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  getAllProfiles,
  getPendingTransactions,
  getAllTransactions,
  updateTransactionStatus,
  updateProfile,
  getCoupons,
  createCoupon,
  deleteCoupon,
  formatCurrency,
  getVipSettings,
  updateVipSetting,
  deleteVipSetting,
  defaultVipTitle,
  Profile,
  Transaction,
  Coupon,
  VipSetting,
} from "@/lib/database";
import { refreshVipTitles } from "@/hooks/useVipTitles";
import {
  Users,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  XCircle,
  ShieldCheck,
  TrendingUp,
  Wallet,
  Trash2,
  UserCog,
  Package,
  Ticket,
  Copy,
  Share2,
  Database,
  UserPlus,
  DollarSign,
  Clock,
  Crown,
    Shield,
  PackageOpen,
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import BackupDialog from "@/components/BackupDialog";
import SpinSettingsDialog from "@/components/admin/SpinSettingsDialog";
import LegalityDialog from "@/components/admin/LegalityDialog";

interface PendingTx extends Transaction {
  userName?: string;
  userEmail?: string;
  userPhone?: string;
}

const Admin = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [pendingTransactions, setPendingTransactions] = useState<PendingTx[]>([]);
  const [allTransactions, setAllTransactions] = useState<PendingTx[]>([]);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [couponDialogOpen, setCouponDialogOpen] = useState(false);
  const [backupDialogOpen, setBackupDialogOpen] = useState(false);
  const [vipDialogOpen, setVipDialogOpen] = useState(false);
  const [spinDialogOpen, setSpinDialogOpen] = useState(false);
  const [legalityDialogOpen, setLegalityDialogOpen] = useState(false);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [vipSettings, setVipSettings] = useState<VipSetting[]>([]);
  const [editingVip, setEditingVip] = useState<Array<{ level: number; title: string; isNew?: boolean }>>([]);
  const [newVipLevel, setNewVipLevel] = useState<string>("");
  const [newVipTitle, setNewVipTitle] = useState<string>("");

  const [txFilter, setTxFilter] = useState<string>("all");

  const enrichTransactions = (txData: Transaction[], profilesData: Profile[]): PendingTx[] => {
    return txData.map(tx => {
      const profile = profilesData.find(p => p.user_id === tx.user_id);
      return {
        ...tx,
        userName: profile?.name || 'Unknown',
        userEmail: profile?.email || '',
        userPhone: profile?.phone || '',
      };
    });
  };

  const loadData = async () => {
    const [profilesData, txData, allTxData, couponData, vipData] = await Promise.all([
      getAllProfiles(),
      getPendingTransactions(),
      getAllTransactions(),
      getCoupons(),
      getVipSettings(),
    ]);
    setProfiles(profilesData);
    setPendingTransactions(enrichTransactions(txData, profilesData));
    setAllTransactions(enrichTransactions(allTxData, profilesData));
    setCoupons(couponData);
    setVipSettings(vipData);
    setEditingVip(
      vipData
        .slice()
        .sort((a, b) => a.vip_level - b.vip_level)
        .map(v => ({ level: v.vip_level, title: v.title ?? '' }))
    );

  };

  useEffect(() => {
    loadData();
  }, []);

  const [couponForm, setCouponForm] = useState({ code: "", max_uses: "1", reward_min: "100", reward_max: "1000" });

  const generateRandomCode = () => {
    const chars = '0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    setCouponForm(prev => ({ ...prev, code }));
  };

  const generateCoupon = async () => {
    let code = couponForm.code.replace(/\D/g, "");
    if (!code) {
      const chars = '0123456789';
      for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const max_uses = Math.max(1, parseInt(couponForm.max_uses) || 1);
    const reward_min = Math.max(0, parseInt(couponForm.reward_min) || 0);
    const reward_max = Math.max(reward_min, parseInt(couponForm.reward_max) || reward_min);

    const result = await createCoupon(code, { max_uses, reward_min, reward_max });
    if (result) {
      toast({ title: "Redeem Code Dibuat", description: `${code} · ${max_uses}x · ${formatCurrency(reward_min)}-${formatCurrency(reward_max)}` });
      setCouponForm({ code: "", max_uses: "1", reward_min: "100", reward_max: "1000" });
      loadData();
    } else {
      toast({ title: "Gagal", description: "Kode mungkin sudah ada", variant: "destructive" });
    }
  };

  const handleSaveVipSettings = async () => {
    setIsLoading('vip');
    let success = true;
    for (const cfg of editingVip) {
      const result = await updateVipSetting(cfg.level, 0, 0, cfg.title?.trim() || null);
      if (!result) success = false;
    }
    if (success) {
      toast({ title: "Tingkatan VIP disimpan", description: "Nama tingkatan berhasil diperbarui" });
    } else {
      toast({ title: "Gagal menyimpan", variant: "destructive" });
    }
    await refreshVipTitles();
    setIsLoading(null);
    loadData();
  };

  const handleAddVipLevel = async () => {
    const lvl = parseInt(newVipLevel);
    if (isNaN(lvl) || lvl < 0) {
      toast({ title: "Level tidak valid", variant: "destructive" });
      return;
    }
    if (editingVip.some(v => v.level === lvl)) {
      toast({ title: "Level sudah ada", variant: "destructive" });
      return;
    }
    const title = newVipTitle.trim() || defaultVipTitle(lvl);
    const ok = await updateVipSetting(lvl, 0, 0, title);
    if (ok) {
      toast({ title: "Tingkatan ditambahkan", description: `${title} (VIP ${lvl})` });
      setNewVipLevel(""); setNewVipTitle("");
      await refreshVipTitles();
      loadData();
    } else {
      toast({ title: "Gagal menambah", variant: "destructive" });
    }
  };

  const handleDeleteVipLevel = async (level: number) => {
    if (level === 0) {
      toast({ title: "VIP 0 tidak bisa dihapus", variant: "destructive" });
      return;
    }
    const ok = await deleteVipSetting(level);
    if (ok) {
      toast({ title: "Tingkatan dihapus" });
      await refreshVipTitles();
      loadData();
    } else {
      toast({ title: "Gagal menghapus", variant: "destructive" });
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    await deleteCoupon(id);
    toast({ title: "Redeem Code Dihapus" });
    loadData();
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Disalin", description: `Kode ${code} disalin ke clipboard` });
  };

  const shareCouponLink = async (code: string) => {
    const url = `${window.location.origin}/?coupon=${encodeURIComponent(code)}`;
    const text = `🎁 Klaim kupon ${code} di Terracycle!\n${url}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `Kupon ${code}`, text, url });
        return;
      }
    } catch {}
    await navigator.clipboard.writeText(text);
    toast({ title: "Link disalin", description: "Tempel ke chat untuk dibagikan" });
  };

  const handleApprove = async (tx: PendingTx) => {
    setIsLoading(tx.id);
    try {
      if (tx.type === 'withdraw') {
        // Trigger Jayapay disbursement via edge function. It will set status to processing/failed.
        const meta = (tx as any).payment_metadata || {};
        if (!meta.bank_code || !meta.account_number || !meta.account_name) {
          toast({
            title: "Data Rekening Tidak Lengkap",
            description: "Transaksi withdraw lama tanpa metadata rekening. Tolak & minta user ajukan ulang.",
            variant: "destructive",
          });
          setIsLoading(null);
          return;
        }
        const { supabase } = await import("@/integrations/supabase/client");
        const { data, error } = await supabase.functions.invoke("jayapay-payout", {
          body: {
            transaction_id: tx.id,
            bank_code: meta.bank_code,
            account_number: meta.account_number,
            account_name: meta.account_name,
          },
        });
        if (error || (data as any)?.error) {
          toast({
            title: "Payout Gagal",
            description: (data as any)?.error || error?.message || "Jayapay menolak permintaan disbursement.",
            variant: "destructive",
          });
          setIsLoading(null);
          loadData();
          return;
        }
        const profile = profiles.find(p => p.user_id === tx.user_id);
        if (profile) {
          await updateProfile(tx.user_id, {
            total_withdraw: profile.total_withdraw + tx.amount,
          });
        }
        toast({ title: "Payout Dikirim ke Jayapay", description: "Status: processing. Tunggu callback." });
      } else {
        await updateTransactionStatus(tx.id, "success");
        toast({ title: "Transaksi Disetujui", description: "Status berhasil diupdate" });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Gagal memproses", variant: "destructive" });
    }
    setIsLoading(null);
    loadData();
  };

  const handleReject = async (tx: PendingTx) => {
    setIsLoading(tx.id);
    await updateTransactionStatus(tx.id, "rejected");
    if (tx.type === 'withdraw') {
      const profile = profiles.find(p => p.user_id === tx.user_id);
      if (profile) {
        // Refund FULL gross (saldo dipotong gross, bukan net). Fallback ke tx.amount utk txn lama.
        const meta = (tx as any).payment_metadata || {};
        const refund = Number(meta.gross_amount ?? tx.amount);
        await updateProfile(tx.user_id, {
          balance: profile.balance + refund
        });
      }
    }
    toast({ title: "Transaksi Ditolak", description: "Balance dikembalikan", variant: "destructive" });
    setIsLoading(null);
    loadData();
  };

  const handleRefundTax = async (tx: PendingTx) => {
    setIsLoading(tx.id);
    try {
      const meta: any = (tx as any).payment_metadata || {};
      const net = Number(tx.amount);
      const gross = Number(meta.gross_amount ?? Math.round(net / 0.9));
      const taxAlreadyRefunded = Number(meta.refunded_tax || 0);
      const missingTax = gross - net - taxAlreadyRefunded;
      if (missingTax <= 0) {
        toast({ title: "Tidak ada pajak tertahan", description: "Pajak sudah dikembalikan sebelumnya." });
        setIsLoading(null);
        return;
      }
      const profile = profiles.find(p => p.user_id === tx.user_id);
      if (!profile) throw new Error("Profil user tidak ditemukan");
      await updateProfile(tx.user_id, { balance: profile.balance + missingTax });
      const newMeta = { ...meta, refunded_tax: taxAlreadyRefunded + missingTax, tax_topup_done: true, tax_topup_at: new Date().toISOString() };
      const { error } = await supabase
        .from("transactions")
        .update({ payment_metadata: newMeta })
        .eq("id", tx.id);
      if (error) throw error;
      toast({ title: "Pajak Dikembalikan", description: `+${formatCurrency(missingTax)} ke saldo ${profile.name}` });
    } catch (e: any) {
      toast({ title: "Gagal Refund Pajak", description: e?.message || "Terjadi kesalahan", variant: "destructive" });
    }
    setIsLoading(null);
    loadData();
  };

  const membersWithDeposit = profiles.filter(p => p.total_recharge > 0);
  const membersRegisteredOnly = profiles.filter(p => p.total_recharge === 0);

  const filteredTransactions = allTransactions.filter(tx => {
    if (txFilter === "all") return true;
    return tx.type === txFilter;
  });

  const stats = {
    totalUsers: profiles.length,
    totalBalance: profiles.reduce((sum, u) => sum + u.balance, 0),
    pendingCount: pendingTransactions.length,
    totalRecharge: profiles.reduce((sum, u) => sum + u.total_recharge, 0),
    totalWithdraw: profiles.reduce((sum, u) => sum + u.total_withdraw, 0),
    totalIncome: profiles.reduce((sum, u) => sum + u.total_income, 0),
    membersDeposit: membersWithDeposit.length,
    membersOnly: membersRegisteredOnly.length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success": return <Badge className="bg-success/15 text-success border-0 text-[10px] font-medium">Sukses</Badge>;
      case "pending": return <Badge className="bg-secondary/15 text-secondary border-0 text-[10px] font-medium">Pending</Badge>;
      case "rejected": return <Badge className="bg-destructive/15 text-destructive border-0 text-[10px] font-medium">Ditolak</Badge>;
      default: return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    const map: Record<string, string> = {
      withdraw: "bg-destructive/10 text-destructive",
      recharge: "bg-success/10 text-success",
      income: "bg-primary/10 text-primary",
      invest: "bg-secondary/10 text-secondary",
    };
    return <Badge className={`${map[type] || "bg-muted text-muted-foreground"} border-0 text-[10px] font-medium capitalize`}>{type}</Badge>;
  };

  const StatCard = ({ icon: Icon, label, value, color = "text-foreground" }: { icon: any; label: string; value: string | number; color?: string }) => (
    <Card className="overflow-hidden">
      <CardContent className="p-3">
        <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
        <div className="flex items-center gap-1.5">
          <Icon className={`w-3.5 h-3.5 shrink-0 ${color}`} />
          <p className={`text-[10px] sm:text-xs font-bold ${color} whitespace-nowrap`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );

  const TransactionTable = ({ data, showActions }: { data: PendingTx[]; showActions?: boolean }) => (
    <div className="rounded-lg border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="text-[10px] font-semibold w-[140px]">Member</TableHead>
            <TableHead className="text-[10px] font-semibold w-[70px]">Tipe</TableHead>
            <TableHead className="text-[10px] font-semibold text-right w-[110px]">Jumlah</TableHead>
            <TableHead className="text-[10px] font-semibold w-[160px]">Rekening Tujuan</TableHead>
            <TableHead className="text-[10px] font-semibold w-[70px]">Status</TableHead>
            <TableHead className="text-[10px] font-semibold w-[90px]">Tanggal</TableHead>
            {showActions && <TableHead className="text-[10px] font-semibold text-center w-[130px]">Aksi</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showActions ? 7 : 6} className="text-center py-8 text-muted-foreground text-xs">
                Tidak ada transaksi
              </TableCell>
            </TableRow>
          ) : (
            data.map((tx) => {
              const meta = (tx as any).payment_metadata || {};
              const isWd = tx.type === "withdraw";
              const bankLabel = meta.bank_label || meta.bank_code || "-";
              return (
              <TableRow key={tx.id} className="hover:bg-muted/20">
                <TableCell className="py-2">
                  <p className="text-xs font-medium truncate">{tx.userName}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{tx.userPhone || tx.userEmail}</p>
                </TableCell>
                <TableCell className="py-2">{getTypeBadge(tx.type)}</TableCell>
                <TableCell className="py-2 text-right">
                  <span className={`text-xs font-bold break-all ${
                    tx.type === "recharge" || tx.type === "income" ? "text-success" :
                    tx.type === "withdraw" ? "text-destructive" : "text-foreground"
                  }`}>
                    {tx.type === "recharge" || tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                  </span>
                  {isWd && meta.gross_amount && (
                    <p className="text-[9px] text-muted-foreground">gross {formatCurrency(Number(meta.gross_amount))}</p>
                  )}
                </TableCell>
                <TableCell className="py-2">
                  {isWd ? (
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold truncate">{bankLabel}</p>
                      <p className="text-[10px] text-foreground break-all">{meta.account_number || "-"}</p>
                      <p className="text-[9px] text-muted-foreground truncate">{meta.account_name || "-"}</p>
                    </div>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="py-2">{getStatusBadge(tx.status)}</TableCell>
                <TableCell className="py-2 text-[10px] text-muted-foreground">
                  {new Date(tx.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}
                </TableCell>
                {showActions && (
                  <TableCell className="py-2">
                    {tx.status === "pending" && (
                      <div className="flex gap-1 justify-center">
                        <Button size="sm" className="h-6 px-2 text-[10px] bg-success hover:bg-success/90" onClick={() => handleApprove(tx)} disabled={isLoading === tx.id}>
                          <CheckCircle className="w-3 h-3 mr-0.5" />OK
                        </Button>
                        <Button size="sm" variant="destructive" className="h-6 px-2 text-[10px]" onClick={() => handleReject(tx)} disabled={isLoading === tx.id}>
                          <XCircle className="w-3 h-3 mr-0.5" />No
                        </Button>
                      </div>
                    )}
                    {isWd && (tx.status === "failed" || tx.status === "rejected") && !meta.tax_topup_done && (() => {
                      const net = Number(tx.amount);
                      const gross = Number(meta.gross_amount ?? Math.round(net / 0.9));
                      const missing = gross - net - Number(meta.refunded_tax || 0);
                      if (missing <= 0) return null;
                      return (
                        <div className="flex justify-center mt-1">
                          <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={() => handleRefundTax(tx)} disabled={isLoading === tx.id} title={`Kembalikan pajak ${formatCurrency(missing)}`}>
                            Refund Pajak
                          </Button>
                        </div>
                      );
                    })()}
                  </TableCell>
                )}
              </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-4 p-4 pt-5 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-heading font-bold text-foreground leading-tight">Dashboard Admin</h1>
            <p className="text-[10px] text-muted-foreground">Kelola member & transaksi</p>
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap justify-end">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setVipDialogOpen(true)} title="VIP Setting">
            <Crown className="w-3.5 h-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSpinDialogOpen(true)} title="Setting Hadiah Buka Kotak">
            <PackageOpen className="w-3.5 h-3.5" />
          </Button>

          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setLegalityDialogOpen(true)} title="Legalitas">
            <Shield className="w-3.5 h-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setBackupDialogOpen(true)} title="Backup">
            <Database className="w-3.5 h-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCouponDialogOpen(true)} title="Redeem Code">
            <Ticket className="w-3.5 h-3.5" />
          </Button>
          <Link to="/admin/products">
            <Button variant="outline" size="icon" className="h-8 w-8" title="Produk">
              <Package className="w-3.5 h-3.5" />
            </Button>
          </Link>
          <Link to="/admin/users">
            <Button variant="default" size="icon" className="h-8 w-8" title="Users">
              <UserCog className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Overview Cards - 2 sections */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatCard icon={Users} label="Total Member" value={stats.totalUsers} color="text-primary" />
        <StatCard icon={UserPlus} label="Daftar Saja" value={stats.membersOnly} color="text-muted-foreground" />
        <StatCard icon={DollarSign} label="Member Deposit" value={stats.membersDeposit} color="text-success" />
        <StatCard icon={Clock} label="Pending TX" value={stats.pendingCount} color="text-accent" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <StatCard icon={Wallet} label="Total Balance" value={formatCurrency(stats.totalBalance)} color="text-foreground" />
        <StatCard icon={TrendingUp} label="Total Income" value={formatCurrency(stats.totalIncome)} color="text-primary" />
        <StatCard icon={ArrowUpRight} label="Total Recharge" value={formatCurrency(stats.totalRecharge)} color="text-success" />
        <StatCard icon={ArrowDownRight} label="Total Withdraw" value={formatCurrency(stats.totalWithdraw)} color="text-destructive" />
      </div>

      {/* Transactions */}
      <Card>
        <Tabs defaultValue="pending">
          <CardHeader className="p-4 pb-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Transaksi</CardTitle>
              <TabsList className="h-8">
                <TabsTrigger value="pending" className="text-[10px] h-7 px-3">
                  Pending {pendingTransactions.length > 0 && <Badge className="ml-1.5 h-4 w-4 p-0 flex items-center justify-center text-[9px] bg-accent text-accent-foreground border-0">{pendingTransactions.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="history" className="text-[10px] h-7 px-3">Semua</TabsTrigger>
              </TabsList>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <TabsContent value="pending" className="mt-0">
              <TransactionTable data={pendingTransactions} showActions />
            </TabsContent>
            <TabsContent value="history" className="mt-0 space-y-3">
              <div className="flex gap-1.5 flex-wrap">
                {["all", "withdraw", "recharge", "income", "invest"].map((filter) => (
                  <Button
                    key={filter}
                    variant={txFilter === filter ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTxFilter(filter)}
                    className="h-7 text-[10px] px-3 capitalize"
                  >
                    {filter === "all" ? "Semua" : filter}
                  </Button>
                ))}
              </div>
              <TransactionTable data={filteredTransactions} showActions />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* Coupon Dialog */}
      <Dialog open={couponDialogOpen} onOpenChange={setCouponDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Ticket className="w-5 h-5 text-primary" />Kelola Redeem Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3 p-3 rounded-lg border border-dashed border-border bg-muted/30">
              <div className="space-y-1.5">
                <Label className="text-[11px]">Redeem Code (opsional, angka saja)</Label>
                <div className="flex gap-2">
                  <Input
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={couponForm.code}
                    onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.replace(/\D/g, "") })}
                    placeholder="Auto-generate jika kosong"
                    className="h-8 text-xs font-mono"
                  />
                  <Button type="button" variant="outline" size="sm" className="h-8 text-[10px]" onClick={generateRandomCode}>
                    Acak
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">Kuantitas (jumlah user yang bisa pakai)</Label>
                <Input
                  type="number"
                  min={1}
                  value={couponForm.max_uses}
                  onChange={(e) => setCouponForm({ ...couponForm, max_uses: e.target.value })}
                  placeholder="1"
                  className="h-8 text-xs"
                />
                <p className="text-[10px] text-muted-foreground">Misal isi 100 untuk dibagi ke grup berisi 100 member.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-[11px]">Hadiah Min (Rp)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={couponForm.reward_min}
                    onChange={(e) => setCouponForm({ ...couponForm, reward_min: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px]">Hadiah Max (Rp)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={couponForm.reward_max}
                    onChange={(e) => setCouponForm({ ...couponForm, reward_max: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
              <Button onClick={generateCoupon} className="w-full h-9 text-xs">
                <Ticket className="w-4 h-4 mr-2" />Buat Redeem Code
              </Button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {coupons.map((coupon: any) => {
                const cur = coupon.current_uses ?? (coupon.is_used ? 1 : 0);
                const max = coupon.max_uses ?? 1;
                const habis = cur >= max;
                return (
                  <div key={coupon.id} className={`flex items-center justify-between p-3 rounded-lg border ${habis ? "bg-muted/50 opacity-60" : "bg-muted"}`}>
                    <div className="min-w-0">
                      <p className="font-mono font-bold text-foreground text-sm">{coupon.code}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Dipakai {cur}/{max} · {formatCurrency(coupon.reward_min ?? 100)}–{formatCurrency(coupon.reward_max ?? 1000)}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(coupon.code)} title="Salin kode">
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => shareCouponLink(coupon.code)} title="Bagikan link">
                        <Share2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteCoupon(coupon.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {coupons.length === 0 && <p className="text-center text-muted-foreground text-xs py-4">Belum ada kupon</p>}
            </div>
          </div>
        </DialogContent>
      </Dialog>


      {/* VIP Settings Dialog */}
      <Dialog open={vipDialogOpen} onOpenChange={setVipDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md mx-auto max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="flex items-center gap-2"><Crown className="w-5 h-5 text-secondary" />Setting VIP Level</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-3 space-y-3">
            <p className="text-[11px] text-muted-foreground">
              Naik VIP dilakukan <b>manual per user</b> dari menu Manage Users. Di sini Anda hanya mengatur <b>nama tingkatan</b> dan bisa menambah level baru sesuka hati.
            </p>

            {editingVip.map((cfg, idx) => (
              <div key={cfg.level} className="p-3 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge className="bg-secondary/20 text-secondary border-0 font-bold shrink-0">VIP {cfg.level}</Badge>
                  {cfg.level !== 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[10px] text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteVipLevel(cfg.level)}
                    >
                      <Trash2 className="w-3 h-3 mr-1" /> Hapus
                    </Button>
                  )}
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Nama Tingkatan</Label>
                  <Input
                    type="text"
                    placeholder={defaultVipTitle(cfg.level)}
                    value={cfg.title}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditingVip(prev => prev.map((v, i) => i === idx ? { ...v, title: val } : v));
                    }}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            ))}

            <div className="p-3 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 space-y-2">
              <p className="text-[11px] font-semibold text-primary">Tambah Tingkatan Baru</p>
              <div className="grid grid-cols-[80px_1fr] gap-2">
                <Input
                  type="number"
                  min={0}
                  placeholder="Lv"
                  value={newVipLevel}
                  onChange={(e) => setNewVipLevel(e.target.value)}
                  className="h-8 text-sm"
                />
                <Input
                  type="text"
                  placeholder="Nama tingkatan"
                  value={newVipTitle}
                  onChange={(e) => setNewVipTitle(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <Button onClick={handleAddVipLevel} size="sm" className="w-full h-8 text-[11px]">
                <UserPlus className="w-3.5 h-3.5 mr-1" /> Tambah Tingkatan
              </Button>
            </div>
          </div>
          <div className="px-6 pb-6 pt-2 border-t border-border/50">
            <Button onClick={handleSaveVipSettings} className="w-full" disabled={isLoading === 'vip'}>
              {isLoading === 'vip' ? 'Menyimpan...' : 'Simpan Setting'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BackupDialog open={backupDialogOpen} onOpenChange={setBackupDialogOpen} />
      <SpinSettingsDialog open={spinDialogOpen} onOpenChange={setSpinDialogOpen} />
      <LegalityDialog open={legalityDialogOpen} onOpenChange={setLegalityDialogOpen} />
    </div>
  );
};

export default Admin;
