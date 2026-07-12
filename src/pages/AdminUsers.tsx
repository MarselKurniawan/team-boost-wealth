import { useState, useEffect, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  getAllProfiles,
  getTransactions,
  getInvestments,
  getTeamMembers,
  updateProfile,
  setUserAdmin,
  deleteUser,
  formatCurrency,
  getCommissionRate,
  Profile,
  Transaction,
  Investment,
} from "@/lib/database";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, ArrowUpRight, ArrowDownRight, Search, Eye, Edit, Plus, Minus,
  Trash2, UserCog, TrendingUp, Wallet, Crown, Share2, ChevronLeft, Package,
  ShieldCheck, ShieldOff, KeyRound,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Link } from "react-router-dom";

import { useVipTitles } from "@/hooks/useVipTitles";

const AdminUsers = () => {
  const { toast } = useToast();
  const { titleFor, levels: vipLevels } = useVipTitles();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<Profile[]>([]);

  // Edit user dialog
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");

  // Delete user dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<Profile | null>(null);

  // Admin roles cache
  const [adminUserIds, setAdminUserIds] = useState<Set<string>>(new Set());

  // Add balance dialog
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false);
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceAction, setBalanceAction] = useState<"add" | "subtract">("add");

  // Password reset dialog
  const [pwDialogOpen, setPwDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  // User detail dialog
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [userTransactions, setUserTransactions] = useState<Transaction[]>([]);
  const [userInvestments, setUserInvestments] = useState<Investment[]>([]);
  const [userReferrals, setUserReferrals] = useState<Profile[]>([]);
  const [detailTab, setDetailTab] = useState("overview");
  const [userIsAdmin, setUserIsAdmin] = useState(false);

  // Per-tab search & pagination
  const [walletSearch, setWalletSearch] = useState("");
  const [walletPage, setWalletPage] = useState(1);
  const [walletPerPage, setWalletPerPage] = useState(10);
  const [investSearch, setInvestSearch] = useState("");
  const [investPage, setInvestPage] = useState(1);
  const [investPerPage, setInvestPerPage] = useState(10);
  const [teamSearch, setTeamSearch] = useState("");
  const [teamPage, setTeamPage] = useState(1);
  const [teamPerPage, setTeamPerPage] = useState(10);

  const loadData = async () => {
    const data = await getAllProfiles();
    setProfiles(data);
    setFilteredUsers(data);

    // Load admin roles
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');
    const adminIds = new Set((rolesData || []).map(r => r.user_id));
    setAdminUserIds(adminIds);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = profiles.filter(
        (u) =>
          u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (u.referral_code?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(profiles);
    }
  }, [searchTerm, profiles]);

  const handleUpdateVip = async (userId: string, newLevel: number) => {
    // Optimistic update so dropdown tidak balik ke 0 saat menunggu reload
    setProfiles(prev => prev.map(p => p.user_id === userId ? { ...p, vip_level: newLevel } : p));
    setFilteredUsers(prev => prev.map(p => p.user_id === userId ? { ...p, vip_level: newLevel } : p));

    const { data, error } = await supabase
      .from('profiles')
      .update({ vip_level: newLevel })
      .eq('user_id', userId)
      .select('vip_level')
      .maybeSingle();

    if (error || !data) {
      toast({
        title: "Gagal Update VIP",
        description: error?.message || "Tidak ada baris terupdate (cek hak admin)",
        variant: "destructive",
      });
      loadData();
      return;
    }
    toast({ title: "VIP Level Updated", description: `User sekarang VIP ${data.vip_level}` });
    loadData();
  };

  const handleToggleAdmin = async (userId: string, currentIsAdmin: boolean) => {
    await setUserAdmin(userId, !currentIsAdmin);
    toast({
      title: !currentIsAdmin ? "Admin Ditambahkan" : "Admin Dihapus",
      description: `Status admin berhasil diubah`,
    });
    loadData();
  };

  const openEditUser = (user: Profile) => {
    setSelectedUser(user);
    setEditName(user.name);
    setEditEmail(user.email || "");
    setEditUserOpen(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;
    await updateProfile(selectedUser.user_id, { name: editName, email: editEmail });
    toast({ title: "User Updated", description: "Data user berhasil diperbarui" });
    setEditUserOpen(false);
    loadData();
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    const success = await deleteUser(userToDelete.user_id);
    if (success) {
      toast({ title: "User Dihapus", description: `${userToDelete.name} berhasil dihapus` });
    } else {
      toast({ title: "Error", description: "Gagal menghapus user", variant: "destructive" });
    }
    setDeleteDialogOpen(false);
    setUserToDelete(null);
    loadData();
  };

  const openBalanceDialog = (user: Profile, action: "add" | "subtract") => {
    setSelectedUser(user);
    setBalanceAction(action);
    setBalanceAmount("");
    setBalanceDialogOpen(true);
  };

  const handleUpdateBalance = async () => {
    if (!selectedUser || !balanceAmount) return;
    const amount = parseInt(balanceAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Error", description: "Masukkan jumlah yang valid", variant: "destructive" });
      return;
    }

    const newBalance = balanceAction === "add"
      ? selectedUser.balance + amount
      : Math.max(0, selectedUser.balance - amount);
    
    await updateProfile(selectedUser.user_id, { balance: newBalance });
    toast({
      title: "Balance Updated",
      description: `${balanceAction === "add" ? "Ditambahkan" : "Dikurangi"} ${formatCurrency(amount)}`,
    });
    setBalanceDialogOpen(false);
    loadData();
  };

  const openUserDetail = async (user: Profile) => {
    setSelectedUser(user);
    const [txData, invData, teamData] = await Promise.all([
      getTransactions(user.user_id),
      getInvestments(user.user_id),
      user.referral_code ? getTeamMembers(user.referral_code) : Promise.resolve([]),
    ]);
    setUserTransactions(txData);
    setUserInvestments(invData);
    setUserReferrals(teamData);
    setDetailTab("overview");
    setWalletSearch(""); setWalletPage(1);
    setInvestSearch(""); setInvestPage(1);
    setTeamSearch(""); setTeamPage(1);
    setDetailDialogOpen(true);
  };

  const openPwDialog = (user: Profile) => {
    setSelectedUser(user);
    setNewPassword("");
    setPwDialogOpen(true);
  };

  const handleResetPassword = async () => {
    if (!selectedUser || newPassword.length < 6) {
      toast({ title: "Error", description: "Password minimal 6 karakter", variant: "destructive" });
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("admin-reset-password", {
        body: { userId: selectedUser.user_id, newPassword },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: "Password Diubah", description: `Password ${selectedUser.name} berhasil direset` });
      setPwDialogOpen(false);
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message || "Gagal reset password", variant: "destructive" });
    }
  };

  const getReferrerName = (referralCode: string | null): string => {
    if (!referralCode) return "-";
    const referrer = profiles.find((u) => u.referral_code === referralCode);
    return referrer ? referrer.name : referralCode;
  };

  const getTotalReferralCommission = (transactions: Transaction[]): number => {
    return transactions
      .filter((t) => t.type === "commission" && t.status === "success")
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const stats = {
    totalUsers: profiles.length,
    totalBalance: profiles.reduce((sum, u) => sum + u.balance, 0),
    totalIncome: profiles.reduce((sum, u) => sum + u.total_income, 0),
    totalReferrals: profiles.filter(p => p.referred_by).length,
  };

  return (
    <div className="space-y-6 p-4 pt-6 pb-24">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <Link to="/admin" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-4 h-4" /><span className="text-sm">Kembali ke Admin</span>
        </Link>
        <div className="flex items-center gap-2">
          <UserCog className="w-6 h-6 text-primary" />
          <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground">Manage Users</h1>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
        <Card className="min-w-0 overflow-hidden">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-1.5 mb-1"><Users className="w-4 h-4 shrink-0 text-primary" /><p className="text-[10px] sm:text-xs text-muted-foreground">Total Users</p></div>
            <p className="text-lg sm:text-2xl font-bold">{stats.totalUsers}</p>
          </CardContent>
        </Card>
        <Card className="min-w-0 overflow-hidden">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-1.5 mb-1"><Wallet className="w-4 h-4 shrink-0 text-success" /><p className="text-[10px] sm:text-xs text-muted-foreground">Total Balance</p></div>
            <p className="text-[10px] sm:text-lg font-bold break-all">{formatCurrency(stats.totalBalance)}</p>
          </CardContent>
        </Card>
        <Card className="min-w-0 overflow-hidden">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-1.5 mb-1"><TrendingUp className="w-4 h-4 shrink-0 text-primary" /><p className="text-[10px] sm:text-xs text-muted-foreground">Total Income</p></div>
            <p className="text-[10px] sm:text-lg font-bold break-all">{formatCurrency(stats.totalIncome)}</p>
          </CardContent>
        </Card>
        <Card className="min-w-0 overflow-hidden">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-1.5 mb-1"><Share2 className="w-4 h-4 shrink-0 text-accent" /><p className="text-[10px] sm:text-xs text-muted-foreground">Total Referrals</p></div>
            <p className="text-lg sm:text-2xl font-bold">{stats.totalReferrals}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Cari nama, email, atau kode referral..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
      </div>

      {/* Users List */}
      <div className="space-y-3">
        {filteredUsers.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="p-8 text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">Tidak ada user ditemukan</p>
            </CardContent>
          </Card>
        ) : (
          filteredUsers.map((user) => (
            <Card key={user.id} className="min-w-0 overflow-hidden">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-foreground">{user.name}</p>
                      <Badge variant="outline" className="text-xs"><Crown className="w-3 h-3 mr-1" />{titleFor(user.vip_level)}</Badge>
                      {adminUserIds.has(user.user_id) && <Badge className="text-xs bg-primary">Admin</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">Ref: <span className="text-primary font-medium">{user.referral_code}</span></p>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-sm sm:text-lg font-bold text-foreground break-all">{formatCurrency(user.balance)}</p>
                    <p className="text-xs text-muted-foreground">Saldo</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1 sm:gap-2 text-center bg-muted rounded-lg p-2 sm:p-3 mb-3">
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Recharge</p>
                    <p className="text-[10px] sm:text-sm font-semibold break-all">{formatCurrency(user.total_recharge)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Pendapatan</p>
                    <p className="text-[10px] sm:text-sm font-semibold text-success break-all">{formatCurrency(user.total_income)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Withdraw</p>
                    <p className="text-[10px] sm:text-sm font-semibold text-accent break-all">{formatCurrency(user.total_withdraw)}</p>
                  </div>
                </div>

                <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                  <Button variant="default" size="sm" className="text-xs px-2 sm:px-3" onClick={() => openUserDetail(user)}>
                    <Eye className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Detail</span>
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs px-2 sm:px-3" onClick={() => openEditUser(user)}>
                    <Edit className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Edit</span>
                  </Button>
                  <Button variant="outline" size="sm" className="px-2" onClick={() => openBalanceDialog(user, "add")}>
                    <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="px-2" onClick={() => openBalanceDialog(user, "subtract")}>
                    <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={`px-2 ${adminUserIds.has(user.user_id) ? 'text-primary border-primary' : ''}`}
                    onClick={() => handleToggleAdmin(user.user_id, adminUserIds.has(user.user_id))}
                  >
                    {adminUserIds.has(user.user_id) ? <ShieldOff className="w-3 h-3 sm:w-4 sm:h-4" /> : <ShieldCheck className="w-3 h-3 sm:w-4 sm:h-4" />}
                  </Button>
                  <Button variant="outline" size="sm" className="px-2" onClick={() => openPwDialog(user)} title="Reset Password">
                    <KeyRound className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="px-2 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => { setUserToDelete(user); setDeleteDialogOpen(true); }}
                  >
                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                  <select 
                    className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm rounded-md bg-muted border border-border max-w-[160px]" 
                    value={user.vip_level} 
                    onChange={(e) => handleUpdateVip(user.user_id, parseInt(e.target.value))}
                  >
                    {(vipLevels.length ? vipLevels : [0,1,2,3,4,5]).map((level) => (
                      <option key={level} value={level}>{`VIP ${level} · ${titleFor(level)}`}</option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit User Dialog */}
      <Dialog open={editUserOpen} onOpenChange={setEditUserOpen}>
        <DialogContent className="w-[95vw] max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Ubah informasi user</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nama</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setEditUserOpen(false)} className="w-full sm:w-auto">Batal</Button>
            <Button onClick={handleSaveUser} className="w-full sm:w-auto">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Balance Dialog */}
      <Dialog open={balanceDialogOpen} onOpenChange={setBalanceDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle>{balanceAction === "add" ? "Tambah" : "Kurangi"} Saldo</DialogTitle>
            <DialogDescription>Untuk: {selectedUser?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Jumlah</Label>
              <Input type="number" value={balanceAmount} onChange={(e) => setBalanceAmount(e.target.value)} placeholder="Masukkan jumlah" />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setBalanceDialogOpen(false)} className="w-full sm:w-auto">Batal</Button>
            <Button onClick={handleUpdateBalance} className={`w-full sm:w-auto ${balanceAction === "subtract" ? "bg-destructive hover:bg-destructive/90" : ""}`}>
              {balanceAction === "add" ? "Tambah" : "Kurangi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="w-[95vw] max-w-md mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus User?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda yakin ingin menghapus <strong>{userToDelete?.name}</strong>? Semua data user termasuk investasi, transaksi, dan profil akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive hover:bg-destructive/90">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Password Reset Dialog */}
      <Dialog open={pwDialogOpen} onOpenChange={setPwDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><KeyRound className="w-4 h-4 text-primary" /> Reset Password</DialogTitle>
            <DialogDescription>User: {selectedUser?.name} ({selectedUser?.phone})</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label className="text-xs">Password Baru</Label>
            <Input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min. 6 karakter" />
            <p className="text-[10px] text-muted-foreground">Beritahu password baru ke member secara manual.</p>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setPwDialogOpen(false)} className="w-full sm:w-auto">Batal</Button>
            <Button onClick={handleResetPassword} className="w-full sm:w-auto">Reset Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="w-[95vw] max-w-2xl mx-auto p-0 overflow-hidden flex flex-col max-h-[90vh]">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Eye className="w-4 h-4 text-primary" /> {selectedUser?.name}
            </DialogTitle>
            <DialogDescription className="text-[11px]">
              {selectedUser?.phone} · Ref: {selectedUser?.referral_code}
            </DialogDescription>
          </DialogHeader>
          <Tabs value={detailTab} onValueChange={setDetailTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="mx-4 mt-3 grid grid-cols-4 h-8">
              <TabsTrigger value="overview" className="text-[10px]">Overview</TabsTrigger>
              <TabsTrigger value="wallet" className="text-[10px]">Dompet</TabsTrigger>
              <TabsTrigger value="invest" className="text-[10px]">Investasi</TabsTrigger>
              <TabsTrigger value="team" className="text-[10px]">Tim</TabsTrigger>
            </TabsList>
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-3">
              <TabsContent value="overview" className="mt-0 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded bg-muted/50"><p className="text-[10px] text-muted-foreground">Saldo</p><p className="text-xs font-bold break-all">{formatCurrency(selectedUser?.balance || 0)}</p></div>
                  <div className="p-2 rounded bg-muted/50"><p className="text-[10px] text-muted-foreground">Total Income</p><p className="text-xs font-bold text-success break-all">{formatCurrency(selectedUser?.total_income || 0)}</p></div>
                  <div className="p-2 rounded bg-muted/50"><p className="text-[10px] text-muted-foreground">Total Recharge</p><p className="text-xs font-bold break-all">{formatCurrency(selectedUser?.total_recharge || 0)}</p></div>
                  <div className="p-2 rounded bg-muted/50"><p className="text-[10px] text-muted-foreground">Total Withdraw</p><p className="text-xs font-bold break-all">{formatCurrency(selectedUser?.total_withdraw || 0)}</p></div>
                  <div className="p-2 rounded bg-muted/50"><p className="text-[10px] text-muted-foreground">Team Income</p><p className="text-xs font-bold break-all">{formatCurrency(selectedUser?.team_income || 0)}</p></div>
                  <div className="p-2 rounded bg-muted/50"><p className="text-[10px] text-muted-foreground">VIP Level</p><p className="text-xs font-bold">VIP {selectedUser?.vip_level}</p></div>
                </div>
                <div className="p-2 rounded bg-muted/50">
                  <p className="text-[10px] text-muted-foreground">Referrer</p>
                  <p className="text-xs font-bold">{getReferrerName(selectedUser?.referred_by || null)}</p>
                </div>
              </TabsContent>

              <TabsContent value="wallet" className="mt-0 space-y-2">
                {(() => {
                  const totalIn = userTransactions.filter(t => ["recharge", "income", "commission", "spin_reward", "checkin", "coupon"].includes(t.type) && t.status === "success").reduce((s, t) => s + Number(t.amount), 0);
                  const totalOut = userTransactions.filter(t => ["withdraw", "invest"].includes(t.type) && t.status === "success").reduce((s, t) => s + Number(t.amount), 0);
                  const totalProfit = userTransactions.filter(t => ["income", "commission", "spin_reward", "checkin"].includes(t.type) && t.status === "success").reduce((s, t) => s + Number(t.amount), 0);
                  const q = walletSearch.toLowerCase();
                  const filtered = userTransactions.filter(tx =>
                    !q || tx.type.toLowerCase().includes(q) || (tx.description || "").toLowerCase().includes(q) || tx.status.toLowerCase().includes(q) || String(tx.amount).includes(q)
                  );
                  const totalPages = Math.max(1, Math.ceil(filtered.length / walletPerPage));
                  const page = Math.min(walletPage, totalPages);
                  const pageItems = filtered.slice((page - 1) * walletPerPage, page * walletPerPage);
                  return (
                    <>
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        <div className="p-2 rounded bg-success/10 border border-success/20"><p className="text-[10px] text-muted-foreground">Total Masuk</p><p className="text-xs font-bold text-success break-all">{formatCurrency(totalIn)}</p></div>
                        <div className="p-2 rounded bg-destructive/10 border border-destructive/20"><p className="text-[10px] text-muted-foreground">Total Keluar</p><p className="text-xs font-bold text-destructive break-all">{formatCurrency(totalOut)}</p></div>
                        <div className="p-2 rounded bg-primary/10 border border-primary/20"><p className="text-[10px] text-muted-foreground">Total Profit</p><p className="text-xs font-bold text-primary break-all">{formatCurrency(totalProfit)}</p></div>
                      </div>
                      <div className="flex gap-2 items-center mb-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                          <Input value={walletSearch} onChange={e => { setWalletSearch(e.target.value); setWalletPage(1); }} placeholder="Cari tipe/deskripsi/status..." className="h-7 pl-6 text-[10px]" />
                        </div>
                        <Select value={String(walletPerPage)} onValueChange={v => { setWalletPerPage(Number(v)); setWalletPage(1); }}>
                          <SelectTrigger className="h-7 w-[70px] text-[10px]"><SelectValue /></SelectTrigger>
                          <SelectContent>{[5,10,20,50,100].map(n => <SelectItem key={n} value={String(n)} className="text-[10px]">{n}/hal</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        {pageItems.length === 0 ? (
                          <p className="text-center text-xs text-muted-foreground py-6">Tidak ada transaksi</p>
                        ) : pageItems.map(tx => (
                          <div key={tx.id} className="flex justify-between items-center p-2 rounded border bg-card">
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-semibold capitalize">{tx.type}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{tx.description || new Date(tx.created_at).toLocaleString("id-ID")}</p>
                            </div>
                            <div className="text-right shrink-0 ml-2">
                              <p className={`text-[11px] font-bold break-all ${["recharge","income","commission","spin_reward","checkin","coupon"].includes(tx.type) ? "text-success" : "text-destructive"}`}>
                                {["recharge","income","commission","spin_reward","checkin","coupon"].includes(tx.type) ? "+" : "-"}{formatCurrency(Number(tx.amount))}
                              </p>
                              <p className="text-[9px] text-muted-foreground capitalize">{tx.status}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between pt-2 text-[10px]">
                        <span className="text-muted-foreground">{filtered.length} item · Hal {page}/{totalPages}</span>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" disabled={page <= 1} onClick={() => setWalletPage(page - 1)}>Prev</Button>
                          <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" disabled={page >= totalPages} onClick={() => setWalletPage(page + 1)}>Next</Button>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </TabsContent>

              <TabsContent value="invest" className="mt-0 space-y-1">
                {(() => {
                  const q = investSearch.toLowerCase();
                  const filtered = userInvestments.filter(inv =>
                    !q || inv.product_name.toLowerCase().includes(q) || inv.status.toLowerCase().includes(q) || String(inv.amount).includes(q)
                  );
                  const totalPages = Math.max(1, Math.ceil(filtered.length / investPerPage));
                  const page = Math.min(investPage, totalPages);
                  const pageItems = filtered.slice((page - 1) * investPerPage, page * investPerPage);
                  return (
                    <>
                      <div className="flex gap-2 items-center mb-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                          <Input value={investSearch} onChange={e => { setInvestSearch(e.target.value); setInvestPage(1); }} placeholder="Cari produk/status..." className="h-7 pl-6 text-[10px]" />
                        </div>
                        <Select value={String(investPerPage)} onValueChange={v => { setInvestPerPage(Number(v)); setInvestPage(1); }}>
                          <SelectTrigger className="h-7 w-[70px] text-[10px]"><SelectValue /></SelectTrigger>
                          <SelectContent>{[5,10,20,50,100].map(n => <SelectItem key={n} value={String(n)} className="text-[10px]">{n}/hal</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      {pageItems.length === 0 ? (
                        <p className="text-center text-xs text-muted-foreground py-6">Tidak ada investasi</p>
                      ) : pageItems.map(inv => (
                        <div key={inv.id} className="p-2 rounded border bg-card">
                          <div className="flex justify-between items-start gap-2">
                            <p className="text-[11px] font-semibold min-w-0 flex-1 truncate">{inv.product_name}</p>
                            <Badge variant="outline" className="text-[9px] shrink-0">{inv.status}</Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-2 mt-1 text-[10px]">
                            <div><span className="text-muted-foreground">Modal:</span> <span className="font-semibold break-all">{formatCurrency(inv.amount)}</span></div>
                            <div><span className="text-muted-foreground">Profit:</span> <span className="font-semibold text-success break-all">{formatCurrency(inv.total_earned)}</span></div>
                            <div><span className="text-muted-foreground">Sisa:</span> <span className="font-semibold">{inv.days_remaining}/{inv.validity}</span></div>
                          </div>
                        </div>
                      ))}
                      <div className="flex items-center justify-between pt-2 text-[10px]">
                        <span className="text-muted-foreground">{filtered.length} item · Hal {page}/{totalPages}</span>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" disabled={page <= 1} onClick={() => setInvestPage(page - 1)}>Prev</Button>
                          <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" disabled={page >= totalPages} onClick={() => setInvestPage(page + 1)}>Next</Button>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </TabsContent>

              <TabsContent value="team" className="mt-0 space-y-1">
                {(() => {
                  const q = teamSearch.toLowerCase();
                  const filtered = userReferrals.filter(m =>
                    !q || m.name.toLowerCase().includes(q) || (m.phone || "").toLowerCase().includes(q) || (m.referral_code || "").toLowerCase().includes(q)
                  );
                  const totalPages = Math.max(1, Math.ceil(filtered.length / teamPerPage));
                  const page = Math.min(teamPage, totalPages);
                  const pageItems = filtered.slice((page - 1) * teamPerPage, page * teamPerPage);
                  return (
                    <>
                      <div className="flex gap-2 items-center mb-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                          <Input value={teamSearch} onChange={e => { setTeamSearch(e.target.value); setTeamPage(1); }} placeholder="Cari nama/nomor..." className="h-7 pl-6 text-[10px]" />
                        </div>
                        <Select value={String(teamPerPage)} onValueChange={v => { setTeamPerPage(Number(v)); setTeamPage(1); }}>
                          <SelectTrigger className="h-7 w-[70px] text-[10px]"><SelectValue /></SelectTrigger>
                          <SelectContent>{[5,10,20,50,100].map(n => <SelectItem key={n} value={String(n)} className="text-[10px]">{n}/hal</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      {pageItems.length === 0 ? (
                        <p className="text-center text-xs text-muted-foreground py-6">Tidak ada anggota tim</p>
                      ) : pageItems.map(m => (
                        <div key={m.id} className="flex justify-between items-center p-2 rounded border bg-card">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <p className="text-[11px] font-semibold break-all min-w-0">{m.name}</p>
                              {m.level && <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0">Level {m.level}</Badge>}
                            </div>
                            <p className="text-[10px] text-muted-foreground">{m.phone}</p>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <p className="text-[10px] font-semibold break-all">{formatCurrency(m.total_recharge)}</p>
                            <p className="text-[9px] text-muted-foreground">Recharge</p>
                          </div>
                        </div>
                      ))}
                      <div className="flex items-center justify-between pt-2 text-[10px]">
                        <span className="text-muted-foreground">{filtered.length} item · Hal {page}/{totalPages}</span>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" disabled={page <= 1} onClick={() => setTeamPage(page - 1)}>Prev</Button>
                          <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" disabled={page >= totalPages} onClick={() => setTeamPage(page + 1)}>Next</Button>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
