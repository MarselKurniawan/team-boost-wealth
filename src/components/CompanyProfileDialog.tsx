import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Building2, MapPin, Phone, Mail, Globe, Shield, Award, Users, TrendingUp, Clock, Target, Briefcase, CheckCircle2, FileText } from "lucide-react";
import companyBuilding from "@/assets/company-building.jpg";
import companyOffice from "@/assets/company-office.jpg";
import appLogo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";

interface CompanyProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface LegalityDoc { id: string; title: string; document_number: string; description: string; image_url: string; status: string; }

const CompanyProfileDialog = ({ open, onOpenChange }: CompanyProfileDialogProps) => {
  const [docs, setDocs] = useState<LegalityDoc[]>([]);
  useEffect(() => {
    if (!open) return;
    supabase.from("company_legality").select("*").order("sort_order").then(({ data }) => {
      if (data) setDocs(data as any);
    });
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Profil Perusahaan
          </DialogTitle>
          <DialogDescription>
            Informasi lengkap tentang InvestPro Indonesia
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Company Building Image */}
          <div className="relative rounded-xl overflow-hidden">
            <img 
              src={companyBuilding} 
              alt="Kantor Pusat InvestPro" 
              className="w-full h-40 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
            <div className="absolute bottom-3 left-3 right-3">
              <Badge variant="vip" className="text-xs">Kantor Pusat Austin, Texas, USA</Badge>
            </div>
          </div>

          {/* Company Logo & Name */}
          <div className="text-center">
            <div className="w-20 h-20 mx-auto bg-card border border-border rounded-2xl flex items-center justify-center mb-4 overflow-hidden">
              <img src={appLogo} alt="InvestPro" className="w-full h-full object-contain p-2" />
            </div>
            <h2 className="text-xl font-bold text-foreground">PT InvestPro Indonesia</h2>
            <Badge variant="vip" className="mt-2">Platform Investasi Digital Terpercaya</Badge>
          </div>

          <Separator />

          {/* About with More Detail */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Award className="w-4 h-4 text-vip-gold" />
              Tentang Kami
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              <strong className="text-foreground">InvestPro</strong> adalah perusahaan spin-off dari Human Centered Robotics Lab di Universitas Texas di Austin. Kami didirikan pada awal tahun 2016 dengan tujuan menghadirkan generasi robot berikutnya yang akan mengubah cara kita hidup dan bekerja. Kami telah membangun beberapa robot yang paling beragam, mulai dari eksoskeleton hingga torso humanoid, platform mobilitas bipedal, dan lengan robot unik yang mampu mengangkat beban lebih berat daripada beratnya sendiri. Pengalaman dan pembelajaran dari semua pekerjaan ini mengarah pada pengembangan <strong className="text-foreground">Apollo</strong>, robot humanoid tercanggih di dunia.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Kami membangun mesin yang memberdayakan manusia untuk hidup dengan potensi penuh. Kami percaya bahwa bukan <em>Manusia vs. Mesin</em>, melainkan <em>Manusia + Mesin</em> yang akan membawa umat manusia ke tahap evolusi selanjutnya.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Kami sangat antusias dengan peran yang dapat dimainkan teknologi dalam masyarakat kita, dan kami tidak berkompromi dalam komitmen kami terhadap keunggulan dalam rekayasa dan produk kami. Kami bertujuan untuk mengaburkan batasan antara seni dan teknologi, dan membangun budaya perusahaan yang berfokus pada upaya melampaui batas-batas kemungkinan.
            </p>
          </div>

          {/* Vision & Mission */}
          <div className="grid grid-cols-1 gap-3">
            <div className="p-3 bg-primary/10 rounded-lg border border-primary/30">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm text-foreground">Visi</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Menjadi platform investasi digital #1 di Indonesia yang memberikan akses investasi 
                inklusif untuk semua kalangan masyarakat.
              </p>
            </div>
            <div className="p-3 bg-success/10 rounded-lg border border-success/30">
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className="w-4 h-4 text-success" />
                <span className="font-semibold text-sm text-foreground">Misi</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Menyediakan produk investasi yang aman, transparan, dan menguntungkan dengan 
                teknologi terdepan serta layanan pelanggan 24/7.
              </p>
            </div>
          </div>

          {/* Office Interior Image */}
          <div className="relative rounded-xl overflow-hidden">
            <img 
              src={companyOffice} 
              alt="Suasana Kantor InvestPro" 
              className="w-full h-32 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
            <div className="absolute bottom-2 left-3">
              <p className="text-xs text-foreground font-medium">Tim profesional kami siap melayani Anda</p>
            </div>
          </div>

          {/* Stats with Explanation */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-success" />
              Pencapaian Kami
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-muted/50 rounded-lg p-3 text-center border border-border/50">
                <Users className="w-5 h-5 mx-auto text-primary mb-1" />
                <p className="text-lg font-bold text-foreground">100K+</p>
                <p className="text-xs text-muted-foreground">Investor Aktif</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center border border-border/50">
                <TrendingUp className="w-5 h-5 mx-auto text-success mb-1" />
                <p className="text-lg font-bold text-foreground">15%</p>
                <p className="text-xs text-muted-foreground">Rata-rata ROI</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center border border-border/50">
                <Clock className="w-5 h-5 mx-auto text-accent mb-1" />
                <p className="text-lg font-bold text-foreground">4+ Thn</p>
                <p className="text-xs text-muted-foreground">Pengalaman</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-lg">
              💡 <strong>Apa artinya?</strong> Dengan lebih dari 100.000 investor dan rata-rata 
              return 15% per tahun, InvestPro telah membuktikan komitmen dalam memberikan hasil investasi yang optimal.
            </p>
          </div>

          <Separator />

          {/* Why Choose Us */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              Mengapa Pilih InvestPro?
            </h3>
            <div className="space-y-2">
              <div className="flex items-start gap-3 p-2 bg-muted/50 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Keamanan Terjamin</p>
                  <p className="text-xs text-muted-foreground">Dana Anda disimpan di rekening terpisah dan dilindungi sistem enkripsi tingkat bank.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-2 bg-muted/50 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Transparan & Terpercaya</p>
                  <p className="text-xs text-muted-foreground">Semua transaksi tercatat dengan jelas. Anda bisa pantau investasi kapan saja.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-2 bg-muted/50 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Dukungan 24/7</p>
                  <p className="text-xs text-muted-foreground">Tim customer service kami siap membantu Anda kapan pun dibutuhkan.</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Contact Info */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Phone className="w-4 h-4 text-primary" />
              Hubungi Kami
            </h3>
            
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <span className="text-sm text-foreground block">11701 Stonehollow Dr STE 100</span>
                  <span className="text-xs text-muted-foreground">Austin, TX 78758, Amerika Serikat</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <div>
                  <span className="text-sm text-foreground block">+44 7529 467172</span>
                  <span className="text-xs text-muted-foreground">Senin - Jumat, 09:00 - 18:00</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground break-all">info@investpro.com</span>
              </div>
              
              <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground">investpro.com</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Legal with Explanation */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Shield className="w-4 h-4 text-success" />
              Legalitas Perusahaan
            </h3>
            <p className="text-xs text-muted-foreground">
              Perusahaan kami telah terdaftar secara resmi dan memiliki izin operasional yang lengkap:
            </p>
            
            {docs.length === 0 ? (
              <p className="text-xs text-muted-foreground italic p-3 bg-muted/30 rounded-lg text-center">
                Belum ada dokumen legalitas yang diupload.
              </p>
            ) : (
              <div className="space-y-2 text-sm">
                {docs.map((doc) => (
                  <div key={doc.id} className="p-2 bg-success/10 rounded-lg border border-success/30 space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="text-muted-foreground block text-xs">{doc.title}</span>
                        {doc.document_number && (
                          <span className="font-medium text-foreground text-xs break-all">{doc.document_number}</span>
                        )}
                        {doc.description && (
                          <p className="text-[10px] text-muted-foreground mt-1">{doc.description}</p>
                        )}
                      </div>
                      <Badge variant="success" className="text-xs shrink-0">{doc.status}</Badge>
                    </div>
                    {doc.image_url && (
                      <a href={doc.image_url} target="_blank" rel="noopener noreferrer" className="block">
                        <img src={doc.image_url} alt={doc.title} className="w-full max-h-48 object-contain rounded-md border border-border bg-card" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Disclaimer */}
          <div className="p-3 bg-accent/10 rounded-lg border border-accent/30">
            <p className="text-xs text-muted-foreground">
              ⚠️ <strong>Disclaimer:</strong> Investasi mengandung risiko termasuk risiko kehilangan modal. 
              Pastikan Anda memahami produk investasi dan profil risiko Anda sebelum berinvestasi. 
              Kinerja masa lalu bukan jaminan kinerja masa depan. Selalu diversifikasi portofolio Anda.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CompanyProfileDialog;