import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/database";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ExternalLink, ChevronsUpDown, Check } from "lucide-react";

interface RechargeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// Per Jayapay Global API docs (Pay-In Method Codes — Indonesia)
const PAYMENT_METHODS: { code: string; name: string; group: string }[] = [
  { code: "QRIS", name: "QRIS (Recommended)", group: "QRIS" },
  { code: "BCA", name: "BCA Virtual Account", group: "Virtual Account" },
  { code: "BRI", name: "BRI Virtual Account", group: "Virtual Account" },
  { code: "MANDIRI", name: "Mandiri Virtual Account", group: "Virtual Account" },
  { code: "BNI", name: "BNI Virtual Account", group: "Virtual Account" },
];

const RechargeDialog = ({ open, onOpenChange, onSuccess }: RechargeDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const presetAmounts = [100000, 250000, 500000, 1000000, 2500000, 5000000];
  const selected = PAYMENT_METHODS.find((m) => m.code === method);

  const grouped = PAYMENT_METHODS.reduce<Record<string, typeof PAYMENT_METHODS>>((acc, m) => {
    (acc[m.group] = acc[m.group] || []).push(m);
    return acc;
  }, {});

  const handleSubmit = async () => {
    const amountNum = parseInt(amount);
    if (!amountNum || amountNum < 1000) {
      toast({ title: "Error", description: "Minimum recharge Rp 50.000", variant: "destructive" });
      return;
    }
    if (!method) {
      toast({ title: "Error", description: "Pilih metode pembayaran", variant: "destructive" });
      return;
    }
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("jayapay-create-payment", {
        body: { amount: amountNum, method },
      });
      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || "Gagal membuat pembayaran");
      }

      const url = data.cashierUrl || data.payData;
      if (url) {
        toast({ title: "Mengarahkan ke pembayaran...", description: "Selesaikan pembayaran di halaman Jayapay." });
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        toast({ title: "Pembayaran dibuat", description: "Cek riwayat transaksi." });
      }

      setAmount("");
      setMethod(null);
      onOpenChange(false);
      onSuccess();
    } catch (e) {
      toast({
        title: "Error",
        description: (e as Error).message || "Gagal memproses recharge",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md mx-auto max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            <ArrowUpRight className="w-4 h-4 text-success" />
            Recharge Saldo
          </DialogTitle>
          <DialogDescription className="text-xs">
            Top up via Jayapay — QRIS, E-Wallet, VA Bank, atau Retail
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label className="text-xs">Jumlah Recharge</Label>
              <Input
                type="number"
                placeholder="Masukkan jumlah"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-base font-semibold"
              />
              <div className="grid grid-cols-3 gap-2">
                {presetAmounts.map((p) => (
                  <Button
                    key={p}
                    variant={amount === p.toString() ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAmount(p.toString())}
                    className="text-[10px]"
                  >
                    {formatCurrency(p)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Metode Pembayaran</Label>
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between text-xs h-10">
                    {selected ? (
                      <span className="flex flex-col items-start">
                        <span className="font-semibold">{selected.name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {selected.group} · {selected.code}
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Cari & pilih metode...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-[60]" align="start">
                  <Command>
                    <CommandInput placeholder="Cari (QRIS, OVO, BCA...)" className="h-9 text-xs" />
                    <CommandList className="max-h-64">
                      <CommandEmpty className="text-xs py-4 text-center">Tidak ditemukan</CommandEmpty>
                      {Object.entries(grouped).map(([group, items]) => (
                        <CommandGroup key={group} heading={group}>
                          {items.map((m) => (
                            <CommandItem
                              key={m.code}
                              value={`${m.name} ${m.code} ${m.group}`}
                              onSelect={() => {
                                setMethod(m.code);
                                setPickerOpen(false);
                              }}
                              className="text-xs"
                            >
                              <Check
                                className={cn("mr-2 h-3.5 w-3.5", method === m.code ? "opacity-100" : "opacity-0")}
                              />
                              <span className="flex-1">{m.name}</span>
                              <span className="text-[10px] text-muted-foreground">{m.code}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      ))}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {amount && method && (
              <div className="bg-muted rounded-lg p-3 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Jumlah</span>
                  <span className="font-semibold break-all">{formatCurrency(parseInt(amount) || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Metode</span>
                  <span className="font-semibold">{selected?.name}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-border">
                  <span className="font-medium">Total Bayar</span>
                  <span className="font-bold text-primary break-all">{formatCurrency(parseInt(amount) || 0)}</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="px-6 pb-6 pt-3 border-t border-border bg-background">
          <Button className="w-full" size="lg" onClick={handleSubmit} disabled={isLoading || !amount || !method}>
            {isLoading ? (
              "Memproses..."
            ) : (
              <span className="flex items-center gap-2">
                Lanjut ke Pembayaran <ExternalLink className="w-4 h-4" />
              </span>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RechargeDialog;
