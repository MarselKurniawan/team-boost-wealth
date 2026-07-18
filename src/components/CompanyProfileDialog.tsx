import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Recycle, Eye, Rocket, Mail, Phone, MapPin, Leaf, Globe2, Factory } from "lucide-react";
import brandLogo from "@/assets/logo.png";

interface CompanyProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CompanyProfileDialog = ({ open, onOpenChange }: CompanyProfileDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px] p-0 overflow-hidden rounded-[24px] border-slate-200 bg-[#f0f4fb] max-h-[90vh] overflow-y-auto">
        {/* Hero Header */}
        <div className="bg-gradient-to-br from-[#1e3a8a] to-[#3b82f6] p-6 text-white">
          <div className="flex justify-between items-start mb-4">
            <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center p-1.5">
              <img src={brandLogo} alt="Terracycle" className="w-full h-full object-contain" />
            </div>
            <Recycle className="w-5 h-5 text-white/60" />
          </div>
          <h1 className="text-lg font-bold leading-tight">Profil Perusahaan</h1>
          <p className="text-[10px] text-blue-100 mt-1 uppercase tracking-widest font-medium">
            Terracycle · Daur Ulang Sampah Global
          </p>
        </div>

        {/* Content */}
        <div className="p-5 space-y-6">
          {/* About */}
          <section>
            <h2 className="text-[#1e3a8a] text-[11px] font-bold uppercase tracking-wider mb-2">Tentang Kami</h2>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              <strong className="text-slate-800">Terracycle</strong> adalah perusahaan sosial global yang bergerak di bidang <strong className="text-slate-800">daur ulang sampah sulit terurai</strong>. Kami mengubah kemasan bekas, plastik, dan limbah rumah tangga menjadi bahan baku baru — menjadikan sirkular ekonomi sebagai peluang investasi berkelanjutan bagi setiap orang.
            </p>
          </section>

          {/* Vision / Mission */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-3 rounded-xl border border-blue-50">
              <div className="text-blue-600 mb-1">
                <Eye className="w-3.5 h-3.5" strokeWidth={2.5} />
              </div>
              <h3 className="text-[#1e3a8a] text-[10px] font-bold mb-1">Visi</h3>
              <p className="text-slate-500 text-[9px] leading-snug">
                Menghilangkan konsep "sampah" — semua bisa didaur ulang.
              </p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-blue-50">
              <div className="text-blue-600 mb-1">
                <Rocket className="w-3.5 h-3.5" strokeWidth={2.5} />
              </div>
              <h3 className="text-[#1e3a8a] text-[10px] font-bold mb-1">Misi</h3>
              <p className="text-slate-500 text-[9px] leading-snug">
                Mengolah limbah menjadi produk & profit harian bagi mitra investor.
              </p>
            </div>
          </div>

          {/* Stats strip */}
          <div className="bg-white rounded-xl border border-blue-50 p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1 text-center">
                <Globe2 className="w-3.5 h-3.5 mx-auto text-blue-600 mb-1" />
                <p className="text-[12px] font-bold text-[#1e3a8a]">21+</p>
                <p className="text-[8px] text-slate-400 uppercase tracking-wide">Negara</p>
              </div>
              <div className="w-px h-8 bg-blue-100" />
              <div className="flex-1 text-center">
                <Leaf className="w-3.5 h-3.5 mx-auto text-blue-600 mb-1" />
                <p className="text-[12px] font-bold text-[#1e3a8a]">10JT+</p>
                <p className="text-[8px] text-slate-400 uppercase tracking-wide">Kg Terolah</p>
              </div>
              <div className="w-px h-8 bg-blue-100" />
              <div className="flex-1 text-center">
                <Factory className="w-3.5 h-3.5 mx-auto text-blue-600 mb-1" />
                <p className="text-[12px] font-bold text-[#1e3a8a]">200+</p>
                <p className="text-[8px] text-slate-400 uppercase tracking-wide">Pabrik Mitra</p>
              </div>
            </div>
          </div>

          {/* Contact Footer */}
          <div className="bg-[#1e3a8a] rounded-xl p-4 text-white space-y-2.5">
            <p className="text-[9px] text-blue-300 uppercase tracking-widest font-bold">Hubungi Kami</p>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-white/10 rounded-full flex items-center justify-center shrink-0">
                <Mail className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-medium break-all">info@terracycle.com</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-white/10 rounded-full flex items-center justify-center shrink-0">
                <Phone className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-medium">+1 609 393 4252</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-white/10 rounded-full flex items-center justify-center shrink-0">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-medium leading-tight">121 New York Ave, Trenton, NJ 08638, USA</span>
            </div>
          </div>

          {/* Disclaimer */}
          <p className="text-[9px] text-slate-400 leading-relaxed text-center px-2">
            Setiap investasi mendukung program daur ulang sampah global. Pahami risiko sebelum berinvestasi.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CompanyProfileDialog;
