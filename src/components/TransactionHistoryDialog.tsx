import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ReceiptText,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getTransactions, formatCurrency, Transaction } from "@/lib/database";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultTab?: "all" | "deposit" | "withdraw" | "earning";
  title?: string;
}

const POSITIVE = new Set(["recharge", "deposit", "income", "commission", "rabat", "checkin", "spin", "coupon", "referral"]);

const labelOf = (type: string) => {
  const map: Record<string, string> = {
    recharge: "Deposit", deposit: "Deposit", withdraw: "Penarikan", withdrawal: "Penarikan",
    invest: "Pembelian Produk", income: "Profit Harian", commission: "Komisi Tim", rabat: "Rabat Referral",
    checkin: "Check-in Harian", spin: "Kotak Kejutan", coupon: "Redeem Code", referral: "Bonus Referral",
  };
  return map[type] || type;
};

const iconOf = (type: string) => {
  switch (type) {
    case "recharge": case "deposit": return <ArrowUpRight className="w-4 h-4" />;
    case "withdraw": case "withdrawal": return <ArrowDownRight className="w-4 h-4" />;
    case "income": return <TrendingUp className="w-4 h-4" />;
    case "commission": case "referral": case "rabat": return <Users className="w-4 h-4" />;
    case "invest": return <Package className="w-4 h-4" />;
    case "checkin": case "spin": case "coupon": return <Gift className="w-4 h-4" />;
    default: return <Wallet className="w-4 h-4" />;
  }
};

const statusChip = (status: string) => {
  const s = status?.toLowerCase();
  if (["approved","completed","success"].includes(s))
    return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">SUKSES</span>;
  if (["pending","processing"].includes(s))
    return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">DIPROSES</span>;
  if (["rejected","failed","refunded"].includes(s))
    return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700">{s==="refunded"?"REFUND":"GAGAL"}</span>;
  return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">{status?.toUpperCase()}</span>;
};

const TxRow = ({ tx }: { tx: Transaction }) => {
  const isPos = POSITIVE.has(tx.type);
  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-emerald-50 last:border-0">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
        isPos ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"
      }`}>
        {iconOf(tx.type)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[12px] font-heading font-bold text-foreground truncate">{labelOf(tx.type)}</p>
          <p className={`text-[12px] font-bold break-all text-right ${isPos ? "text-emerald-600" : "text-foreground"}`}>
            {isPos ? "+" : "−"}{formatCurrency(tx.amount)}
          </p>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className="text-[10px] text-muted-foreground truncate">{tx.description || tx.payment_method || "—"}</p>
          {statusChip(tx.status)}
        </div>
        <p className="text-[9px] text-muted-foreground/70 mt-0.5">
          {new Date(tx.created_at).toLocaleString("id-ID", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" })}
        </p>
      </div>
    </div>
  );
};

const TransactionHistoryDialog = ({ open, onOpenChange, defaultTab = "all", title = "Riwayat Keuangan" }: Props) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [txs, setTxs] = useState<Transaction[]>([]);

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    getTransactions(user.id).then(setTxs).finally(() => setLoading(false));
  }, [open, user]);

  const lists = {
    all: txs,
    deposit: txs.filter(t => ["recharge","deposit"].includes(t.type)),
    withdraw: txs.filter(t => ["withdraw","withdrawal"].includes(t.type)),
    earning: txs.filter(t => POSITIVE.has(t.type) && !["recharge","deposit"].includes(t.type)),
  };

  const renderList = (items: Transaction[]) => {
    if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>;
    if (items.length === 0) return (
      <div className="text-center py-16 px-6">
        <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 flex items-center justify-center mb-3">
          <ReceiptText className="w-6 h-6 text-primary/70" />
        </div>
        <p className="text-[12px] font-semibold text-foreground">Belum ada riwayat</p>
        <p className="text-[10px] text-muted-foreground mt-1">Transaksi kamu akan tampil di sini</p>
      </div>
    );
    return <div>{items.map(t => <TxRow key={t.id} tx={t} />)}</div>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 max-h-[86vh] flex flex-col overflow-hidden rounded-3xl border-0 shadow-2xl">
        {/* Editorial green header */}
        <div className="relative bg-gradient-to-br from-[#065f46] via-[#047857] to-[#10b981] text-white px-5 pt-5 pb-6">
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" />
          <div className="absolute -right-4 top-8 w-24 h-24 rounded-full bg-lime-300/15" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-[9px] uppercase tracking-[0.32em] text-white/70 font-semibold">Aktivitas</p>
              <h2 className="text-lg font-heading font-bold mt-0.5">{title}</h2>
              <p className="text-[10px] text-white/70 mt-0.5">Semua aliran dana tercatat rapi</p>
            </div>
            <button onClick={() => onOpenChange(false)} className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <Tabs defaultValue={defaultTab} className="flex-1 flex flex-col min-h-0 bg-white">
          <div className="px-4 -mt-3 relative z-10">
            <TabsList className="grid grid-cols-4 h-9 rounded-full bg-white border border-emerald-100 shadow-sm p-1">
              {(["all","deposit","withdraw","earning"] as const).map(k => (
                <TabsTrigger key={k} value={k} className="text-[10px] rounded-full data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#10b981] data-[state=active]:to-[#065f46] data-[state=active]:text-white">
                  {k==="all"?"Semua":k==="deposit"?"Deposit":k==="withdraw"?"Tarik":"Bonus"}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {(["all","deposit","withdraw","earning"] as const).map(k => (
            <TabsContent key={k} value={k} className="flex-1 min-h-0 mt-2">
              <ScrollArea className="h-[58vh]">{renderList(lists[k])}</ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionHistoryDialog;
