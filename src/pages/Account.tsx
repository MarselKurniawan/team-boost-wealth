import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Users,
  Gift,
  Package,
  Sparkles,
  Bell,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getTransactions, getInvestments, updateInvestment, updateProfile, createTransaction, formatCurrency, canClaimToday, processReferralRabat, getNextClaimDelayMs, Transaction, Investment } from "@/lib/database";
import ClaimRewardDialog from "@/components/ClaimRewardDialog";

const Account = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);

  const refreshData = async () => {
    if (user) {
      const [txData, invData] = await Promise.all([
        getTransactions(user.id),
        getInvestments(user.id)
      ]);
      setTransactions(txData);
      setInvestments(invData);
      await refreshProfile();
    }
  };

  useEffect(() => {
    refreshData();
  }, [user]);

  const monitoringData = {
    totalIncome: profile?.total_income || 0,
    totalRecharge: profile?.total_recharge || 0,
    totalWithdraw: profile?.total_withdraw || 0,
    teamIncome: profile?.team_income || 0,
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "recharge":
        return <ArrowUpRight className="w-4 h-4 text-success" />;
      case "withdraw":
        return <ArrowDownRight className="w-4 h-4 text-accent" />;
      case "income":
        return <TrendingUp className="w-4 h-4 text-success" />;
      case "commission":
        return <Users className="w-4 h-4 text-primary" />;
      case "rabat":
        return <Users className="w-4 h-4 text-vip-gold" />;
      case "invest":
        return <Package className="w-4 h-4 text-primary" />;
      default:
        return <Wallet className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getTransactionLabel = (type: string) => {
    const labels: Record<string, string> = {
      recharge: "Isi Ulang",
      withdraw: "Tarik",
      invest: "Sewa Robot",
      income: "Pendapatan Harian",
      commission: "Komisi Tim",
      rabat: "Rabat Harian",
    };
    return labels[type] || type;
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "success":
        return "success";
      case "pending":
        return "outline";
      case "rejected":
        return "destructive";
      default:
        return "outline";
    }
  };

  const activeInvestments = investments.filter(i => i.status === 'active');

  const handleOpenClaimDialog = (investment: Investment) => {
    setSelectedInvestment(investment);
    setClaimDialogOpen(true);
  };

  const handleClaim = async () => {
    if (!selectedInvestment || !user || !profile) return;

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase.rpc('claim_investment_atomic' as any, { _investment_id: selectedInvestment.id });
      if (error) throw error;
      const res = data as any;
      if (!res?.claimed) {
        toast({
          title: "Sudah Diklaim",
          description: "Profit untuk siklus ini sudah masuk otomatis.",
        });
        await refreshData();
        return;
      }

      const result = { amount: Number(res.amount) };

      await processReferralRabat(user.id, result.amount);

      await refreshData();

      toast({
        title: "🎉 Klaim Berhasil!",
        description: `Anda mendapatkan ${formatCurrency(result.amount)} dari ${selectedInvestment.product_name}`,
      });
    } catch (error) {
      console.error('Error claiming income:', error);
      toast({
        title: "Gagal Klaim",
        description: "Terjadi kesalahan saat mengklaim penghasilan. Silakan coba lagi.",
        variant: "destructive",
      });
    }
  };

  // Count claimable investments (exclude locked mode — those pay at contract end)
  const claimableInvestments = activeInvestments.filter(inv =>
    (inv as any).profit_mode !== 'locked' && canClaimToday(inv.last_claimed_at, inv.created_at)
  );
  const totalClaimable = claimableInvestments.reduce((sum, inv) => sum + inv.daily_income, 0);

  return (
    <div className="space-y-4 p-4 pt-5">
      {/* Claimable Notification Banner */}
      {claimableInvestments.length > 0 && (
        <div className="modal-card p-3.5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-muted rounded-lg flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground">
                {claimableInvestments.length} Robot Siap Diklaim
              </p>
              <p className="text-[10px] text-muted-foreground break-all">
                Total: <span className="font-bold text-primary">{formatCurrency(totalClaimable)}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-base font-heading font-bold text-foreground mb-0.5">Produk Saya</h1>
        <p className="text-[11px] text-muted-foreground">Monitor aktivitas dan pendapatan Anda</p>
      </div>

      {/* Monitoring Dashboard */}
      <div>
        <h2 className="text-xs font-heading font-bold text-foreground mb-2">Statistik</h2>
        <div className="grid grid-cols-2 gap-2.5">
          <Card className="bg-card/80 border-border/60">
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-success" />
                <p className="text-[10px] font-medium text-muted-foreground">Total Pendapatan</p>
              </div>
              <p className="text-sm font-bold text-success break-all">{formatCurrency(monitoringData.totalIncome)}</p>
            </CardContent>
          </Card>

          <Card className="bg-card/80 border-border/60">
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <ArrowUpRight className="w-3.5 h-3.5 text-success" />
                <p className="text-[10px] font-medium text-muted-foreground">Total Isi Ulang</p>
              </div>
              <p className="text-sm font-bold text-foreground break-all">
                {formatCurrency(monitoringData.totalRecharge)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/80 border-border/60">
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <ArrowDownRight className="w-3.5 h-3.5 text-accent" />
                <p className="text-[10px] font-medium text-muted-foreground">Total Tarik</p>
              </div>
              <p className="text-sm font-bold text-foreground break-all">
                {formatCurrency(monitoringData.totalWithdraw)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/80 border-border/60">
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Users className="w-3.5 h-3.5 text-primary" />
                <p className="text-[10px] font-medium text-muted-foreground">Komisi Tim</p>
              </div>
              <p className="text-sm font-bold text-primary break-all">{formatCurrency(monitoringData.teamIncome)}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Active Robots */}
      {activeInvestments.length > 0 && (
        <Card className="bg-card/80 border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs flex items-center gap-1.5">
              <Package className="w-4 h-4 text-primary" />
              Alat milik saya ({activeInvestments.length}/{activeInvestments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {activeInvestments.map((inv) => {
              const isLocked = (inv as any).profit_mode === 'locked';
              const canClaim = !isLocked && canClaimToday(inv.last_claimed_at, inv.created_at);
              const accruedTotal = inv.daily_income * (inv.validity - inv.days_remaining);
              const finalPayout = inv.total_income;
              return (
                <div key={inv.id} className="modal-card p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground">{inv.product_name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Melayani {inv.days_remaining} hari lagi
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="success" className="text-[9px] h-4 px-1.5">Aktif</Badge>
                      {isLocked && (
                        <Badge className="text-[9px] h-4 px-1.5 bg-primary/15 text-primary border border-primary/40">
                          🔒 Locked
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-border">
                    <div>
                      <p className="text-[9px] text-muted-foreground">Sewa</p>
                      <p className="text-[11px] font-semibold break-all">{formatCurrency(inv.amount)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground">{isLocked ? "Akrual" : "Harian"}</p>
                      <p className="text-[11px] font-semibold text-primary break-all">
                        {formatCurrency(isLocked ? accruedTotal : inv.daily_income)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground">{isLocked ? "Payout Akhir" : "Diperoleh"}</p>
                      <p className="text-[11px] font-semibold text-primary break-all">
                        {formatCurrency(isLocked ? finalPayout : inv.total_earned)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2.5 pt-2.5 border-t border-border">
                    {isLocked ? (
                      <Button disabled variant="outline" className="w-full h-9 text-[10px]">
                        <span className="opacity-70 mr-1">🔒 Payout otomatis saat kontrak selesai:</span>
                        <span className="font-semibold">{formatCurrency(finalPayout)}</span>
                      </Button>
                    ) : canClaim ? (
                      <Button
                        onClick={() => handleOpenClaimDialog(inv)}
                        className="w-full h-9 text-xs font-semibold"
                      >
                        <Gift className="w-3.5 h-3.5 mr-1.5" />
                        Klaim {formatCurrency(inv.daily_income)}
                      </Button>
                    ) : (
                      <ProfitCountdown
                        lastClaimedAt={inv.last_claimed_at}
                        createdAt={inv.created_at}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {activeInvestments.length === 0 && (
        <Card className="bg-card/80 border-border/60">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto mb-3">
              <Package className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <p className="text-xs font-semibold text-foreground">Alat milik saya (0/0)</p>
            <p className="text-[10px] text-muted-foreground mt-1">Belum ada robot aktif. Sewa robot untuk mulai!</p>
          </CardContent>
        </Card>
      )}

      {/* Catatan Transaksi */}
      <TransactionLog
        transactions={transactions}
        getIcon={getTransactionIcon}
        getLabel={getTransactionLabel}
        getStatusVariant={getStatusVariant}
      />



      {/* Claim Reward Dialog */}
      <ClaimRewardDialog
        open={claimDialogOpen}
        onOpenChange={setClaimDialogOpen}
        amount={selectedInvestment?.daily_income || 0}
        productName={selectedInvestment?.product_name || ""}
        onClaim={handleClaim}
      />
    </div>
  );
};

const formatCountdown = (ms: number) => {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

const ProfitCountdown = ({
  lastClaimedAt,
  createdAt,
}: {
  lastClaimedAt: string | null;
  createdAt: string;
}) => {
  const [remaining, setRemaining] = useState(() =>
    getNextClaimDelayMs(lastClaimedAt, createdAt)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(getNextClaimDelayMs(lastClaimedAt, createdAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [lastClaimedAt, createdAt]);

  return (
    <Button disabled variant="outline" className="w-full h-9 text-[10px]">
      <span className="opacity-70 mr-1">Profit berikutnya</span>
      <span className="font-mono font-semibold">{formatCountdown(remaining)}</span>
    </Button>
  );
};

const PAGE_SIZE = 8;

const POSITIVE_TYPES = new Set(["recharge", "income", "commission", "rabat"]);

const TransactionLog = ({
  transactions,
  getIcon,
  getLabel,
  getStatusVariant,
}: {
  transactions: Transaction[];
  getIcon: (t: string) => JSX.Element;
  getLabel: (t: string) => string;
  getStatusVariant: (s: string) => string;
}) => {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = useMemo(
    () => transactions.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [transactions, currentPage],
  );

  const formatDateTime = (d: string) => {
    const date = new Date(d);
    const datePart = date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
    const timePart = date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    return { datePart, timePart };
  };

  return (
    <Card className="bg-card/80 border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs">Catatan Transaksi</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-xs text-muted-foreground">Belum ada transaksi</p>
          </div>
        ) : (
          <>
            {pageItems.map((transaction) => {
              const isPositive = POSITIVE_TYPES.has(transaction.type);
              const { datePart, timePart } = formatDateTime(transaction.created_at);
              return (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 bg-background rounded-full flex items-center justify-center shrink-0">
                      {getIcon(transaction.type)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-foreground truncate">
                        {getLabel(transaction.type)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {datePart} <span className="opacity-70">• {timePart}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={`text-xs font-bold break-all ${
                        isPositive ? "text-success" : "text-foreground"
                      }`}
                    >
                      {isPositive ? "+" : "-"}
                      {formatCurrency(transaction.amount)}
                    </p>
                    <Badge
                      variant={getStatusVariant(transaction.status) as any}
                      className="text-[9px] h-4 px-1.5 capitalize"
                    >
                      {transaction.status}
                    </Badge>
                  </div>
                </div>
              );
            })}

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-[10px] text-muted-foreground">
                  Hal {currentPage} dari {totalPages}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={currentPage <= 1}
                    onClick={() => setPage(currentPage - 1)}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage(currentPage + 1)}
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default Account;

