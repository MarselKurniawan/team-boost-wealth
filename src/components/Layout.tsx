import { useState } from "react";
import { NavLink } from "@/components/NavLink";
import { Home, Store, Hexagon, UserCircle, LayoutGrid } from "lucide-react";
import QuickMenuSheet from "@/components/QuickMenuSheet";

const Layout = ({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-robot-radial pb-20">

      <div className={`mx-auto ${wide ? "max-w-4xl" : "max-w-md"} relative z-10`}>
        {children}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-card">
        <div className="mx-auto max-w-md grid grid-cols-5 items-center py-2.5">
          <NavLink
            to="/"
            className="flex flex-col items-center gap-0.5 py-1.5 text-muted-foreground transition-colors"
            activeClassName="text-primary"
          >
            <Home className="w-5 h-5" strokeWidth={1.75} />
            <span className="text-[10px]">Rumah</span>
          </NavLink>

          <NavLink
            to="/product"
            className="flex flex-col items-center gap-0.5 py-1.5 text-muted-foreground transition-colors"
            activeClassName="text-primary"
          >
            <Store className="w-5 h-5" strokeWidth={1.75} />
            <span className="text-[10px]">Toko</span>
          </NavLink>

          {/* Center Menu */}
          <button
            onClick={() => setMenuOpen(true)}
            className="flex flex-col items-center gap-0.5 -mt-7"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <Hexagon className="w-6 h-6 text-primary-foreground" strokeWidth={2} />
            </div>
            <span className="text-[10px] text-primary font-medium mt-0.5">Beranda</span>
          </button>

          <NavLink
            to="/team"
            className="flex flex-col items-center gap-0.5 py-1.5 text-muted-foreground transition-colors"
            activeClassName="text-primary"
          >
            <LayoutGrid className="w-5 h-5" strokeWidth={1.75} />
            <span className="text-[10px]">Tim</span>
          </NavLink>

          <NavLink
            to="/profile"
            className="flex flex-col items-center gap-0.5 py-1.5 text-muted-foreground transition-colors"
            activeClassName="text-primary"
          >
            <UserCircle className="w-5 h-5" strokeWidth={1.75} />
            <span className="text-[10px]">Saya</span>
          </NavLink>
        </div>
      </nav>

      <QuickMenuSheet open={menuOpen} onOpenChange={setMenuOpen} />
    </div>
  );
};

export default Layout;
