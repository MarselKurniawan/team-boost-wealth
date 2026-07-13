import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Store, Gift, Users, User, Menu, MessageSquare, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import SideMenu from "@/components/SideMenu";

const Layout = ({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const items = [
    { to: "/", icon: Home, label: "Beranda" },
    { to: "/product", icon: Store, label: "Produk" },
    { to: "/account", icon: Gift, label: "Hadiah", center: true },
    { to: "/team", icon: Users, label: "Tim" },
    { to: "/profile", icon: User, label: "Saya" },
  ];

  return (
    <div className="min-h-screen bg-[#f0f4fb] pb-24">
      <header className="sticky top-0 z-30 border-b border-blue-100 bg-white/90 backdrop-blur">
        <div className={`mx-auto ${wide ? "max-w-4xl" : "max-w-md"} px-4 h-12 flex items-center justify-between`}>
          <button
            onClick={() => setMenuOpen(true)}
            className="w-8 h-8 rounded-lg hover:bg-blue-50 flex items-center justify-center text-foreground"
            aria-label="Menu"
          >
            <Menu className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#1e3a8a] flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-heading text-[13px] font-bold tracking-tight text-foreground">
              INVEST<span className="text-primary">PRO</span>
            </span>
          </div>
          <button
            onClick={() => navigate("/notifications")}
            className="relative w-8 h-8 rounded-lg hover:bg-blue-50 flex items-center justify-center text-foreground"
            aria-label="Pesan"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-destructive" />
          </button>
        </div>
      </header>

      <main className={`mx-auto ${wide ? "max-w-4xl" : "max-w-md"} relative z-10`}>{children}</main>

      {/* Bottom nav with prominent center */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 z-40 w-full max-w-md">
        <div className="relative bg-white border-t border-blue-100 px-3 pt-2 pb-3">
          <div className="grid grid-cols-5 items-end gap-1">
            {items.map((item) => {
              const active = pathname === item.to;
              if (item.center) {
                return (
                  <Link key={item.to} to={item.to} className="flex flex-col items-center -mt-6">
                    <div className={cn(
                      "w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/40 ring-4 ring-white",
                      "bg-gradient-to-br from-[#3b82f6] to-[#1e3a8a] text-white"
                    )}>
                      <item.icon className="w-6 h-6" strokeWidth={2.2} />
                    </div>
                    <span className="text-[10px] mt-1 font-semibold text-primary">{item.label}</span>
                  </Link>
                );
              }
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex flex-col items-center gap-0.5 py-1 rounded-lg transition-colors",
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <item.icon className="w-5 h-5" strokeWidth={active ? 2.4 : 1.8} />
                  <span className={cn("text-[10px]", active ? "font-bold" : "font-medium")}>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <SideMenu open={menuOpen} onOpenChange={setMenuOpen} />
    </div>
  );
};

export default Layout;
