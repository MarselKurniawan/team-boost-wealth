import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { createTransaction, updateProfile, getBankAccounts, formatCurrency, BankAccount } from "@/lib/database";
import { ArrowDownRight, Building2, Clock, AlertCircle, Wallet, Check, Landmark } from "lucide-react";

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
        if (savedAccounts.length > 0 && !selectedAccount) {
          setSelectedAccount(savedAccounts[0]);
        }
      }
    };
    loadAccounts();
  }, [open, user]);

  const amountNum = parseInt(amount) || 0;
  const taxFee = Math.floor(amountNum * 0.1);
  const netAmount = amountNum - taxFee;

  const handleSubmit = async () => {
    if (!amountNum || amountNum < 50000) {
      toast({
        title: "Error",
        description: "Minimum withdraw adalah Rp 50.000",
        variant: "destructive",
      });
      return;
    }

    if (amountNum > balance) {
      toast({
        title: "Error",
        description: "Saldo tidak mencukupi",
        variant: "destructive",
      });
      return;
    }

    if (!selectedAccount) {
      toast({
        title: "Error",
        description: "Silakan pilih rekening tujuan",
        variant: "destructive",
      });
      return;
    }

    if (!user || !profile) {
      toast({
        title: "Error",
        description: "Silakan login terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Deduct full gross amount from balance
      await updateProfile(user.id, {
        balance: profile.balance - amountNum,
      });

      // Add transaction with pending status - requires admin approval
      // Extract bank code & display label from "kode|label" format (fallback ke nilai lama)
      const providerRaw = selectedAccount.provider || "";
      const [providerCode, providerLabel] = providerRaw.includes("|")
        ? providerRaw.split("|")
        : [providerRaw, providerRaw];

      // Net amount (after 10% tax) is what gets paid out
      await createTransaction({
        user_id: user.id,
        type: "withdraw",
        amount: netAmount,
        status: "pending",
        description: `Withdraw ${formatCurrency(amountNum)} - pajak 10% ${formatCurrency(taxFee)} = diterima ${formatCurrency(netAmount)} ke ${providerLabel} - ${selectedAccount.account_number} (${selectedAccount.account_name})`,
        payment_metadata: {
          bank_code: providerCode,
          bank_label: providerLabel,
          account_number: selectedAccount.account_number,
          account_name: selectedAccount.account_name,
          account_type: selectedAccount.account_type,
          gross_amount: amountNum,
          tax_fee: taxFee,
          net_amount: netAmount,
        },
      });

      toast({
        title: "Permintaan Withdraw Dikirim",
        description: `Diterima ${formatCurrency(netAmount)} (setelah pajak 10%). Menunggu persetujuan admin.`,
      });

      setAmount("");
      setSelectedAccount(null);
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal memproses withdraw. Silakan coba lagi.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md mx-auto max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="flex items-center gap-1.5 text-xs">
            <ArrowDownRight className="w-3.5 h-3.5 text-accent" />
            Withdraw Saldo
          </DialogTitle>
          <DialogDescription className="text-[10px]">
            Tarik saldo ke rekening bank atau e-wallet Anda
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-4">
          <div className="flex flex-col gap-3 py-2 pb-2">
            {/* Balance Info */}
            <div className="bg-muted rounded-lg p-3 flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">Saldo Tersedia</p>
                <p className="text-sm font-bold text-foreground break-all">{formatCurrency(balance)}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[10px] px-2 shrink-0"
                onClick={() => setAmount(balance.toString())}
              >
                Semua
              </Button>
            </div>

            {/* Amount Input */}
            <div className="space-y-1.5">
              <Label className="text-[10px]">Jumlah Withdraw</Label>
              <Input
                type="number"
                placeholder="Masukkan jumlah"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-9 text-sm font-semibold"
              />
            </div>

            {/* Account Selection */}
            <div className="space-y-2 border-t border-border pt-2">
              <div className="flex items-center gap-1.5 text-[11px] font-medium">
                <Building2 className="w-3.5 h-3.5" />
                Pilih Rekening Tujuan
              </div>

              {accounts.length > 0 ? (
                <div className="space-y-1.5">
                  {accounts.map((account) => (
                    <button
                      key={account.id}
                      onClick={() => setSelectedAccount(account)}
                      className={`w-full flex items-center justify-between p-2 rounded-lg border transition-all ${
                        selectedAccount?.id === account.id
                          ? "border-primary bg-primary/10"
                          : "border-border/50 bg-muted/50 hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                          account.account_type === "bank"
                            ? "bg-primary/20 text-primary"
                            : "bg-accent/20 text-accent"
                        }`}>
                          {account.account_type === "bank" ? (
                            <Landmark className="w-3.5 h-3.5" />
                          ) : (
                            <Wallet className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div className="text-left min-w-0">
                          <p className="font-medium text-[11px] text-foreground break-all">{account.provider}</p>
                          <p className="text-[10px] text-muted-foreground break-all">{account.account_number}</p>
                        </div>
                      </div>
                      {selectedAccount?.id === account.id && (
                        <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-start gap-1.5 p-2 bg-destructive/10 rounded-lg">
                  <AlertCircle className="w-3.5 h-3.5 text-destructive mt-0.5 shrink-0" />
                  <p className="text-[10px] text-muted-foreground">
                    Belum ada rekening tersimpan. Tambahkan rekening di <span className="text-primary font-medium">Profil → Account Bank</span>.
                  </p>
                </div>
              )}
            </div>

            {/* Selected Account Summary */}
            {selectedAccount && (
              <div className="bg-success/10 rounded-lg p-2 border border-success/30">
                <p className="text-[10px] text-muted-foreground mb-0.5">Withdraw ke:</p>
                <p className="font-medium text-[11px] text-foreground break-all">
                  {selectedAccount.provider} - {selectedAccount.account_number}
                </p>
                <p className="text-[10px] text-muted-foreground break-all">{selectedAccount.account_name}</p>
              </div>
            )}

            {/* Info */}
            <div className="flex items-start gap-1.5 p-2 bg-accent/10 rounded-lg">
              <Clock className="w-3.5 h-3.5 text-accent mt-0.5 shrink-0" />
              <p className="text-[10px] text-muted-foreground">
                Proses 12-48 jam, Senin-Sabtu. Pajak penarikan 10%.
              </p>
            </div>
          </div>
        </ScrollArea>

        {/* Fixed Button at Bottom */}
        <div className="px-4 pb-4 pt-3 border-t border-border bg-background space-y-2">
          {amountNum > 0 && (
            <div className="rounded-lg bg-muted/60 p-2 space-y-0.5 text-[10px]">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Jumlah Withdraw</span>
                <span className="font-medium break-all">{formatCurrency(amountNum)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Pajak (10%)</span>
                <span className="font-medium text-destructive break-all">- {formatCurrency(taxFee)}</span>
              </div>
              <div className="flex justify-between gap-2 border-t border-border pt-0.5">
                <span className="font-semibold">Anda Terima</span>
                <span className="font-bold text-success break-all">{formatCurrency(netAmount)}</span>
              </div>
            </div>
          )}
          <Button
            className="w-full h-9 text-xs"
            onClick={handleSubmit}
            disabled={isLoading || !amount || !selectedAccount}
          >
            {isLoading ? "Memproses..." : "Ajukan Withdraw"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WithdrawDialog;
