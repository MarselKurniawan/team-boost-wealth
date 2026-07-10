import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Phone, Lock, Loader2, ArrowLeft, CheckCircle, Shield } from "lucide-react";

type Step = "phone" | "captcha" | "newPassword" | "success";

interface ForgotPasswordFlowProps {
  onBack: () => void;
}

const generateCaptcha = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

const ForgotPasswordFlow = ({ onBack }: ForgotPasswordFlowProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [captchaCode, setCaptchaCode] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleStartCaptcha = () => {
    if (!phone || phone.length < 10) {
      toast({ title: "Error", description: "Masukkan nomor WhatsApp yang valid", variant: "destructive" });
      return;
    }
    setCaptchaCode(generateCaptcha());
    setCaptchaInput("");
    setStep("captcha");
  };

  const handleVerifyCaptcha = () => {
    if (captchaInput.trim().toUpperCase() !== captchaCode) {
      toast({ title: "Captcha Salah", description: "Kode tidak sesuai", variant: "destructive" });
      setCaptchaCode(generateCaptcha());
      setCaptchaInput("");
      return;
    }
    setStep("newPassword");
  };

  const handleResetPassword = async () => {
    if (!newPassword) {
      toast({ title: "Error", description: "Password tidak boleh kosong", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Password tidak cocok", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("reset-password", {
        body: { phone, code: "CAPTCHA_BYPASS", newPassword },
      });

      if (error || !data?.success) {
        toast({
          title: "Gagal Reset Password",
          description: data?.error || error?.message || "Terjadi kesalahan",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      setStep("success");
    } catch {
      toast({ title: "Error", description: "Terjadi kesalahan", variant: "destructive" });
    }
    setIsLoading(false);
  };

  if (step === "success") {
    return (
      <div className="space-y-4 text-center">
        <CheckCircle className="w-14 h-14 text-primary mx-auto" />
        <h3 className="text-lg font-semibold text-foreground">Password Berhasil Diubah!</h3>
        <p className="text-sm text-muted-foreground">Silakan login dengan password baru Anda.</p>
        <Button onClick={onBack} className="w-full" size="lg">
          Kembali ke Login
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={step === "phone" ? onBack : () => setStep(step === "newPassword" ? "captcha" : "phone")}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali
      </button>

      <div className="text-center space-y-1 mb-2">
        <h3 className="text-lg font-semibold text-foreground">Lupa Password</h3>
        <p className="text-sm text-muted-foreground">
          {step === "phone" && "Masukkan nomor WhatsApp terdaftar Anda"}
          {step === "captcha" && "Verifikasi bahwa Anda bukan robot"}
          {step === "newPassword" && "Buat password baru Anda"}
        </p>
      </div>

      {step === "phone" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="forgot-phone" className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> Nomor WhatsApp
            </Label>
            <Input
              id="forgot-phone"
              type="tel"
              placeholder="08123456789"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="bg-muted/50"
            />
          </div>
          <Button onClick={handleStartCaptcha} className="w-full" size="lg">
            Lanjut
          </Button>
        </>
      )}

      {step === "captcha" && (
        <>
          <div className="text-center mb-2">
            <Shield className="w-10 h-10 text-primary mx-auto" />
          </div>
          <div className="space-y-2">
            <Label>Kode Captcha</Label>
            <div className="flex items-center gap-2">
              <div
                className="flex-1 select-none text-center font-mono text-xl font-bold tracking-[0.4em] py-3 rounded-md border border-border bg-gradient-to-br from-muted via-muted/60 to-muted/40 text-foreground"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(45deg, hsl(var(--muted-foreground)/0.08) 0 2px, transparent 2px 8px)",
                  textShadow: "1px 1px 0 hsl(var(--muted-foreground)/0.25)",
                }}
              >
                {captchaCode}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setCaptchaCode(generateCaptcha()); setCaptchaInput(""); }}
              >
                ↻
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="captcha-input">Masukkan Kode di Atas</Label>
            <Input
              id="captcha-input"
              type="text"
              placeholder="Ketik kode captcha"
              value={captchaInput}
              onChange={(e) => setCaptchaInput(e.target.value.toUpperCase().slice(0, 6))}
              maxLength={6}
              className="bg-muted/50 text-center text-lg tracking-widest font-mono uppercase"
              autoFocus
            />
          </div>
          <Button onClick={handleVerifyCaptcha} className="w-full" size="lg">
            Verifikasi
          </Button>
        </>
      )}

      {step === "newPassword" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="new-password" className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Password Baru
            </Label>
            <Input
              id="new-password"
              type="password"
              placeholder="Masukkan password baru"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="bg-muted/50"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-new-password">Konfirmasi Password Baru</Label>
            <Input
              id="confirm-new-password"
              type="password"
              placeholder="Ulangi password baru"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-muted/50"
            />
          </div>
          <Button onClick={handleResetPassword} className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Memproses...</> : "Ubah Password"}
          </Button>
        </>
      )}
    </div>
  );
};

export default ForgotPasswordFlow;
