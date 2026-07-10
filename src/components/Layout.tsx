import { NavLink } from "@/components/NavLink";
import { Home, Store, Users, User, LayoutGrid } from "lucide-react";

const Layout = ({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) => {
  const items = [
    { to: "/", icon: Home, label: "Beranda" },
    { to: "/product", icon: Store, label: "Produk" },
    { to: "/account", icon: LayoutGrid, label: "Akun" },
    { to: "/team", icon: Users, label: "Tim" },
    { to: "/profile", icon: User, label: "Saya" },
  ];

  return (
    <div className="min-h-screen bg-background pt-16">
      {/* Top Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background">
        <div className={`mx-auto ${wide ? "max-w-4xl" : "max-w-md"} px-3`}>
          <div className="flex items-center justify-between h-14 gap-1 overflow-x-auto no-scrollbar">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className="flex-1 min-w-[60px] flex flex-col items-center gap-0.5 py-1 rounded-lg text-muted-foreground transition-colors"
                activeClassName="text-primary bg-muted"
              >
                <item.icon className="w-4 h-4" strokeWidth={2} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      <div className={`mx-auto ${wide ? "max-w-4xl" : "max-w-md"} relative z-10 pb-8`}>
        {children}
      </div>
    </div>
  );
};

export default Layout;
