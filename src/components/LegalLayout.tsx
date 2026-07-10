import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import appLogo from "@/assets/logo.png";

interface LegalLayoutProps {
  title: string;
  updated?: string;
  children: React.ReactNode;
}

const LegalLayout = ({ title, updated = "11 Juni 2026", children }: LegalLayoutProps) => {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border bg-card/40 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={appLogo} alt="Apptronik" className="h-7 w-7" />
            <span className="font-semibold text-sm">Apptronik</span>
          </Link>
          <Button asChild variant="ghost" size="sm" className="text-xs">
            <Link to="/auth"><ArrowLeft className="w-3.5 h-3.5 mr-1" /> Kembali</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-1">{title}</h1>
        <p className="text-[11px] text-muted-foreground mb-6">Terakhir diperbarui: {updated}</p>
        <article className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed space-y-4 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_p]:text-muted-foreground [&_li]:text-muted-foreground">
          {children}
        </article>
      </main>

      <footer className="border-t border-border mt-8">
        <div className="max-w-3xl mx-auto px-4 py-5 text-[11px] text-muted-foreground flex flex-wrap gap-x-4 gap-y-2 justify-between">
          <div>© {new Date().getFullYear()} Apptronik. Hak cipta dilindungi.</div>
          <nav className="flex gap-3">
            <Link to="/about" className="hover:text-foreground">Tentang</Link>
            <Link to="/contact" className="hover:text-foreground">Kontak</Link>
            <Link to="/privacy-policy" className="hover:text-foreground">Privasi</Link>
            <Link to="/terms-of-service" className="hover:text-foreground">Syarat</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
};

export default LegalLayout;
