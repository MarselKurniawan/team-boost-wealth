import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, TrendingUp, Shield, Users, Sparkles, Zap, Phone, Mail, Loader2, Landmark, Check, ChevronsUpDown } from "lucide-react";
import { z } from "zod";
import ForgotPasswordFlow from "@/components/ForgotPasswordFlow";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import appLogo from "@/assets/logo.png";

const BANK_OPTIONS = [
  { group: "Bank", items: ["BCA", "Mandiri", "BRI", "BNI", "BTN", "CIMB Niaga", "Permata", "Danamon", "BSI", "Maybank", "Panin", "OCBC NISP", "Mega", "BTPN", "Bank Jago", "SeaBank", "Allo Bank", "Neo Commerce", "Bank Sinarmas", "HSBC"] },
  { group: "E-Wallet", items: ["DANA", "OVO", "GoPay", "ShopeePay", "LinkAja", "Sakuku", "Jenius Pay", "i.saku"] },
];
const ALL_BANKS = BANK_OPTIONS.flatMap(g => g.items);

// OTP aktif - kirim & verifikasi via Fonnte WhatsApp
const DEV_SKIP_OTP = false;

const phoneSchema = z.string().min(10, "Nomor WhatsApp minimal 10 digit").regex(/^[0-9+]+$/, "Format nomor tidak valid");
const passwordSchema = z.string().min(1, "Kata sandi tidak boleh kosong");

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, loading, signIn, signUp } = useAuth();
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Captcha verification state
  const [otpStep, setOtpStep] = useState<'form' | 'otp'>('form');
  const [otpCode, setOtpCode] = useState("");
  const [captchaCode, setCaptchaCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);

  // Redirect to home only when authenticated
  useEffect(() => {
    if (!loading && user) navigate("/");
  }, [loading, user, navigate]);

  // OTP countdown timer
  useEffect(() => {
    if (otpCountdown <= 0) return;
    const timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [otpCountdown]);

  // Login form state
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register form state — sesuai requirement
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [referralCode, setReferralCode] = useState(searchParams.get("ref") || "");
  const [bankName, setBankName] = useState("");
  const [bankHolder, setBankHolder] = useState("");
  const [bankNumber, setBankNumber] = useState("");
  // alias untuk re-use existing logic
  const registerName = bankHolder;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      phoneSchema.parse(loginPhone);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
        return;
      }
    }

    try {
      passwordSchema.parse(loginPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
        return;
      }
    }

    setIsLoading(true);
    const { error } = await signIn(loginPhone, loginPassword);
    setIsLoading(false);

    if (error) {
      toast({
        title: "Login Gagal",
        description: error.message === "Invalid login credentials" 
          ? "Nomor WhatsApp atau password salah" 
          : error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Login Berhasil!",
      description: "Selamat datang kembali di InvestPro",
    });
    navigate("/");
  };

  const generateCaptcha = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  };

  const handleSendOtp = async () => {
    try {
      phoneSchema.parse(registerPhone);
      passwordSchema.parse(registerPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: "Error", description: error.errors[0].message, variant: "destructive" });
        return;
      }
    }

    if (!bankName.trim() || !bankHolder.trim() || !bankNumber.trim()) {
      toast({ title: "Error", description: "Data bank harus diisi lengkap", variant: "destructive" });
      return;
    }

    setOtpSending(true);
    try {
      // HIBP password leak check
      try {
        const enc = new TextEncoder().encode(registerPassword);
        const hashBuf = await crypto.subtle.digest("SHA-1", enc);
        const hashHex = Array.from(new Uint8Array(hashBuf))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")
          .toUpperCase();
        const prefix = hashHex.slice(0, 5);
        const suffix = hashHex.slice(5);
        const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
        if (res.ok) {
          const text = await res.text();
          const leaked = text.split("\n").some((line) => line.split(":")[0].trim() === suffix);
          if (leaked) {
            toast({
              title: "Password Tidak Aman",
              description: "Password ini pernah bocor di kebocoran data publik. Silakan pakai password lain.",
              variant: "destructive",
            });
            setOtpSending(false);
            return;
          }
        }
      } catch (hibpErr) {
        console.warn("HIBP check skipped:", hibpErr);
      }

      // Captcha lokal — ganti OTP WhatsApp
      setCaptchaCode(generateCaptcha());
      setOtpCode("");
      setOtpStep('otp');
    } catch (err) {
      toast({ title: "Error", description: "Terjadi kesalahan", variant: "destructive" });
    }
    setOtpSending(false);
  };

  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (otpCode.trim().toUpperCase() !== captchaCode) {
      toast({ title: "Captcha Salah", description: "Kode yang dimasukkan tidak sesuai", variant: "destructive" });
      setCaptchaCode(generateCaptcha());
      setOtpCode("");
      return;
    }

    setIsLoading(true);
    try {

      // OTP verified, proceed with registration
      const { error, userId } = await signUp(registerPhone, registerPassword, registerName, referralCode || undefined);

      if (error) {
        let errorMessage = error.message;
        if (error.message.includes("already registered")) {
          errorMessage = "Nomor sudah terdaftar. Silakan login.";
        }
        toast({ title: "Registrasi Gagal", description: errorMessage, variant: "destructive" });
        setIsLoading(false);
        return;
      }

      // Simpan rekening bank otomatis
      let bankUserId = userId;
      if (!bankUserId) {
        const { data: { user: u } } = await supabase.auth.getUser();
        bankUserId = u?.id;
      }
      if (bankUserId) {
        const { error: bankErr } = await supabase.from("bank_accounts").insert({
          user_id: bankUserId,
          account_type: "bank",
          provider: bankName.trim(),
          account_name: bankHolder.trim(),
          account_number: bankNumber.trim(),
        });
        if (bankErr) console.error("Gagal simpan rekening:", bankErr);
      }

      toast({ title: "Registrasi Berhasil!", description: "Akun Anda telah dibuat. Selamat berinvestasi!" });
      navigate("/");
    } catch (err) {
      toast({ title: "Error", description: "Terjadi kesalahan", variant: "destructive" });
    }
    setIsLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary">Memuat...</div>
      </div>
    );
  }

  return (
    <div className="dark min-h-screen bg-background text-foreground flex relative overflow-hidden">
      {/* Background decorations */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-accent/20 rounded-full blur-3xl" />
      </div>

      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/15 via-card to-accent/15 p-12 flex-col justify-between relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <img src={appLogo} alt="InvestPro" className="w-10 h-10 rounded-lg object-contain bg-white/5 p-1" />
            <h1 className="font-heading text-4xl font-bold text-foreground">
              InvestPro
            </h1>
          </div>
          <p className="text-muted-foreground">Robot AI Humanoid Platform</p>
        </div>

        <div className="relative z-10 space-y-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-foreground font-semibold text-lg">Return Tinggi</h3>
              <p className="text-muted-foreground text-sm">Dapatkan keuntungan hingga 10% per hari</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-success/20 border border-success/30 flex items-center justify-center">
              <Shield className="w-6 h-6 text-success" />
            </div>
            <div>
              <h3 className="text-foreground font-semibold text-lg">Aman & Terpercaya</h3>
              <p className="text-muted-foreground text-sm">Dilindungi sistem keamanan berlapis</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-secondary/20 border border-secondary/30 flex items-center justify-center">
              <Users className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <h3 className="text-foreground font-semibold text-lg">Bonus Referral</h3>
              <p className="text-muted-foreground text-sm">Ajak teman dan dapatkan komisi hingga 10%</p>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-muted-foreground text-sm">© 2024 InvestPro. All rights reserved.</p>
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative z-10">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-1">
              <img src={appLogo} alt="InvestPro" className="w-9 h-9 rounded-lg object-contain bg-white/5 p-1" />
              <h1 className="font-heading text-3xl font-bold text-foreground">InvestPro</h1>
            </div>
            <p className="text-muted-foreground text-sm">Robot AI Humanoid Platform</p>
          </div>

          <Card className="border-border/50 shadow-card">
            <CardHeader className="space-y-1 pb-3">
              <CardTitle className="text-base font-heading flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-primary" />
                Selamat Datang
              </CardTitle>
              <CardDescription className="text-[11px]">Masuk atau daftar untuk mulai berinvestasi</CardDescription>
            </CardHeader>
            <CardContent className="text-xs">
              {showForgotPassword ? (
                <ForgotPasswordFlow onBack={() => setShowForgotPassword(false)} />
              ) : (
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted h-8">
                  <TabsTrigger value="login" className="text-[11px] h-6">Masuk</TabsTrigger>
                  <TabsTrigger value="register" className="text-[11px] h-6">Daftar</TabsTrigger>
                </TabsList>

                {/* Login Tab */}
                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="login-phone" className="flex items-center gap-1 text-[11px]">
                        <Phone className="w-3 h-3" />
                        Nomor WhatsApp
                      </Label>
                      <Input
                        id="login-phone"
                        type="tel"
                        placeholder="08123456789"
                        value={loginPhone}
                        onChange={(e) => setLoginPhone(e.target.value)}
                        required
                        className="bg-muted/50 h-9 text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="login-password" className="text-[11px]">Password</Label>
                      <div className="relative">
                        <Input
                          id="login-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Masukkan password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          required
                          className="bg-muted/50 h-9 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <Button type="submit" className="w-full h-9 text-xs" disabled={isLoading}>
                      {isLoading ? "Memproses..." : "Masuk"}
                    </Button>

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-[11px] text-primary hover:text-primary/80 transition-colors"
                      >
                        Lupa Password?
                      </button>
                    </div>
                  </form>
                </TabsContent>

                {/* Register Tab */}
                <TabsContent value="register">
                  {otpStep === 'form' ? (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="register-phone" className="flex items-center gap-1 text-[11px]"><Phone className="w-3 h-3" />Nomor Telepon</Label>
                        <Input id="register-phone" type="tel" placeholder="08123456789" value={registerPhone} onChange={(e) => setRegisterPhone(e.target.value)} required className="bg-muted/50 h-9 text-xs" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="register-password" className="text-[11px]">Kata Sandi</Label>
                        <div className="relative">
                          <Input id="register-password" type={showPassword ? "text" : "password"} placeholder="Masukkan kata sandi" value={registerPassword} onChange={(e) => setRegisterPassword(e.target.value)} required className="bg-muted/50 h-9 text-xs" />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="referral-code" className="text-[11px]">Kode Undangan</Label>
                        <Input id="referral-code" type="text" placeholder="Masukkan kode undangan" value={referralCode} onChange={(e) => setReferralCode(e.target.value.toUpperCase())} required className="bg-muted/50 h-9 text-xs" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="bank-name" className="flex items-center gap-1 text-[11px]"><Landmark className="w-3 h-3" />Nama Bank / E-Wallet</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button type="button" variant="outline" role="combobox" className={cn("w-full justify-between bg-muted/50 font-normal h-9 text-xs", !bankName && "text-muted-foreground")}>
                              {bankName || "Pilih bank atau e-wallet..."}
                              <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Cari bank/e-wallet..." className="text-xs" />
                              <CommandList>
                                <CommandEmpty className="text-xs py-4 text-center">Tidak ditemukan.</CommandEmpty>
                                {BANK_OPTIONS.map((g) => (
                                  <CommandGroup key={g.group} heading={g.group}>
                                    {g.items.map((b) => (
                                      <CommandItem key={b} value={b} className="text-xs" onSelect={(v) => setBankName(ALL_BANKS.find(x => x.toLowerCase() === v.toLowerCase()) || v)}>
                                        <Check className={cn("mr-2 h-3.5 w-3.5", bankName === b ? "opacity-100" : "opacity-0")} />
                                        {b}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                ))}
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="bank-holder" className="text-[11px]">Pemegang Rekening Bank</Label>
                        <Input id="bank-holder" type="text" placeholder="Nama sesuai rekening" value={bankHolder} onChange={(e) => setBankHolder(e.target.value)} required className="bg-muted/50 h-9 text-xs" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="bank-number" className="text-[11px]">Nomor Rekening Bank</Label>
                        <Input id="bank-number" type="text" inputMode="numeric" placeholder="Nomor rekening" value={bankNumber} onChange={(e) => setBankNumber(e.target.value.replace(/[^0-9]/g, ''))} required className="bg-muted/50 h-9 text-xs" />
                      </div>
                      <Button type="button" className="w-full h-9 text-xs" disabled={otpSending} onClick={handleSendOtp}>
                        {otpSending ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Memproses...</> : "Lanjut ke Verifikasi"}
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleVerifyAndRegister} className="space-y-3">
                      <div className="text-center space-y-1.5 mb-3">
                        <Shield className="w-8 h-8 text-primary mx-auto" />
                        <p className="text-[11px] text-muted-foreground">
                          Verifikasi bahwa Anda bukan robot. Ketik ulang kode di bawah.
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px]">Kode Captcha</Label>
                        <div className="flex items-center gap-2">
                          <div
                            className="flex-1 select-none text-center font-mono text-xl font-bold tracking-[0.4em] py-2.5 rounded-md border border-border bg-gradient-to-br from-muted via-muted/60 to-muted/40 text-foreground"
                            style={{
                              backgroundImage:
                                "repeating-linear-gradient(45deg, hsl(var(--muted-foreground)/0.08) 0 2px, transparent 2px 8px)",
                              letterSpacing: "0.4em",
                              textShadow: "1px 1px 0 hsl(var(--muted-foreground)/0.25)",
                            }}
                          >
                            {captchaCode}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => { setCaptchaCode(generateCaptcha()); setOtpCode(""); }}
                            className="h-10 px-2 text-[11px]"
                          >
                            ↻
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="otp-code" className="text-[11px]">Masukkan Kode di Atas</Label>
                        <Input
                          id="otp-code"
                          type="text"
                          placeholder="Ketik kode captcha"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.toUpperCase().slice(0, 6))}
                          maxLength={6}
                          className="bg-muted/50 text-center text-lg tracking-widest font-mono h-10 uppercase"
                          autoFocus
                        />
                      </div>
                      <Button type="submit" className="w-full h-9 text-xs" disabled={isLoading}>
                        {isLoading ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Memverifikasi...</> : "Verifikasi & Daftar"}
                      </Button>
                      <div className="text-left text-[11px]">
                        <button type="button" onClick={() => { setOtpStep('form'); setOtpCode(''); }} className="text-muted-foreground hover:text-foreground transition-colors">
                          ← Kembali
                        </button>
                      </div>
                    </form>
                  )}
                </TabsContent>
              </Tabs>
              )}
            </CardContent>
          </Card>

          <div className="mt-4 text-center text-[10px] text-muted-foreground space-x-3">
            <a href="/about" className="hover:text-foreground">Tentang</a>
            <span>·</span>
            <a href="/contact" className="hover:text-foreground">Kontak</a>
            <span>·</span>
            <a href="/privacy-policy" className="hover:text-foreground">Kebijakan Privasi</a>
            <span>·</span>
            <a href="/terms-of-service" className="hover:text-foreground">Syarat & Ketentuan</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
