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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse text-[#2563EB] text-sm">Memuat...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 flex">
      {/* Left - Blue welcome panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden text-white" style={{ background: "linear-gradient(160deg, #2F6BE8 0%, #2557D6 55%, #1E48BF 100%)" }}>
        {/* Decorative blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -left-16 w-[420px] h-[420px] rounded-full bg-white/10 blur-3xl" />
          <div className="absolute top-1/3 -right-24 w-[380px] h-[380px] rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-10 left-10 w-24 h-24 rounded-full border border-white/20" />
          <div className="absolute top-24 right-24 w-3 h-3 rounded-full bg-white/70" />
          <div className="absolute bottom-24 right-40 w-2 h-2 rounded-full bg-white/60" />
          <div className="absolute top-1/2 left-8 w-1.5 h-1.5 rounded-full bg-white/50" />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-white/15 backdrop-blur border border-white/30 flex items-center justify-center">
              <span className="font-bold text-lg tracking-tight">I</span>
            </div>
            <span className="font-heading font-bold text-xl tracking-tight">InvestPro</span>
          </div>

          {/* Center illustration */}
          <div className="flex-1 flex items-center justify-center py-10">
            <div className="relative w-[280px] h-[220px]">
              <div className="absolute inset-0 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20" />
              <div className="absolute inset-6 grid grid-cols-3 grid-rows-3 gap-2">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className={cn("border border-white/30 flex items-center justify-center", [0,1,4,7].includes(i) ? "bg-white/20" : "bg-white/5")}>
                    {[0,1,4].includes(i) && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                  </div>
                ))}
              </div>
              <div className="absolute -bottom-3 -right-3 w-16 h-16 rounded-full bg-white/95 flex items-center justify-center shadow-lg">
                <TrendingUp className="w-8 h-8 text-[#2557D6]" strokeWidth={2.5} />
              </div>
              <div className="absolute -top-4 -left-4 w-12 h-12 bg-white/20 rounded flex items-center justify-center border border-white/30">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          {/* Bottom copy */}
          <div>
            <h2 className="font-heading text-4xl font-bold mb-3">Welcome!</h2>
            <p className="text-white/85 text-sm max-w-sm leading-relaxed">
              Platform investasi cerdas berbasis AI. Kelola portofolio, robot, dan pendapatan harian Anda dalam satu tempat.
            </p>
            <div className="flex items-center gap-1.5 mt-6">
              <span className="w-6 h-1.5 bg-white rounded-full" />
              <span className="w-1.5 h-1.5 bg-white/50 rounded-full" />
              <span className="w-1.5 h-1.5 bg-white/50 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Right - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-16 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 flex items-center gap-2.5">
            <div className="w-10 h-10 bg-[#2557D6] flex items-center justify-center text-white">
              <span className="font-bold text-lg">I</span>
            </div>
            <span className="font-heading font-bold text-xl text-slate-900">InvestPro</span>
          </div>


          <div>
            <div className="mb-6">
              <h1 className="font-heading text-4xl font-bold text-[#2557D6] mb-2">Log In</h1>
              <p className="text-sm text-slate-500">
                Belum punya akun?{" "}
                <button
                  type="button"
                  onClick={() => document.getElementById('tab-register-trigger')?.click()}
                  className="text-[#2557D6] font-semibold hover:underline"
                >
                  Buat akun
                </button>
              </p>
              <p className="text-xs text-slate-400 mt-1">Prosesnya kurang dari satu menit.</p>
            </div>
            <div className="text-xs">
              {showForgotPassword ? (
                <ForgotPasswordFlow onBack={() => setShowForgotPassword(false)} />
              ) : (
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-100 h-9 rounded-none p-0.5">
                  <TabsTrigger value="login" className="text-xs h-8 rounded-none data-[state=active]:bg-[#2557D6] data-[state=active]:text-white">Masuk</TabsTrigger>
                  <TabsTrigger id="tab-register-trigger" value="register" className="text-xs h-8 rounded-none data-[state=active]:bg-[#2557D6] data-[state=active]:text-white">Daftar</TabsTrigger>
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
            </div>
          </div>


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
