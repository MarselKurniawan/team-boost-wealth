import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { getBankAccounts, createBankAccount, deleteBankAccount, BankAccount } from "@/lib/database";
import { Landmark, Wallet, Plus, Trash2, Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface BankAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// SiTransfer supported bank codes (bank_target)
const BANKS = [
  { value: "BCA", label: "BCA (Bank Central Asia)" },
  { value: "BRI", label: "BRI (Bank Rakyat Indonesia)" },
  { value: "MANDIRI", label: "Bank Mandiri" },
  { value: "BNI", label: "BNI (Bank Negara Indonesia)" },
  { value: "PERMATA", label: "Bank Permata" },
  { value: "CIMB", label: "CIMB Niaga" },
  { value: "DANAMON", label: "Bank Danamon" },
];

// SiTransfer supported e-wallet codes (bank_target)
const EWALLETS = [
  { value: "DANA", label: "DANA" },
  { value: "OVO", label: "OVO" },
];

const BankAccountDialog = ({ open, onOpenChange, onSuccess }: BankAccountDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [accountType, setAccountType] = useState<"bank" | "ewallet">("bank");
  const [provider, setProvider] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [providerOpen, setProviderOpen] = useState(false);

  const loadAccounts = async () => {
    if (user) {
      const data = await getBankAccounts(user.id);
      setAccounts(data);
    }
  };

  useEffect(() => {
    if (open) {
      loadAccounts();
      resetForm();
    }
  }, [open, user]);

  const resetForm = () => {
    setIsAdding(false);
    setAccountType("bank");
    setProvider("");
    setAccountNumber("");
    setAccountName("");
  };

  const providers = accountType === "bank" ? BANKS : EWALLETS;
  const selectedProviderLabel = useMemo(() => providers.find(p => p.value === provider)?.label || "", [provider, providers]);

  const handleAddAccount = async () => {
    if (!user || !provider || !accountNumber.trim() || !accountName.trim()) {
      toast({ title: "Error", description: "Semua field harus diisi", variant: "destructive" });
      return;
    }

    const result = await createBankAccount({
      user_id: user.id,
      account_type: accountType,
      provider: `${provider}|${selectedProviderLabel}`, // simpan "kode|label" — kode dipakai utk SiTransfer, label utk tampilan
      account_number: accountNumber.trim(),
      account_name: accountName.trim(),
    });

    if (result) {
      toast({ title: "Berhasil", description: "Rekening berhasil ditambahkan" });
      await loadAccounts();
      resetForm();
      onSuccess();
    }
  };

  const handleDeleteAccount = async (id: string) => {
    const success = await deleteBankAccount(id);
    if (success) {
      toast({ title: "Dihapus", description: "Akun berhasil dihapus" });
      await loadAccounts();
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md mx-auto max-h-[88vh] p-0 gap-0 overflow-hidden rounded-3xl border-0 shadow-2xl flex flex-col">
        {/* Editorial header */}
        <div className="relative bg-gradient-to-br from-[#065f46] via-[#047857] to-[#10b981] text-white px-5 pt-5 pb-6 shrink-0">
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" />
          <div className="absolute -left-6 -bottom-6 w-28 h-28 rounded-full bg-lime-300/15" />
          <div className="relative">
            <p className="text-[9px] uppercase tracking-[0.32em] text-white/70 font-semibold">Metode Penarikan</p>
            <h2 className="text-lg font-heading font-bold mt-0.5">Akun Bank & E-Wallet</h2>
            <p className="text-[10px] text-white/70 mt-0.5">Kelola tujuan penarikan dana kamu</p>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col gap-3 bg-white px-4 pt-4 pb-4 -mt-3 rounded-t-3xl relative">
          <ScrollArea className="flex-1 max-h-[220px]">
            <div className="space-y-2 pr-3">
              {accounts.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 flex items-center justify-center mb-2">
                    <Wallet className="w-6 h-6 text-primary/60" />
                  </div>
                  <p className="text-[11px] font-semibold text-foreground">Belum ada rekening</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Tambahkan minimal 1 rekening untuk menarik dana</p>
                </div>
              ) : accounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-emerald-50/70 to-lime-50/50 border border-emerald-100">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${account.account_type === "bank" ? "bg-white text-primary border border-emerald-200" : "bg-gradient-to-br from-[#10b981] to-[#065f46] text-white"}`}>
                      {account.account_type === "bank" ? <Landmark className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-heading font-bold text-[12px] text-foreground truncate">{account.provider.includes("|") ? account.provider.split("|")[1] : account.provider}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{account.account_number} · {account.account_name}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 h-8 w-8 shrink-0" onClick={() => handleDeleteAccount(account.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>

          {isAdding ? (
            <div className="space-y-3 border-t border-emerald-100 pt-3">
              <div className="flex gap-2">
                <Button type="button" variant={accountType === "bank" ? "default" : "outline"} className={`flex-1 h-9 rounded-full text-[11px] ${accountType==="bank"?"bg-gradient-to-br from-[#10b981] to-[#065f46] text-white":"border-emerald-200"}`} onClick={() => { setAccountType("bank"); setProvider(""); }}>
                  <Landmark className="w-3.5 h-3.5 mr-1" />Bank
                </Button>
                <Button type="button" variant={accountType === "ewallet" ? "default" : "outline"} className={`flex-1 h-9 rounded-full text-[11px] ${accountType==="ewallet"?"bg-gradient-to-br from-[#10b981] to-[#065f46] text-white":"border-emerald-200"}`} onClick={() => { setAccountType("ewallet"); setProvider(""); }}>
                  <Wallet className="w-3.5 h-3.5 mr-1" />E-Wallet
                </Button>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-primary/70">{accountType === "bank" ? "Nama Bank" : "Nama E-Wallet"}</Label>
                <Popover open={providerOpen} onOpenChange={setProviderOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between rounded-xl border-emerald-200 bg-white h-10 text-[12px] font-normal">
                      {provider ? selectedProviderLabel : `Pilih ${accountType === "bank" ? "bank" : "e-wallet"}...`}
                      <ChevronsUpDown className="ml-2 h-3.5 w-3.5 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-[100]" align="start">
                    <Command>
                      <CommandInput placeholder="Cari..." />
                      <CommandList>
                        <CommandEmpty>Tidak ditemukan.</CommandEmpty>
                        <CommandGroup>
                          {providers.map((item) => (
                            <CommandItem key={item.value} value={item.label} onSelect={() => { setProvider(item.value); setProviderOpen(false); }}>
                              <Check className={cn("mr-2 h-4 w-4", provider === item.value ? "opacity-100" : "opacity-0")} />
                              {item.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-primary/70">{accountType === "bank" ? "Nomor Rekening" : "Nomor HP/ID"}</Label>
                <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="Masukkan nomor" className="rounded-xl border-emerald-200 bg-white h-10 text-[12px]" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-primary/70">Nama Pemilik</Label>
                <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Nama sesuai rekening" className="rounded-xl border-emerald-200 bg-white h-10 text-[12px]" />
              </div>
              <div className="flex gap-2 pt-1">
                <Button className="flex-1 h-10 rounded-full bg-gradient-to-br from-[#10b981] to-[#065f46] text-white text-[11px] font-bold" onClick={handleAddAccount}>
                  <Check className="w-3.5 h-3.5 mr-1" />Simpan Rekening
                </Button>
                <Button variant="outline" className="h-10 rounded-full border-emerald-200 text-[11px]" onClick={resetForm}>Batal</Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" className="w-full h-11 rounded-2xl border-dashed border-emerald-300 text-primary text-[12px] font-semibold bg-emerald-50/40" onClick={() => setIsAdding(true)}>
              <Plus className="w-4 h-4 mr-2" />Tambah Rekening Baru
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BankAccountDialog;
