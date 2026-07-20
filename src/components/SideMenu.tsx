import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  ArrowDownToLine, ArrowUpFromLine, Landmark, Lock, Headphones, FileText,
  LogOut, ChevronRight, Crown, UserCog,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useVipTitles } from "@/hooks/useVipTitles";

interface Props { open: boolean; onOpenChange: (o: boolean) => void; }

const SideMenu = ({ open, onOpenChange }: Props) => {
  const navigate = useNavigate();
  const { profile, signOut, isAdmin } = useAuth();
  const { titleFor } = useVipTitles();

  const go = (path: string) => { onOpenChange(false); setTimeout(() => navigate(path), 60); };
  const uid = profile?.user_id?.slice(0, 6).toUpperCase() || "------";
  const vipTitle = titleFor(profile?.vip_level ?? 0);

  const items = [
    { icon: ArrowDownToLine, label: "Riwayat Deposit", action: () => go("/profile?action=history&type=recharge") },
    { icon: ArrowUpFromLine, label: "Riwayat Penarikan", action: () => go("/profile?action=history&type=withdraw") },
    { icon: Landmark, label: "Akun Bank", action: () => go("/profile?action=bank") },
    { icon: Lock, label: "Ganti Password", action: () => go("/profile?action=password") },
    { icon: Headphones, label: "Layanan Pelanggan", action: () => go("/contact") },
    { icon: FileText, label: "Legalitas Perusahaan", action: () => go("/profile?action=legality") },
    ...(isAdmin ? [{ icon: UserCog, label: "Admin Panel", action: () => go("/admin") }] : []),
  ];


  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[300px] p-0 border-r-0 bg-[#f5f8ff]">
        <div className="flex flex-col h-full">
          {/* Header identity */}
          <button
            onClick={() => go("/profile")}
            className="relative flex items-center gap-3 p-4 pt-6 text-left bg-white border-b border-emerald-100"
          >
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#10b981] to-[#065f46] p-[2px]">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-primary text-sm font-bold">
                {(profile?.name?.[0] || "U").toUpperCase()}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-foreground truncate">ID: {uid}</p>
              <p className="text-[10px] text-muted-foreground truncate">{profile?.name || "Pengguna"}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* VIP card */}
          <div className="mx-4 mt-4 rounded-2xl overflow-hidden bg-gradient-to-br from-[#e6efff] to-[#dbe7ff] border border-emerald-100">
            <div className="px-3 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gradient-to-br from-[#047857] to-[#10b981] text-white text-[10px] font-bold">
                  <Crown className="w-2.5 h-2.5" /> VIP{profile?.vip_level ?? 0}
                </span>
                <span className="text-[10px] font-semibold text-foreground truncate">{vipTitle}</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-600">+2%</span>
            </div>
            <div className="border-t border-white/60 px-3 py-2 space-y-1.5 bg-white/40">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">Progres Level</span>
                <span className="font-semibold text-foreground">0/2</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">Tugas Minggu Ini</span>
                <span className="font-semibold text-foreground">0/1</span>
              </div>
            </div>
          </div>

          {/* Menu list */}
          <div className="mt-4 mx-4 rounded-2xl bg-white border border-emerald-100 divide-y divide-emerald-50 overflow-hidden flex-1 overflow-y-auto">
            {items.map((it) => (
              <button
                key={it.label}
                onClick={it.action}
                className="w-full flex items-center gap-3 px-3.5 py-3 hover:bg-emerald-50/70 transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-primary flex items-center justify-center">
                  <it.icon className="w-3.5 h-3.5" />
                </div>
                <span className="flex-1 text-[12px] font-medium text-foreground">{it.label}</span>
                {(it as any).value && <span className="text-[10px] text-primary font-semibold">{(it as any).value}</span>}
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            ))}

            <button
              onClick={async () => { await signOut(); onOpenChange(false); navigate("/auth"); }}
              className="w-full flex items-center gap-3 px-3.5 py-3 hover:bg-red-50/70 transition-colors text-left"
            >
              <div className="w-7 h-7 rounded-lg bg-red-50 text-destructive flex items-center justify-center">
                <LogOut className="w-3.5 h-3.5" />
              </div>
              <span className="flex-1 text-[12px] font-medium text-destructive">Keluar</span>
            </button>
          </div>

          <div className="p-4 text-center text-[10px] text-muted-foreground">Terracycle · v2.0</div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SideMenu;
