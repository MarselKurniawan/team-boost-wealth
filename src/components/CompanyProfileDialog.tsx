import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Building2, Eye, Rocket, Mail, Phone, MapPin, Users, TrendingUp, Clock } from "lucide-react";

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
            <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" strokeWidth={2} />
            </div>
          </div>
          <h1 className="text-lg font-bold leading-tight">Profil Perusahaan</h1>
          <p className="text-[10px] text-blue-100 mt-1 uppercase tracking-widest font-medium">
            Terracycle · Robotika & Otomasi Humanoid
          </p>
        </div>

        {/* Content */}
        <div className="p-5 space-y-6">
          {/* About */}
          <section>
            <h2 className="text-[#1e3a8a] text-[11px] font-bold uppercase tracking-wider mb-2">Tentang Kami</h2>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              <strong className="text-slate-800">Terracycle</strong> adalah perusahaan spin-off dari Human Centered Robotics Lab, Universitas Texas di Austin. Didirikan tahun 2016 dengan misi menghadirkan generasi robot humanoid berikutnya — mulai dari eksoskeleton, torso humanoid, hingga <strong className="text-slate-800">Apollo</strong>, robot humanoid paling canggih di dunia.
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
                Menjadi platform investasi digital #1 untuk revolusi otomasi humanoid.
              </p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-blue-50">
              <div className="text-blue-600 mb-1">
                <Rocket className="w-3.5 h-3.5" strokeWidth={2.5} />
              </div>
              <h3 className="text-[#1e3a8a] text-[10px] font-bold mb-1">Misi</h3>
              <p className="text-slate-500 text-[9px] leading-snug">
                Menyediakan produk investasi aman, transparan, dan menguntungkan setiap hari.
              </p>
            </div>
          </div>

          {/* Stats strip */}
          <div className="bg-white rounded-xl border border-blue-50 p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1 text-center">
                <Users className="w-3.5 h-3.5 mx-auto text-blue-600 mb-1" />
                <p className="text-[12px] font-bold text-[#1e3a8a]">100K+</p>
                <p className="text-[8px] text-slate-400 uppercase tracking-wide">Investor</p>
              </div>
              <div className="w-px h-8 bg-blue-100" />
              <div className="flex-1 text-center">
                <TrendingUp className="w-3.5 h-3.5 mx-auto text-blue-600 mb-1" />
                <p className="text-[12px] font-bold text-[#1e3a8a]">15%</p>
                <p className="text-[8px] text-slate-400 uppercase tracking-wide">Rata ROI</p>
              </div>
              <div className="w-px h-8 bg-blue-100" />
              <div className="flex-1 text-center">
                <Clock className="w-3.5 h-3.5 mx-auto text-blue-600 mb-1" />
                <p className="text-[12px] font-bold text-[#1e3a8a]">10+</p>
                <p className="text-[8px] text-slate-400 uppercase tracking-wide">Tahun</p>
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
              <span className="text-[11px] font-medium">+44 7529 467172</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-white/10 rounded-full flex items-center justify-center shrink-0">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-medium leading-tight">11701 Stonehollow Dr STE 100, Austin, TX 78758</span>
            </div>
          </div>

          {/* Disclaimer */}
          <p className="text-[9px] text-slate-400 leading-relaxed text-center px-2">
            Investasi mengandung risiko. Pastikan Anda memahami produk dan profil risiko sebelum berinvestasi.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CompanyProfileDialog;
