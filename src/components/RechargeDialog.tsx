import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/database";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Wallet, ChevronRight, ShieldCheck, Check, Copy, RefreshCw, ArrowLeft, ExternalLink } from "lucide-react";

interface RechargeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const PAYMENT_METHODS: { code: string; name: string; short: string; badge?: string }[] = [
  { code: "QRIS", name: "QRIS", short: "Semua e-wallet & mobile banking", badge: "Populer" },
  { code: "DANA", name: "DANA", short: "Bayar langsung lewat aplikasi DANA" },
];

interface PaymentResult {
  transaction_id: string;
  channel: string;
  amount: number;
  expired_at?: string | null;
  qris_image?: string | null;
  qris_data?: string | null;
  payment_url?: string | null;
  instruction?: string | null;
}

const RechargeDialog = ({ open, onOpenChange, onSuccess }: RechargeDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<string | null>("QRIS");
  const [isLoading, setIsLoading] = useState(false);
  const [payment, setPayment] = useState<PaymentResult | null>(null);
  const [checking, setChecking] = useState(false);

  const presetAmounts = [100000, 250000, 500000, 1000000, 2500000, 5000000];
  const selected = PAYMENT_METHODS.find((m) => m.code === method);

  useEffect(() => {
    if (!open) {
      setPayment(null);
      setAmount("");
      setMethod("QRIS");
    }
  }, [open]);

  const handleSubmit = async () => {
    const amountNum = parseInt(amount);
    if (!amountNum || amountNum < 50000) {
      toast({ title: "Jumlah kurang", description: "Minimum deposit Rp 50.000", variant: "destructive" });
      return;
    }
    if (!method) {
      toast({ title: "Metode belum dipilih", variant: "destructive" });
      return;
    }
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("sitransfer-create-payment", {
        body: { amount: amountNum, method },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);

      setPayment(data as PaymentResult);
      onSuccess();
    } catch (e) {
      toast({ title: "Gagal", description: (e as Error).message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!payment) return;
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("sitransfer-check-status", {
        body: { transaction_id: payment.transaction_id },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);

      const status = String((data as any).status || "").toLowerCase();
      if (status === "success") {
        toast({ title: "Pembayaran berhasil", description: "Saldo kamu sudah bertambah." });
        onSuccess();
        onOpenChange(false);
      } else if (["failed", "expired", "cancel", "canceled", "cancelled"].includes(status)) {
        toast({ title: "Pembayaran gagal", description: "Transaksi kedaluwarsa atau dibatalkan.", variant: "destructive" });
        onSuccess();
        onOpenChange(false);
      } else {
        toast({ title: "Masih menunggu pembayaran", description: "Selesaikan pembayaran lalu cek lagi." });
      }
    } catch (e) {
      toast({ title: "Gagal cek status", description: (e as Error).message, variant: "destructive" });
    } finally {
      setChecking(false);
    }
  };

  const copyQris = async () => {
    if (!payment?.qris_data) return;
    await navigator.clipboard.writeText(payment.qris_data);
    toast({ title: "Kode QRIS disalin" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md mx-auto h-[90dvh] max-h-[90dvh] p-0 overflow-hidden flex flex-col border-0 rounded-3xl">
        {/* Hero header */}
        <div className="relative overflow-hidden pt-5 pb-14 px-5 bg-gradient-to-br from-[#0b1e5c] via-[#047857] to-[#10b981]">
          <div className="absolute -top-10 -right-8 w-40 h-40 rounded-full bg-lime-300/15 blur-2xl" />
          <div className="absolute bottom-0 -left-10 w-32 h-32 rounded-full bg-white/10 blur-2xl" />

          <DialogHeader className="relative text-left space-y-1">
            <p className="text-[9px] uppercase tracking-[0.3em] text-white/70 font-semibold">Isi Saldo</p>
            <DialogTitle className="text-white font-heading text-xl font-bold flex items-center gap-2">
              <Wallet className="w-5 h-5" /> {payment ? "Selesaikan Pembayaran" : "Deposit Cepat"}
            </DialogTitle>
            <p className="text-[11px] text-white/70">Pembayaran instan · dana masuk otomatis</p>
          </DialogHeader>

          <div className="relative mt-3 rounded-2xl bg-white/10 border border-white/20 backdrop-blur px-3 py-2.5">
            <p className="text-[10px] text-white/70">Jumlah Deposit</p>
            <div className="flex items-baseline gap-1">
              <span className="text-white/80 text-sm font-semibold">Rp</span>
              {payment ? (
                <span className="text-white text-2xl font-heading font-bold break-all">
                  {payment.amount.toLocaleString("id-ID")}
                </span>
              ) : (
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="flex-1 bg-transparent border-0 outline-none text-white text-2xl font-heading font-bold placeholder:text-white/40 min-w-0"
                />
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 -mt-8 px-5 overflow-y-auto overscroll-contain">
          {payment ? (
            <div className="rounded-2xl bg-white border border-emerald-100 shadow-[0_10px_30px_-15px_rgba(30,64,175,0.35)] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">ID Transaksi</p>
                  <p className="text-[12px] font-heading font-bold text-foreground break-all">{payment.transaction_id}</p>
                </div>
                <span className="text-[9px] font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                  {payment.channel}
                </span>
              </div>

              {payment.qris_image && (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3 flex flex-col items-center gap-2">
                  <img
                    src={payment.qris_image}
                    alt={`Kode QRIS pembayaran deposit ${payment.transaction_id}`}
                    className="w-52 h-52 object-contain bg-white rounded-xl p-2"
                    loading="lazy"
                  />
                  {payment.qris_data && (
                    <Button
                      variant="outline"
                      onClick={copyQris}
                      className="h-8 rounded-full text-[10px] font-bold border-emerald-200 text-primary"
                    >
                      <Copy className="w-3 h-3 mr-1" /> Salin kode QRIS
                    </Button>
                  )}
                </div>
              )}

              {payment.payment_url && (
                <Button
                  onClick={() => window.open(payment.payment_url!, "_blank", "noopener,noreferrer")}
                  className="w-full h-10 rounded-2xl bg-gradient-to-r from-[#10b981] to-[#065f46] text-white text-xs font-bold"
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Buka aplikasi {payment.channel}
                </Button>
              )}

              {payment.expired_at && (
                <p className="text-[10px] text-muted-foreground text-center">
                  Berlaku sampai <span className="font-semibold text-foreground">{payment.expired_at}</span>
                </p>
              )}

              <div className="flex items-start gap-2 rounded-xl bg-emerald-50 border border-emerald-100 p-2.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                <p className="text-[10px] text-emerald-700 leading-snug">
                  {payment.instruction || "Selesaikan pembayaran sebelum waktu kedaluwarsa. Saldo masuk otomatis setelah pembayaran terverifikasi."}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-white border border-emerald-100 shadow-[0_10px_30px_-15px_rgba(30,64,175,0.35)] p-4 space-y-4">
              {/* Preset chips */}
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Pilih cepat</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {presetAmounts.map((p) => {
                    const active = amount === p.toString();
                    return (
                      <button
                        key={p}
                        onClick={() => setAmount(p.toString())}
                        className={cn(
                          "h-9 rounded-xl text-[10px] font-bold transition border",
                          active
                            ? "bg-gradient-to-br from-[#10b981] to-[#065f46] text-white border-transparent shadow-md shadow-emerald-500/30"
                            : "bg-emerald-50/50 text-primary border-emerald-100 hover:border-primary/40"
                        )}
                      >
                        {formatCurrency(p)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Payment method list */}
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Metode pembayaran</p>
                <div className="space-y-1.5 pb-1">
                  {PAYMENT_METHODS.map((m) => {
                    const active = method === m.code;
                    return (
                      <button
                        key={m.code}
                        onClick={() => setMethod(m.code)}
                        className={cn(
                          "w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition",
                          active
                            ? "border-primary bg-gradient-to-r from-emerald-50 to-lime-50 shadow-sm"
                            : "border-emerald-100 bg-white hover:border-primary/40"
                        )}
                      >
                        <div className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-heading font-bold shrink-0",
                          active ? "bg-gradient-to-br from-[#10b981] to-[#065f46] text-white" : "bg-emerald-50 text-primary"
                        )}>
                          {m.code.slice(0, 3)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-[12px] font-heading font-bold text-foreground truncate">{m.name}</p>
                            {m.badge && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">{m.badge}</span>}
                          </div>
                          <p className="text-[10px] text-muted-foreground">{m.short}</p>
                        </div>
                        {active ? <Check className="w-4 h-4 text-primary shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-xl bg-emerald-50 border border-emerald-100 p-2.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                <p className="text-[10px] text-emerald-700 leading-snug">
                  Transaksi aman & terenkripsi. Dana masuk otomatis setelah pembayaran terkonfirmasi.
                </p>
              </div>
            </div>
          )}
          <div className="h-4" />
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-emerald-100 bg-white/95 backdrop-blur">
          {payment ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setPayment(null)}
                className="h-11 rounded-2xl border-emerald-200 text-primary text-xs font-bold px-4"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </Button>
              <Button
                onClick={handleCheckStatus}
                disabled={checking}
                className="flex-1 h-11 rounded-2xl bg-gradient-to-r from-[#10b981] to-[#065f46] text-white text-xs font-bold shadow-md shadow-emerald-500/30 hover:opacity-95"
              >
                <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", checking && "animate-spin")} />
                {checking ? "Mengecek..." : "Saya sudah bayar · Cek status"}
              </Button>
            </div>
          ) : (
            <>
              {amount && selected && (
                <div className="flex items-center justify-between text-[11px] mb-2">
                  <span className="text-muted-foreground">Total via {selected.name}</span>
                  <span className="font-heading font-bold text-primary break-all">{formatCurrency(parseInt(amount) || 0)}</span>
                </div>
              )}
              <Button
                onClick={handleSubmit}
                disabled={isLoading || !amount || !method}
                className="w-full h-11 rounded-2xl bg-gradient-to-r from-[#10b981] to-[#065f46] text-white text-xs font-bold shadow-md shadow-emerald-500/30 hover:opacity-95"
              >
                {isLoading ? "Memproses..." : "Lanjut ke Pembayaran"}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RechargeDialog;
