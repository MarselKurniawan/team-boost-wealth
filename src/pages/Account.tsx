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
    <div className="space-y-3.5 p-4 pt-4">
      {/* Header banner — matches home wallet aesthetic */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1e40af] to-[#3b82f6] p-3.5 text-white shadow-md shadow-blue-500/30">
        <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10" />
        <div className="absolute right-4 bottom-1">
          <Package className="w-12 h-12 text-white/10" strokeWidth={1} />
        </div>
        <div className="relative">
          <p className="text-[9px] uppercase tracking-[0.28em] text-white/60 font-semibold">Dashboard</p>
          <h1 className="text-white text-[15px] font-heading font-bold leading-tight mt-0.5">Produk Saya</h1>
          <p className="text-[10px] text-white/75 mt-0.5">Monitor aktivitas dan pendapatan Anda</p>
        </div>
      </div>

      {/* Claimable Notification Banner */}
      {claimableInvestments.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-r from-emerald-50 to-cyan-50 border border-emerald-200 p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-bold text-emerald-900">{claimableInvestments.length} Robot Siap Diklaim</p>
            <p className="text-[10px] text-emerald-700 break-all">
              Total: <span className="font-bold">{formatCurrency(totalClaimable)}</span>
            </p>
          </div>
        </div>
      )}



      {/* Statistik — Blue tone redesign */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1e3a8a] via-[#1e40af] to-[#3b82f6] p-4 shadow-lg shadow-blue-500/30">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-cyan-300/20 blur-2xl" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
        <Sparkles className="absolute top-3 right-4 w-3.5 h-3.5 text-white/40" />

        <div className="relative flex items-center justify-between mb-3">
          <div>
            <p className="text-[9px] uppercase tracking-[0.3em] text-white/60 font-semibold">Ringkasan</p>
            <h2 className="text-white font-heading text-sm font-bold">Statistik Akun</h2>
          </div>
          <div className="w-9 h-9 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center backdrop-blur">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
        </div>

        <div className="relative rounded-2xl bg-white/10 border border-white/20 backdrop-blur p-3 mb-2.5">
          <p className="text-[10px] text-white/70">Total Pendapatan</p>
          <p className="text-white text-xl font-heading font-bold break-all leading-tight mt-0.5">
            {formatCurrency(monitoringData.totalIncome)}
          </p>
          <div className="mt-1 inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-300">
            <TrendingUp className="w-3 h-3" /> Akumulasi profit
          </div>
        </div>

        <div className="relative grid grid-cols-3 gap-1.5">
          {[
            { icon: ArrowUpRight, label: "Isi Ulang", value: monitoringData.totalRecharge },
            { icon: ArrowDownRight, label: "Tarik", value: monitoringData.totalWithdraw },
            { icon: Users, label: "Komisi", value: monitoringData.teamIncome },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-white/10 border border-white/15 backdrop-blur p-2">
              <div className="flex items-center gap-1 text-white/70 mb-1">
                <s.icon className="w-3 h-3" />
                <p className="text-[9px] font-semibold uppercase tracking-wider">{s.label}</p>
              </div>
              <p className="text-white text-[11px] font-heading font-bold break-all leading-tight">
                {formatCurrency(s.value)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Active Robots — Blue gradient wallet style */}
      {activeInvestments.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 px-1">
            <Package className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-heading font-bold text-foreground">
              Alat milik saya ({activeInvestments.length}/{activeInvestments.length})
            </h3>
          </div>
          {activeInvestments.map((inv) => {
            const isLocked = (inv as any).profit_mode === 'locked';
            const canClaim = !isLocked && canClaimToday(inv.last_claimed_at, inv.created_at);
            const accruedTotal = inv.daily_income * (inv.validity - inv.days_remaining);
            const finalPayout = inv.total_income;
            return (
              <div
                key={inv.id}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1e40af] to-[#3b82f6] p-3.5 text-white shadow-md shadow-blue-500/30"
              >
                <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10" />
                <div className="absolute right-6 bottom-2">
                  <Package className="w-10 h-10 text-white/10" strokeWidth={1} />
                </div>

                <div className="relative flex items-start justify-between gap-2 mb-2.5">
                  <div className="min-w-0">
                    <p className="text-[13px] font-heading font-bold leading-tight truncate">{inv.product_name}</p>
                    <p className="text-[10px] text-white/70 mt-0.5">Melayani {inv.days_remaining} hari lagi</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[9px] font-bold px-1.5 h-4 flex items-center rounded-full bg-emerald-400/90 text-emerald-950">Aktif</span>
                    {isLocked && (
                      <span className="text-[9px] font-bold px-1.5 h-4 flex items-center rounded-full bg-white/20 border border-white/30 text-white">🔒 Locked</span>
                    )}
                  </div>
                </div>

                <div className="relative grid grid-cols-3 gap-1.5 mb-2.5">
                  <div className="rounded-xl bg-white/10 border border-white/15 backdrop-blur p-2">
                    <p className="text-[9px] text-white/70">Sewa</p>
                    <p className="text-[11px] font-heading font-bold break-all leading-tight">{formatCurrency(inv.amount)}</p>
                  </div>
                  <div className="rounded-xl bg-white/10 border border-white/15 backdrop-blur p-2">
                    <p className="text-[9px] text-white/70">{isLocked ? "Akrual" : "Harian"}</p>
                    <p className="text-[11px] font-heading font-bold break-all leading-tight">
                      {formatCurrency(isLocked ? accruedTotal : inv.daily_income)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/10 border border-white/15 backdrop-blur p-2">
                    <p className="text-[9px] text-white/70">{isLocked ? "Payout" : "Diperoleh"}</p>
                    <p className="text-[11px] font-heading font-bold break-all leading-tight">
                      {formatCurrency(isLocked ? finalPayout : inv.total_earned)}
                    </p>
                  </div>
                </div>

                <div className="relative">
                  {isLocked ? (
                    <button
                      disabled
                      className="w-full h-9 rounded-full bg-white/15 border border-white/25 text-[10px] font-semibold text-white/80 flex items-center justify-center gap-1 px-3"
                    >
                      <span className="opacity-80">🔒 Payout otomatis:</span>
                      <span className="font-bold break-all">{formatCurrency(finalPayout)}</span>
                    </button>
                  ) : canClaim ? (
                    <button
                      onClick={() => handleOpenClaimDialog(inv)}
                      className="w-full h-9 rounded-full bg-white text-primary text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-white/90 transition"
                    >
                      <Gift className="w-3.5 h-3.5" />
                      Klaim {formatCurrency(inv.daily_income)}
                    </button>
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
        </div>
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
    <button
      disabled
      className="w-full h-9 rounded-full bg-white/15 border border-white/25 text-[10px] font-semibold text-white flex items-center justify-center gap-1.5 px-3"
    >
      <span className="opacity-80">Profit berikutnya</span>
      <span className="font-mono font-bold">{formatCountdown(remaining)}</span>
    </button>
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

