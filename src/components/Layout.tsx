import { Link, useLocation } from "react-router-dom";
import { Home, Store, LayoutGrid, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";

const Layout = ({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) => {
  const { pathname } = useLocation();
  const items = [
    { to: "/", icon: Home, label: "Beranda" },
    { to: "/product", icon: Store, label: "Produk" },
    { to: "/account", icon: LayoutGrid, label: "Akun" },
    { to: "/team", icon: Users, label: "Tim" },
    { to: "/profile", icon: User, label: "Saya" },
  ];

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="border-b border-border bg-background">
        <div className={`mx-auto ${wide ? "max-w-4xl" : "max-w-md"} px-5 h-12 flex items-center justify-between`}>
          <span className="font-heading text-[13px] font-bold tracking-tight text-foreground">
            INVESTPRO<span className="text-primary">.</span>
          </span>
          <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Mobile Edition</span>
        </div>
      </header>

      <main className={`mx-auto ${wide ? "max-w-4xl" : "max-w-md"} relative z-10`}>
        {children}
      </main>

      {/* Floating pill bottom nav */}
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-1 bg-foreground text-background px-2 py-2 rounded-full shadow-[0_18px_40px_-15px_rgba(15,23,42,0.55)]">
          {items.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center justify-center gap-1.5 h-10 px-3 rounded-full transition-all duration-200",
                  active ? "bg-background text-foreground px-4" : "hover:bg-background/10",
                )}
              >
                <item.icon className="w-4 h-4" strokeWidth={2} />
                {active && (
                  <span className="text-[11px] font-semibold tracking-tight">{item.label}</span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default Layout;
