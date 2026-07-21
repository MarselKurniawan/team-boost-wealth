import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { updateProfile } from "@/lib/database";
import { supabase } from "@/integrations/supabase/client";
import { User, Phone, Save, Eye, EyeOff, Lock, ShieldCheck, Loader2, X, KeyRound } from "lucide-react";

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "profile" | "password";
  onSuccess: () => void;
}

const ProfileDialog = ({ open, onOpenChange, mode, onSuccess }: ProfileDialogProps) => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [phoneOtpStep, setPhoneOtpStep] = useState<"idle" | "sending" | "verifying">("idle");
  const [otpCode, setOtpCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const phoneChanged = editPhone.trim() !== (profile?.phone || "").trim();

  useEffect(() => {
    if (open && profile) {
      setEditName(profile.name);
      setEditPhone(profile.phone || "");
      setNewPassword(""); setConfirmPassword("");
      setPhoneOtpStep("idle"); setOtpCode(""); setPhoneVerified(false); setCooldown(0);
    }
  }, [open, profile]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleSendOtp = async () => {
    const phone = editPhone.trim();
    if (!phone || phone.length < 10) {
      toast({ title: "Error", description: "Nomor WhatsApp tidak valid", variant: "destructive" });
      return;
    }
    setOtpSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", { body: { phone } });
      if (error) throw error;
      if (data?.error) { toast({ title: "Error", description: data.error, variant: "destructive" }); return; }
      setPhoneOtpStep("verifying"); setCooldown(60);
      toast({ title: "OTP Terkirim", description: `Kode OTP dikirim ke ${phone}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Gagal mengirim OTP", variant: "destructive" });
    } finally { setOtpSending(false); }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) { toast({ title: "Error", description: "Masukkan 6 digit kode OTP", variant: "destructive" }); return; }
    setOtpVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-otp", { body: { phone: editPhone.trim(), code: otpCode } });
      if (error) throw error;
      if (data?.error) { toast({ title: "Error", description: data.error, variant: "destructive" }); return; }
      setPhoneVerified(true); setPhoneOtpStep("idle");
      toast({ title: "Terverifikasi", description: "Nomor WhatsApp berhasil diverifikasi" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "OTP tidak valid", variant: "destructive" });
    } finally { setOtpVerifying(false); }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim() || !user) { toast({ title: "Error", description: "Nama tidak boleh kosong", variant: "destructive" }); return; }
    if (phoneChanged && !phoneVerified) { toast({ title: "Error", description: "Verifikasi nomor WhatsApp baru terlebih dahulu", variant: "destructive" }); return; }
    await updateProfile(user.id, { name: editName.trim(), phone: editPhone.trim() });
    toast({ title: "Profil Diperbarui", description: "Data profil berhasil disimpan" });
    onOpenChange(false); onSuccess();
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) { toast({ title: "Error", description: "Password minimal 6 karakter", variant: "destructive" }); return; }
    if (newPassword !== confirmPassword) { toast({ title: "Error", description: "Password tidak cocok", variant: "destructive" }); return; }
    if (!user) return;
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Password Diperbarui", description: "Password baru berhasil disimpan" });
    onOpenChange(false); onSuccess();
  };

  const handlePhoneChange = (v: string) => { setEditPhone(v); setPhoneVerified(false); setPhoneOtpStep("idle"); setOtpCode(""); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden rounded-3xl border-0 shadow-2xl">
        <div className="relative bg-gradient-to-br from-[#065f46] via-[#047857] to-[#10b981] text-white px-5 pt-5 pb-7">
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" />
          <div className="absolute -left-6 -bottom-6 w-28 h-28 rounded-full bg-lime-300/15" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-[9px] uppercase tracking-[0.32em] text-white/70 font-semibold">Pengaturan</p>
              <h2 className="text-lg font-heading font-bold mt-0.5">
                {mode === "profile" ? "Perbarui Profil" : "Ganti Password"}
              </h2>
              <p className="text-[10px] text-white/70 mt-0.5">
                {mode === "profile" ? "Perbaharui informasi akun kamu" : "Amankan akun dengan password baru"}
              </p>
            </div>
            <button onClick={() => onOpenChange(false)} className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="bg-white px-5 pt-6 pb-5 -mt-3 rounded-t-3xl relative space-y-4">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center -mt-9 border-4 border-white shadow-sm">
            {mode === "profile" ? <User className="w-5 h-5 text-primary" /> : <KeyRound className="w-5 h-5 text-primary" />}
          </div>

          {mode === "profile" ? (
            <>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-primary/70">Nama Lengkap</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="rounded-xl border-emerald-200 h-10 text-[12px]" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-primary/70">Nomor WhatsApp</Label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input value={editPhone} onChange={(e) => handlePhoneChange(e.target.value)} placeholder="08xxxxxxxxxx" className="rounded-xl border-emerald-200 h-10 text-[12px] pl-9" />
                  </div>
                  {phoneChanged && !phoneVerified && (
                    <Button size="sm" variant="outline" onClick={handleSendOtp} disabled={otpSending || cooldown > 0 || phoneOtpStep === "verifying"} className="h-10 rounded-xl border-emerald-200 text-[11px] shrink-0">
                      {otpSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : cooldown > 0 ? `${cooldown}s` : "Kirim OTP"}
                    </Button>
                  )}
                  {phoneVerified && <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />}
                </div>
                {phoneOtpStep === "verifying" && (
                  <div className="space-y-2 p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100 mt-2">
                    <p className="text-[10px] text-muted-foreground">Kode OTP dikirim ke <strong className="text-foreground">{editPhone}</strong></p>
                    <div className="flex justify-center">
                      <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                        <InputOTPGroup>
                          {[0,1,2,3,4,5].map(i => <InputOTPSlot key={i} index={i} />)}
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 h-9 rounded-full bg-gradient-to-br from-[#10b981] to-[#065f46] text-white text-[11px]" onClick={handleVerifyOtp} disabled={otpVerifying || otpCode.length !== 6}>
                        {otpVerifying ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <ShieldCheck className="w-3.5 h-3.5 mr-1" />}Verifikasi
                      </Button>
                      <Button size="sm" variant="ghost" className="h-9 rounded-full text-[11px]" onClick={() => { setPhoneOtpStep("idle"); setOtpCode(""); }}>Batal</Button>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-1">
                <Button className="flex-1 h-11 rounded-full bg-gradient-to-br from-[#10b981] to-[#065f46] text-white text-[12px] font-bold" onClick={handleSaveProfile}>
                  <Save className="w-3.5 h-3.5 mr-1.5" />Simpan
                </Button>
                <Button variant="outline" className="h-11 rounded-full border-emerald-200 text-[12px]" onClick={() => onOpenChange(false)}>Batal</Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-primary/70">Password Baru</Label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input type={showPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimal 6 karakter" className="rounded-xl border-emerald-200 h-10 text-[12px] pl-9 pr-9" />
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-primary/70">Konfirmasi Password</Label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Ulangi password baru" className="rounded-xl border-emerald-200 h-10 text-[12px] pl-9 pr-9" />
                  <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showConfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Gunakan kombinasi huruf & angka minimal 6 karakter. Password baru berlaku segera setelah disimpan.
                </p>
              </div>
              <div className="flex gap-2 pt-1">
                <Button className="flex-1 h-11 rounded-full bg-gradient-to-br from-[#10b981] to-[#065f46] text-white text-[12px] font-bold" onClick={handleChangePassword}>
                  <Save className="w-3.5 h-3.5 mr-1.5" />Simpan Password
                </Button>
                <Button variant="outline" className="h-11 rounded-full border-emerald-200 text-[12px]" onClick={() => onOpenChange(false)}>Batal</Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileDialog;
