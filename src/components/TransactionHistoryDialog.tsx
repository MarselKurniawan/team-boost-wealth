import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Users,
  Package,
  Wallet,
  Gift,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getTransactions, formatCurrency, Transaction } from "@/lib/database";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

const POSITIVE = new Set(["recharge", "deposit", "income", "commission", "rabat", "checkin", "spin", "coupon", "referral"]);

const labelOf = (type: string) => {
  const map: Record<string, string> = {
    recharge: "Deposit",
    deposit: "Deposit",
    withdraw: "Penarikan",
    withdrawal: "Penarikan",
    invest: "Sewa Robot",
    income: "Profit Harian",
    commission: "Komisi Tim",
    rabat: "Rabat Referral",
    checkin: "Check-in Harian",
    spin: "Roda Putar",
    coupon: "Kupon",
    referral: "Bonus Referral",
  };
  return map[type] || type;
};

const iconOf = (type: string) => {
  switch (type) {
    case "recharge":
    case "deposit":
      return <ArrowUpRight className="w-3.5 h-3.5 text-success" />;
    case "withdraw":
    case "withdrawal":
      return <ArrowDownRight className="w-3.5 h-3.5 text-accent" />;
    case "income":
      return <TrendingUp className="w-3.5 h-3.5 text-success" />;
    case "commission":
    case "referral":
      return <Users className="w-3.5 h-3.5 text-primary" />;
    case "rabat":
      return <Users className="w-3.5 h-3.5 text-vip-gold" />;
    case "invest":
      return <Package className="w-3.5 h-3.5 text-primary" />;
    case "checkin":
    case "spin":
    case "coupon":
      return <Gift className="w-3.5 h-3.5 text-accent" />;
    default:
      return <Wallet className="w-3.5 h-3.5 text-muted-foreground" />;
  }
};

const statusBadge = (status: string) => {
  const s = status?.toLowerCase();
  if (s === "approved" || s === "completed" || s === "success")
    return <Badge className="text-[9px] h-4 px-1.5 bg-success/15 text-success border-success/30 hover:bg-success/15">Berhasil</Badge>;
  if (s === "pending" || s === "processing")
    return <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-primary/40 text-primary">Diproses</Badge>;
  if (s === "rejected" || s === "failed" || s === "refunded")
    return <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-destructive/40 text-destructive">{s === "refunded" ? "Refund" : "Gagal"}</Badge>;
  return <Badge variant="outline" className="text-[9px] h-4 px-1.5">{status}</Badge>;
};

const TxItem = ({ tx }: { tx: Transaction }) => {
  const isPos = POSITIVE.has(tx.type);
  const meta = (tx.payment_metadata || {}) as Record<string, unknown>;
  const source =
    (meta.bank_label as string) ||
    (meta.payment_method as string) ||
    tx.payment_method ||
    "";

  return (
    <div className="flex items-start gap-2.5 px-3 py-2.5 border-b border-border/50 last:border-0">
      <div className="w-7 h-7 rounded-lg bg-muted/40 flex items-center justify-center shrink-0">
        {iconOf(tx.type)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold text-foreground truncate">{labelOf(tx.type)}</p>
          <p
            className={`text-[11px] font-bold break-all text-right ${
              isPos ? "text-success" : "text-foreground"
            }`}
          >
            {isPos ? "+" : "-"}
            {formatCurrency(tx.amount)}
          </p>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className="text-[9.5px] text-muted-foreground truncate">
            {tx.description || source || "—"}
          </p>
          {statusBadge(tx.status)}
        </div>
        <p className="text-[9px] text-muted-foreground/80 mt-0.5">
          {new Date(tx.created_at).toLocaleString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
          {tx.payment_reference ? ` • ${tx.payment_reference}` : ""}
        </p>
      </div>
    </div>
  );
};

const TransactionHistoryDialog = ({ open, onOpenChange }: Props) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [txs, setTxs] = useState<Transaction[]>([]);

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    getTransactions(user.id)
      .then(setTxs)
      .finally(() => setLoading(false));
  }, [open, user]);

  const filterBy = (fn: (t: Transaction) => boolean) => txs.filter(fn);

  const lists = {
    all: txs,
    deposit: filterBy((t) => ["recharge", "deposit"].includes(t.type)),
    withdraw: filterBy((t) => ["withdraw", "withdrawal"].includes(t.type)),
    earning: filterBy((t) => POSITIVE.has(t.type) && !["recharge", "deposit"].includes(t.type)),
  };

  const renderList = (items: Transaction[]) => {
    if (loading)
      return (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      );
    if (items.length === 0)
      return (
        <div className="text-center py-10 text-[11px] text-muted-foreground">
          Belum ada riwayat
        </div>
      );
    return <div>{items.map((t) => <TxItem key={t.id} tx={t} />)}</div>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 max-h-[85vh] flex flex-col">
        <DialogHeader className="px-4 pt-4 pb-2 shrink-0">
          <DialogTitle className="text-sm font-bold">Riwayat Keuangan</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="all" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-4 grid grid-cols-4 h-8">
            <TabsTrigger value="all" className="text-[10px]">Semua</TabsTrigger>
            <TabsTrigger value="deposit" className="text-[10px]">Deposit</TabsTrigger>
            <TabsTrigger value="withdraw" className="text-[10px]">Tarik</TabsTrigger>
            <TabsTrigger value="earning" className="text-[10px]">Pendapatan</TabsTrigger>
          </TabsList>
          {(["all", "deposit", "withdraw", "earning"] as const).map((k) => (
            <TabsContent key={k} value={k} className="flex-1 min-h-0 mt-2">
              <ScrollArea className="h-[60vh]">{renderList(lists[k])}</ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionHistoryDialog;
