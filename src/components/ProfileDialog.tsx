import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { updateProfile } from "@/lib/database";
import { supabase } from "@/integrations/supabase/client";
import { User, Mail, Phone, Save, Eye, EyeOff, Lock, ShieldCheck, Loader2 } from "lucide-react";

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
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // OTP states for phone change
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
      setNewPassword("");
      setConfirmPassword("");
      setPhoneOtpStep("idle");
      setOtpCode("");
      setPhoneVerified(false);
      setCooldown(0);
    }
  }, [open, profile]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSendOtp = async () => {
    const phone = editPhone.trim();
    if (!phone || phone.length < 10) {
      toast({ title: "Error", description: "Nomor WhatsApp tidak valid", variant: "destructive" });
      return;
    }

    setOtpSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { phone },
      });

      if (error) throw error;
      if (data?.error) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        return;
      }

      setPhoneOtpStep("verifying");
      setCooldown(60);
      toast({ title: "OTP Terkirim", description: `Kode OTP dikirim ke ${phone}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Gagal mengirim OTP", variant: "destructive" });
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      toast({ title: "Error", description: "Masukkan 6 digit kode OTP", variant: "destructive" });
      return;
    }

    setOtpVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-otp", {
        body: { phone: editPhone.trim(), code: otpCode },
      });

      if (error) throw error;
      if (data?.error) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        return;
      }

      setPhoneVerified(true);
      setPhoneOtpStep("idle");
      toast({ title: "Terverifikasi", description: "Nomor WhatsApp berhasil diverifikasi" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "OTP tidak valid", variant: "destructive" });
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim() || !user) {
      toast({ title: "Error", description: "Nama tidak boleh kosong", variant: "destructive" });
      return;
    }

    // If phone changed and not verified, block save
    if (phoneChanged && !phoneVerified) {
      toast({ title: "Error", description: "Verifikasi nomor WhatsApp baru terlebih dahulu", variant: "destructive" });
      return;
    }

    await updateProfile(user.id, { name: editName.trim(), phone: editPhone.trim() });
    toast({ title: "Profil Diperbarui", description: "Data profil berhasil disimpan" });
    onOpenChange(false);
    onSuccess();
  };

  const handleChangePassword = async () => {
    if (!newPassword) {
      toast({ title: "Error", description: "Password tidak boleh kosong", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Password tidak cocok", variant: "destructive" });
      return;
    }

    if (!user) return;

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Password Diperbarui", description: "Password baru berhasil disimpan" });
    onOpenChange(false);
    onSuccess();
  };

  // Reset OTP state when phone input changes
  const handlePhoneChange = (value: string) => {
    setEditPhone(value);
    setPhoneVerified(false);
    setPhoneOtpStep("idle");
    setOtpCode("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "profile" ? <><User className="w-5 h-5 text-primary" />Update Profile</> : <><Lock className="w-5 h-5 text-accent" />Change Password</>}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {mode === "profile" ? (
            <>
              <div className="space-y-2">
                <Label>Nama Lengkap</Label>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="bg-muted/50" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <Input value={profile?.email || ""} disabled className="bg-muted/50" />
                </div>
                <p className="text-xs text-muted-foreground">Email tidak dapat diubah</p>
              </div>
              <div className="space-y-2">
                <Label>Nomor WhatsApp</Label>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <Input
                    value={editPhone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="08xxxxxxxxxx"
                    className="bg-muted/50"
                  />
                  {phoneChanged && !phoneVerified && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSendOtp}
                      disabled={otpSending || cooldown > 0 || phoneOtpStep === "verifying"}
                      className="shrink-0"
                    >
                      {otpSending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : cooldown > 0 ? (
                        `${cooldown}s`
                      ) : (
                        "Kirim OTP"
                      )}
                    </Button>
                  )}
                  {phoneVerified && (
                    <ShieldCheck className="w-5 h-5 text-success shrink-0" />
                  )}
                </div>

                {/* OTP Input */}
                {phoneOtpStep === "verifying" && (
                  <div className="space-y-3 p-3 bg-muted/30 rounded-lg border border-border/50 mt-2">
                    <p className="text-xs text-muted-foreground">
                      Masukkan 6 digit kode OTP yang dikirim ke <strong>{editPhone}</strong>
                    </p>
                    <div className="flex justify-center">
                      <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1" onClick={handleVerifyOtp} disabled={otpVerifying || otpCode.length !== 6}>
                        {otpVerifying ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <ShieldCheck className="w-4 h-4 mr-1" />}
                        Verifikasi
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setPhoneOtpStep("idle"); setOtpCode(""); }}>
                        Batal
                      </Button>
                    </div>
                    {cooldown > 0 && (
                      <p className="text-xs text-muted-foreground text-center">
                        Kirim ulang dalam {cooldown} detik
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" onClick={handleSaveProfile}>
                  <Save className="w-4 h-4 mr-2" />Simpan
                </Button>
                <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Password Baru</Label>
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Masukkan password baru" className="bg-muted/50" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Konfirmasi Password</Label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Ulangi password baru" className="bg-muted/50" />
              </div>
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" onClick={handleChangePassword}><Save className="w-4 h-4 mr-2" />Simpan Password</Button>
                <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileDialog;
