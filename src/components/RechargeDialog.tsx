import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/database";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Wallet, ChevronRight, ShieldCheck, Check, Copy, RefreshCw, ArrowLeft, ExternalLink, Loader2 } from "lucide-react";

interface RechargeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Channel {
  group: string;
  code: string;
  name: string;
  image?: string;
  fee_amount: number;
  fee_percent: number;
  min_trx: number;
  max_trx: number;
  type_fee: string;
  tutorial_pembayaran?: string;
}

interface PaymentResult {
  transaction_id: string;
  channel: string;
  amount: number;
  total_bayar?: number;
  total_fee?: number;
  expired_at?: string | null;
  qris_image?: string | null;
  qris_data?: string | null;
  payment_url?: string | null;
  va_number?: string | null;
  instruction?: string | null;
}

const RechargeDialog = ({ open, onOpenChange, onSuccess }: RechargeDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<string | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [payment, setPayment] = useState<PaymentResult | null>(null);
  const [checking, setChecking] = useState(false);

  const presetAmounts = [100000, 250000, 500000, 1000000, 2500000, 5000000];
  const selected = channels.find((m) => m.code === method);

  const loadChannels = useCallback(async () => {
    setLoadingChannels(true);
    try {
      const { data, error } = await supabase.functions.invoke("wijayapay-channels", { body: {} });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      const list: Channel[] = (data as any)?.channels || [];
      setChannels(list);
      setMethod((prev) => prev || list.find((c) => c.code === "QRIS")?.code || list[0]?.code || null);
    } catch (e) {
      toast({ title: "Gagal memuat metode pembayaran", description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoadingChannels(false);
    }
  }, [toast]);

  useEffect(() => {
    if (open) {
      loadChannels();
    } else {
      setPayment(null);
      setAmount("");
      setMethod(null);
    }
  }, [open, loadChannels]);

  const handleSubmit = async () => {
    const amountNum = parseInt(amount);
    if (!amountNum || amountNum < 10000) {
      toast({ title: "Jumlah kurang", description: "Minimum deposit Rp 10.000", variant: "destructive" });
      return;
    }
    if (!method) {
      toast({ title: "Metode belum dipilih", variant: "destructive" });
      return;
    }
    if (selected && (amountNum < selected.min_trx || amountNum > selected.max_trx)) {
      toast({
        title: "Nominal tidak sesuai",
        description: `${selected.name}: ${formatCurrency(selected.min_trx)} - ${formatCurrency(selected.max_trx)}`,
        variant: "destructive",
      });
      return;
    }
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("wijayapay-create-payment", {
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
      const { data, error } = await supabase.functions.invoke("wijayapay-check-status", {
        body: { transaction_id: payment.transaction_id },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);

      const status = String((data as any).status || "").toLowerCase();
      if (status === "success" || status === "paid") {
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

  const copyText = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast({ title: `${label} disalin` });
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
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">ID Transaksi</p>
                  <p className="text-[12px] font-heading font-bold text-foreground break-all">{payment.transaction_id}</p>
                </div>
                <span className="text-[9px] font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 shrink-0">
                  {payment.channel}
                </span>
              </div>

              {typeof payment.total_bayar === "number" && payment.total_bayar !== payment.amount && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-2.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Total yang harus dibayar</span>
                    <span className="font-heading font-bold text-primary break-all">{formatCurrency(payment.total_bayar)}</span>
                  </div>
                  {!!payment.total_fee && (
                    <p className="text-[10px] text-muted-foreground mt-1">Termasuk biaya {formatCurrency(payment.total_fee)}</p>
                  )}
                </div>
              )}

              {payment.va_number && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Nomor Pembayaran</p>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <p className="text-sm font-heading font-bold text-foreground break-all">{payment.va_number}</p>
                    <Button
                      variant="outline"
                      onClick={() => copyText(payment.va_number!, "Nomor pembayaran")}
                      className="h-8 rounded-full text-[10px] font-bold border-emerald-200 text-primary shrink-0"
                    >
                      <Copy className="w-3 h-3 mr-1" /> Salin
                    </Button>
                  </div>
                </div>
              )}

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
                      onClick={() => copyText(payment.qris_data!, "Kode QRIS")}
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
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Buka halaman pembayaran
                </Button>
              )}

              {payment.expired_at && (
                <p className="text-[10px] text-muted-foreground text-center">
                  Berlaku sampai <span className="font-semibold text-foreground">{payment.expired_at}</span>
                </p>
              )}

              <div className="flex items-start gap-2 rounded-xl bg-emerald-50 border border-emerald-100 p-2.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                <p className="text-[10px] text-emerald-700 leading-snug whitespace-pre-line">
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
                {loadingChannels ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-[11px] text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> Memuat metode...
                  </div>
                ) : channels.length === 0 ? (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-[10px] text-muted-foreground">
                    Belum ada metode pembayaran aktif. Coba lagi nanti atau hubungi layanan pelanggan.
                  </div>
                ) : (
                  <div className="space-y-1.5 pb-1">
                    {channels.map((m) => {
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
                            "w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden text-[9px] font-heading font-bold shrink-0 bg-emerald-50 text-primary border border-emerald-100"
                          )}>
                            {m.image && !failedLogos[m.code] ? (
                              <img
                                src={m.image}
                                alt={`Logo ${m.name}`}
                                className="w-full h-full object-contain p-1"
                                loading="lazy"
                                onError={() => setFailedLogos((prev) => ({ ...prev, [m.code]: true }))}
                              />
                            ) : (
                              <span className="px-0.5 text-center leading-none break-all">{m.code.replace(/VA$/, "").slice(0, 4)}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-[12px] font-heading font-bold text-foreground truncate">{m.name}</p>
                              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">{m.group}</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground break-all">
                              Min {formatCurrency(m.min_trx)} · Maks {formatCurrency(m.max_trx)}
                            </p>
                          </div>
                          {active ? <Check className="w-4 h-4 text-primary shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
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
