import LegalLayout from "@/components/LegalLayout";
import { Mail, MapPin, Clock } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

const Contact = () => (
  <LegalLayout title="Hubungi Kami">
    <p>
      Tim Customer Service Terracycle siap membantu Anda 24 jam setiap hari. Silakan hubungi kami melalui salah satu
      saluran resmi di bawah ini.
    </p>

    <div className="grid sm:grid-cols-2 gap-3 not-prose mt-4">
      <a
        href="https://wa.me/447529467172"
        target="_blank"
        rel="noopener noreferrer"
        className="border border-border rounded-lg p-4 hover:bg-muted/50 transition"
      >
        <div className="flex items-center gap-2 mb-1">
          <WhatsAppIcon size={16} className="text-success" />
          <span className="font-semibold text-sm">WhatsApp CS</span>
        </div>
        <p className="text-xs text-muted-foreground">+44 7529 467172</p>
        <p className="text-[10px] text-muted-foreground mt-1">Respon tercepat — 24 jam</p>
      </a>

      <a
        href="mailto:support@terracycle.id"
        className="border border-border rounded-lg p-4 hover:bg-muted/50 transition"
      >
        <div className="flex items-center gap-2 mb-1">
          <Mail className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">Email Resmi</span>
        </div>
        <p className="text-xs text-muted-foreground">support@terracycle.com</p>
        <p className="text-[10px] text-muted-foreground mt-1">Respon 1×24 jam kerja</p>
      </a>

      <div className="border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-1">
          <MapPin className="w-4 h-4 text-accent" />
          <span className="font-semibold text-sm">Alamat</span>
        </div>
        <p className="text-xs text-muted-foreground">Austin, Texas 73301</p>
      </div>

      <div className="border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-4 h-4 text-warning" />
          <span className="font-semibold text-sm">Jam Operasional</span>
        </div>
        <p className="text-xs text-muted-foreground">24 Jam / 7 Hari</p>
      </div>
    </div>

    <h2>Peringatan Keamanan</h2>
    <ul>
      <li>
        Staf Terracycle <strong>tidak pernah</strong> meminta password, OTP, atau PIN.
      </li>
      <li>Selalu pastikan Anda menghubungi nomor & email resmi yang tertera di halaman ini.</li>
      <li>Waspadai akun palsu yang mengatasnamakan Terracycle di media sosial.</li>
    </ul>
  </LegalLayout>
);

export default Contact;
