import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Bell, CheckCheck, Trash2, Package, Coins,
  ArrowDownToLine, ArrowUpFromLine, Users, CheckCircle2, XCircle,
} from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const iconFor = (type: string) => {
  if (type.startsWith("investment_purchase")) return Package;
  if (type.startsWith("profit_claimed")) return Coins;
  if (type.startsWith("deposit") || type.startsWith("recharge"))
    return type.includes("approved") || type.includes("completed") ? CheckCircle2
      : type.includes("rejected") || type.includes("failed") ? XCircle : ArrowDownToLine;
  if (type.startsWith("withdraw"))
    return type.includes("approved") || type.includes("completed") ? CheckCircle2
      : type.includes("rejected") || type.includes("failed") ? XCircle : ArrowUpFromLine;
  if (type.startsWith("referral")) return Users;
  return Bell;
};

const colorFor = (type: string) => {
  if (type.includes("rejected") || type.includes("failed")) return "text-destructive bg-destructive/10";
  if (type.includes("approved") || type.includes("completed") || type === "profit_claimed") return "text-success bg-success/10";
  if (type.startsWith("referral")) return "text-vip-gold bg-vip-gold/10";
  if (type.startsWith("withdraw")) return "text-accent bg-accent/10";
  return "text-primary bg-primary/10";
};

const timeAgo = (iso: string) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "Baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} hari lalu`;
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
};

const Notifications = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200);
    setItems((data || []) as Notification[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (!user) return;
    const channel = supabase
      .channel("notifications-feed")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const markAllRead = async () => {
    if (!user) return;
    const unread = items.filter((i) => !i.is_read).map((i) => i.id);
    if (!unread.length) return;
    await supabase.from("notifications").update({ is_read: true }).in("id", unread);
    setItems((prev) => prev.map((i) => ({ ...i, is_read: true })));
    toast({ title: "Semua pesan ditandai dibaca" });
  };

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, is_read: true } : i)));
  };

  const remove = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const clearAll = async () => {
    if (!user || !items.length) return;
    await supabase.from("notifications").delete().eq("user_id", user.id);
    setItems([]);
    toast({ title: "Semua pesan dihapus" });
  };

  const unreadCount = items.filter((i) => !i.is_read).length;

  return (
    <div className="space-y-3 p-4 pt-5 pb-24">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            Pemberitahuan Pesan
            {unreadCount > 0 && (
              <Badge className="h-4 px-1.5 text-[9px] bg-primary text-primary-foreground">{unreadCount}</Badge>
            )}
          </h1>
          <p className="text-[10px] text-muted-foreground">Notifikasi otomatis dari aktivitas akun Anda</p>
        </div>
      </div>

      {items.length > 0 && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-7 text-[10px] flex-1" onClick={markAllRead} disabled={unreadCount === 0}>
            <CheckCheck className="w-3 h-3 mr-1" /> Tandai semua dibaca
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-[10px] flex-1 text-destructive border-destructive/30" onClick={clearAll}>
            <Trash2 className="w-3 h-3 mr-1" /> Hapus semua
          </Button>
        </div>
      )}

      {loading ? (
        <p className="text-center text-[11px] text-muted-foreground py-10">Memuat...</p>
      ) : items.length === 0 ? (
        <Card className="bg-card/80 border-border/60">
          <CardContent className="p-8 text-center">
            <Bell className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-xs font-medium text-foreground">Belum ada pemberitahuan</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Notifikasi akan muncul saat Anda melakukan aktivitas seperti deposit, klaim profit, atau pembelian produk.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const Icon = iconFor(n.type);
            const color = colorFor(n.type);
            return (
              <Card
                key={n.id}
                className={`bg-card/80 border-border/60 ${!n.is_read ? "border-primary/40" : ""}`}
                onClick={() => !n.is_read && markRead(n.id)}
              >
                <CardContent className="p-3 flex gap-2.5">
                  <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[11px] font-semibold text-foreground break-words">{n.title}</p>
                      {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1 shrink-0" />}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug break-words">{n.message}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[9px] text-muted-foreground">{timeAgo(n.created_at)}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); remove(n.id); }}
                        className="text-[9px] text-destructive/80 hover:text-destructive flex items-center gap-0.5"
                      >
                        <Trash2 className="w-2.5 h-2.5" /> Hapus
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Notifications;
