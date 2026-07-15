import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { createTransaction, updateProfile, getBankAccounts, formatCurrency, BankAccount } from "@/lib/database";
import { cn } from "@/lib/utils";
import { ArrowUpFromLine, Wallet, Landmark, Check, Clock, AlertCircle, Sparkles } from "lucide-react";

interface WithdrawDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balance: number;
  onSuccess: () => void;
}

const WithdrawDialog = ({ open, onOpenChange, balance, onSuccess }: WithdrawDialogProps) => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);

  useEffect(() => {
    const loadAccounts = async () => {
      if (open && user) {
        const savedAccounts = await getBankAccounts(user.id);
        setAccounts(savedAccounts);
        if (savedAccounts.length > 0 && !selectedAccount) setSelectedAccount(savedAccounts[0]);
      }
    };
    loadAccounts();
  }, [open, user]);

  const amountNum = parseInt(amount) || 0;
  const taxFee = Math.floor(amountNum * 0.1);
  const netAmount = amountNum - taxFee;
  const quickPct = [25, 50, 75, 100];

  const handleSubmit = async () => {
    if (!amountNum || amountNum < 50000) {
      toast({ title: "Jumlah kurang", description: "Minimum withdraw Rp 50.000", variant: "destructive" });
      return;
    }
    if (amountNum > balance) {
      toast({ title: "Saldo tidak cukup", variant: "destructive" });
      return;
    }
    if (!selectedAccount) {
      toast({ title: "Pilih rekening tujuan", variant: "destructive" });
      return;
    }
    if (!user || !profile) return;
    setIsLoading(true);
    try {
      await updateProfile(user.id, { balance: profile.balance - amountNum });
      const providerRaw = selectedAccount.provider || "";
      const [providerCode, providerLabel] = providerRaw.includes("|") ? providerRaw.split("|") : [providerRaw, providerRaw];
      await createTransaction({
        user_id: user.id,
        type: "withdraw",
        amount: netAmount,
        status: "pending",
        description: `Withdraw ${formatCurrency(amountNum)} - pajak 10% ${formatCurrency(taxFee)} = diterima ${formatCurrency(netAmount)} ke ${providerLabel} - ${selectedAccount.account_number} (${selectedAccount.account_name})`,
        payment_metadata: {
          bank_code: providerCode, bank_label: providerLabel,
          account_number: selectedAccount.account_number, account_name: selectedAccount.account_name,
          account_type: selectedAccount.account_type,
          gross_amount: amountNum, tax_fee: taxFee, net_amount: netAmount,
        },
      });
      toast({ title: "Permintaan Dikirim", description: `Diterima ${formatCurrency(netAmount)} setelah pajak 10%.` });
      setAmount("");
      onOpenChange(false);
      onSuccess();
    } catch {
      toast({ title: "Gagal", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md mx-auto max-h-[90vh] p-0 overflow-hidden flex flex-col border-0 rounded-3xl">
        {/* Hero */}
        <div className="relative overflow-hidden pt-5 pb-16 px-5 bg-gradient-to-br from-[#0b1e5c] via-[#1e40af] to-[#3b82f6]">
          <div className="absolute -top-12 -right-8 w-44 h-44 rounded-full bg-cyan-300/15 blur-2xl" />
          <div className="absolute -bottom-6 -left-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
          <Sparkles className="absolute top-4 right-6 w-3.5 h-3.5 text-white/50" />

          <DialogHeader className="relative text-left space-y-1">
            <p className="text-[9px] uppercase tracking-[0.3em] text-white/70 font-semibold">Tarik Dana</p>
            <DialogTitle className="text-white font-heading text-xl font-bold flex items-center gap-2">
              <ArrowUpFromLine className="w-5 h-5" /> Penarikan Saldo
            </DialogTitle>
            <p className="text-[11px] text-white/70">Proses 1–24 jam · setiap hari · pajak 10%</p>
          </DialogHeader>

          <div className="relative mt-3 flex items-end justify-between gap-3 rounded-2xl bg-white/10 border border-white/20 backdrop-blur px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-white/70">Saldo tersedia</p>
              <p className="text-white text-lg font-heading font-bold break-all leading-tight">{formatCurrency(balance)}</p>
            </div>
            <button
              onClick={() => setAmount(balance.toString())}
              className="shrink-0 h-7 px-3 rounded-full bg-white text-primary text-[10px] font-bold"
            >
              Tarik semua
            </button>
          </div>
        </div>

        <ScrollArea className="flex-1 -mt-10 px-5">
          <div className="rounded-2xl bg-white border border-blue-100 shadow-[0_10px_30px_-15px_rgba(30,64,175,0.35)] p-4 space-y-4">
            {/* Amount */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Jumlah Penarikan</p>
              <div className="flex items-baseline gap-1 border-b-2 border-primary/30 pb-1">
                <span className="text-primary text-sm font-semibold">Rp</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="flex-1 bg-transparent border-0 outline-none text-foreground text-2xl font-heading font-bold placeholder:text-muted-foreground/40 min-w-0"
                />
              </div>
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {quickPct.map((p) => (
                  <button
                    key={p}
                    onClick={() => setAmount(Math.floor(balance * p / 100).toString())}
                    className="h-8 rounded-lg bg-blue-50 text-primary text-[10px] font-bold border border-blue-100 hover:border-primary/40"
                  >
                    {p}%
                  </button>
                ))}
              </div>
            </div>

            {/* Bank accounts */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Rekening Tujuan</p>
              {accounts.length > 0 ? (
                <div className="space-y-1.5">
                  {accounts.map((acc) => {
                    const active = selectedAccount?.id === acc.id;
                    return (
                      <button
                        key={acc.id}
                        onClick={() => setSelectedAccount(acc)}
                        className={cn(
                          "w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition",
                          active
                            ? "border-primary bg-gradient-to-r from-blue-50 to-cyan-50"
                            : "border-blue-100 bg-white hover:border-primary/40"
                        )}
                      >
                        <div className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                          active ? "bg-gradient-to-br from-[#3b82f6] to-[#1e3a8a] text-white" : "bg-blue-50 text-primary"
                        )}>
                          {acc.account_type === "bank" ? <Landmark className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-heading font-bold text-foreground truncate">{acc.provider.split("|").pop()}</p>
                          <p className="text-[10px] text-muted-foreground break-all">{acc.account_number} · {acc.account_name}</p>
                        </div>
                        {active && <Check className="w-4 h-4 text-primary shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-start gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-2.5">
                  <AlertCircle className="w-3.5 h-3.5 text-destructive mt-0.5 shrink-0" />
                  <p className="text-[10px] text-muted-foreground">
                    Belum ada rekening. Tambahkan di <span className="text-primary font-semibold">Pusat pribadi → Akun Bank</span>.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-start gap-2 rounded-xl bg-blue-50 border border-blue-100 p-2.5">
              <Clock className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
              <p className="text-[10px] text-muted-foreground leading-snug">
                Penarikan tersedia setiap hari tanpa libur. Proses 1–24 jam. Dikenakan pajak penarikan 10%.
              </p>
            </div>
          </div>
          <div className="h-4" />
        </ScrollArea>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-blue-100 bg-white/95 backdrop-blur space-y-2">
          {amountNum > 0 && (
            <div className="rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100 p-2.5 space-y-1 text-[10px]">
              <div className="flex justify-between"><span className="text-muted-foreground">Jumlah</span><span className="font-semibold break-all">{formatCurrency(amountNum)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Pajak 10%</span><span className="font-semibold text-destructive break-all">-{formatCurrency(taxFee)}</span></div>
              <div className="flex justify-between border-t border-blue-100 pt-1"><span className="font-semibold">Anda Terima</span><span className="font-heading font-bold text-primary break-all">{formatCurrency(netAmount)}</span></div>
            </div>
          )}
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !amount || !selectedAccount}
            className="w-full h-11 rounded-2xl bg-gradient-to-r from-[#3b82f6] to-[#1e3a8a] text-white text-xs font-bold shadow-md shadow-blue-500/30"
          >
            {isLoading ? "Memproses..." : "Ajukan Penarikan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WithdrawDialog;
