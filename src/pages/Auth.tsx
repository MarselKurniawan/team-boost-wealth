import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Shield, Phone, Loader2, Landmark, Check, ChevronsUpDown } from "lucide-react";
import { z } from "zod";
import ForgotPasswordFlow from "@/components/ForgotPasswordFlow";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import brandLogo from "@/assets/logo.png";

const BANK_OPTIONS = [
  { group: "Bank", items: ["BCA", "Mandiri", "BRI", "BNI", "BTN", "CIMB Niaga", "Permata", "Danamon", "BSI", "Maybank", "Panin", "OCBC NISP", "Mega", "BTPN", "Bank Jago", "SeaBank", "Allo Bank", "Neo Commerce", "Bank Sinarmas", "HSBC"] },
  { group: "E-Wallet", items: ["DANA", "OVO", "GoPay", "ShopeePay", "LinkAja", "Sakuku", "Jenius Pay", "i.saku"] },
];
const ALL_BANKS = BANK_OPTIONS.flatMap((g) => g.items);

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

  const [otpStep, setOtpStep] = useState<"form" | "otp">("form");
  const [otpCode, setOtpCode] = useState("");
  const [captchaCode, setCaptchaCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/");
  }, [loading, user, navigate]);

  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [registerPhone, setRegisterPhone] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [referralCode, setReferralCode] = useState(searchParams.get("ref") || "");
  const [bankName, setBankName] = useState("");
  const [bankHolder, setBankHolder] = useState("");
  const [bankNumber, setBankNumber] = useState("");
  const registerName = bankHolder;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try { phoneSchema.parse(loginPhone); } catch (error) {
      if (error instanceof z.ZodError) { toast({ title: "Error", description: error.errors[0].message, variant: "destructive" }); return; }
    }
    try { passwordSchema.parse(loginPassword); } catch (error) {
      if (error instanceof z.ZodError) { toast({ title: "Error", description: error.errors[0].message, variant: "destructive" }); return; }
    }
    setIsLoading(true);
    const { error } = await signIn(loginPhone, loginPassword);
    setIsLoading(false);
    if (error) {
      toast({ title: "Login Gagal", description: error.message === "Invalid login credentials" ? "Nomor WhatsApp atau password salah" : error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Login Berhasil!", description: "Selamat datang kembali di Terracycle" });
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
      if (error instanceof z.ZodError) { toast({ title: "Error", description: error.errors[0].message, variant: "destructive" }); return; }
    }
    if (!bankName.trim() || !bankHolder.trim() || !bankNumber.trim()) {
      toast({ title: "Error", description: "Data bank harus diisi lengkap", variant: "destructive" });
      return;
    }
    setOtpSending(true);
    try {
      try {
        const enc = new TextEncoder().encode(registerPassword);
        const hashBuf = await crypto.subtle.digest("SHA-1", enc);
        const hashHex = Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
        const prefix = hashHex.slice(0, 5);
        const suffix = hashHex.slice(5);
        const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
        if (res.ok) {
          const text = await res.text();
          const leaked = text.split("\n").some((line) => line.split(":")[0].trim() === suffix);
          if (leaked) {
            toast({ title: "Password Tidak Aman", description: "Password ini pernah bocor di kebocoran data publik. Silakan pakai password lain.", variant: "destructive" });
            setOtpSending(false);
            return;
          }
        }
      } catch (hibpErr) { console.warn("HIBP check skipped:", hibpErr); }
      setCaptchaCode(generateCaptcha());
      setOtpCode("");
      setOtpStep("otp");
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
      const { error, userId } = await signUp(registerPhone, registerPassword, registerName, referralCode || undefined);
      if (error) {
        let errorMessage = error.message;
        if (error.message.includes("already registered")) errorMessage = "Nomor sudah terdaftar. Silakan login.";
        toast({ title: "Registrasi Gagal", description: errorMessage, variant: "destructive" });
        setIsLoading(false);
        return;
      }
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
      toast({ title: "Registrasi Berhasil!", description: "Akun Anda telah dibuat. Selamat bergabung!" });
      navigate("/");
    } catch (err) {
      toast({ title: "Error", description: "Terjadi kesalahan", variant: "destructive" });
    }
    setIsLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse text-[#2557D6] text-sm">Memuat...</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center px-4 py-8"
      style={{ background: "linear-gradient(180deg, #EAF2FE 0%, #DCE9FC 40%, #C7DAF7 100%)" }}
    >
      {/* Ambient sun */}
      <div className="absolute top-16 right-1/2 translate-x-[180px] w-40 h-40 rounded-full bg-white/70 blur-3xl pointer-events-none" />
      <div className="absolute top-20 right-1/2 translate-x-[160px] w-24 h-24 rounded-full bg-white/80 blur-xl pointer-events-none" />

      {/* Mountains layered at bottom */}
      <svg className="absolute inset-x-0 bottom-0 w-full h-[52vh] pointer-events-none" viewBox="0 0 1440 600" preserveAspectRatio="none" aria-hidden>
        {/* Furthest range */}
        <path d="M0,420 L180,260 L340,360 L520,220 L720,340 L900,240 L1120,360 L1300,260 L1440,340 L1440,600 L0,600 Z" fill="#B5CBEE" opacity="0.7" />
        {/* Mid range */}
        <path d="M0,470 L140,340 L320,430 L520,310 L720,420 L920,320 L1140,430 L1320,340 L1440,420 L1440,600 L0,600 Z" fill="#8AA9DE" opacity="0.85" />
        {/* Near range */}
        <path d="M0,540 L120,420 L300,510 L500,400 L720,500 L940,410 L1160,510 L1340,420 L1440,500 L1440,600 L0,600 Z" fill="#5F86C9" />
        {/* Foreground water/plateau */}
        <path d="M0,570 L1440,570 L1440,600 L0,600 Z" fill="#3A66B4" />
      </svg>

      {/* Auth Card */}
      <div className="relative z-10 w-full max-w-[400px]">
        <div className="bg-white/85 backdrop-blur-xl border border-white shadow-[0_20px_60px_-15px_rgba(37,87,214,0.35)] rounded-3xl p-7">
          {/* Logo */}
          <div className="flex flex-col items-center mb-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#2F6BE8] to-[#1E48BF] flex items-center justify-center p-2 shadow-lg shadow-blue-500/30 mb-2.5">
              <img src={brandLogo} alt="Terracycle" className="w-full h-full object-contain" />
            </div>
            <span className="font-heading text-lg font-bold tracking-tight text-[#1E48BF]">TERRACYCLE</span>
            <span className="text-[10px] text-slate-500 mt-0.5 tracking-widest uppercase">Daur Ulang · Berkelanjutan</span>
          </div>

          {showForgotPassword ? (
            <ForgotPasswordFlow onBack={() => setShowForgotPassword(false)} />
          ) : (
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-5 bg-slate-100 h-10 rounded-full p-1">
                <TabsTrigger value="login" className="text-xs h-8 rounded-full data-[state=active]:bg-[#2557D6] data-[state=active]:text-white data-[state=active]:shadow-md">
                  Masuk
                </TabsTrigger>
                <TabsTrigger id="tab-register-trigger" value="register" className="text-xs h-8 rounded-full data-[state=active]:bg-[#2557D6] data-[state=active]:text-white data-[state=active]:shadow-md">
                  Daftar
                </TabsTrigger>
              </TabsList>

              {/* Login */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="login-phone" className="flex items-center gap-1 text-[11px] text-slate-600">
                      <Phone className="w-3 h-3" /> Nomor WhatsApp
                    </Label>
                    <Input id="login-phone" type="tel" placeholder="08123456789" value={loginPhone} onChange={(e) => setLoginPhone(e.target.value)} required className="bg-white/70 border-slate-200 h-10 text-xs rounded-xl focus-visible:ring-[#2557D6]" />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="login-password" className="text-[11px] text-slate-600">Password</Label>
                    <div className="relative">
                      <Input id="login-password" type={showPassword ? "text" : "password"} placeholder="Masukkan password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required className="bg-white/70 border-slate-200 h-10 text-xs rounded-xl focus-visible:ring-[#2557D6] pr-9" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full h-10 text-xs rounded-xl bg-gradient-to-r from-[#2F6BE8] to-[#1E48BF] hover:opacity-95 shadow-md shadow-blue-500/30" disabled={isLoading}>
                    {isLoading ? "Memproses..." : "Masuk"}
                  </Button>

                  <div className="text-center">
                    <button type="button" onClick={() => setShowForgotPassword(true)} className="text-[11px] text-[#2557D6] hover:underline">
                      Lupa Password?
                    </button>
                  </div>
                </form>
              </TabsContent>

              {/* Register */}
              <TabsContent value="register">
                {otpStep === "form" ? (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="register-phone" className="flex items-center gap-1 text-[11px] text-slate-600"><Phone className="w-3 h-3" />Nomor WhatsApp</Label>
                      <Input id="register-phone" type="tel" placeholder="08123456789" value={registerPhone} onChange={(e) => setRegisterPhone(e.target.value)} required className="bg-white/70 border-slate-200 h-10 text-xs rounded-xl focus-visible:ring-[#2557D6]" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="register-password" className="text-[11px] text-slate-600">Kata Sandi</Label>
                      <div className="relative">
                        <Input id="register-password" type={showPassword ? "text" : "password"} placeholder="Masukkan kata sandi" value={registerPassword} onChange={(e) => setRegisterPassword(e.target.value)} required className="bg-white/70 border-slate-200 h-10 text-xs rounded-xl focus-visible:ring-[#2557D6] pr-9" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="referral-code" className="text-[11px] text-slate-600">Kode Undangan</Label>
                      <Input id="referral-code" type="text" placeholder="Masukkan kode undangan" value={referralCode} onChange={(e) => setReferralCode(e.target.value.toUpperCase())} required className="bg-white/70 border-slate-200 h-10 text-xs rounded-xl focus-visible:ring-[#2557D6]" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1 text-[11px] text-slate-600"><Landmark className="w-3 h-3" />Nama Bank / E-Wallet</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button type="button" variant="outline" role="combobox" className={cn("w-full justify-between bg-white/70 border-slate-200 h-10 text-xs rounded-xl font-normal", !bankName && "text-slate-400")}>
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
                                    <CommandItem key={b} value={b} className="text-xs" onSelect={(v) => setBankName(ALL_BANKS.find((x) => x.toLowerCase() === v.toLowerCase()) || v)}>
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
                      <Label htmlFor="bank-holder" className="text-[11px] text-slate-600">Pemegang Rekening</Label>
                      <Input id="bank-holder" type="text" placeholder="Nama sesuai rekening" value={bankHolder} onChange={(e) => setBankHolder(e.target.value)} required className="bg-white/70 border-slate-200 h-10 text-xs rounded-xl focus-visible:ring-[#2557D6]" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="bank-number" className="text-[11px] text-slate-600">Nomor Rekening</Label>
                      <Input id="bank-number" type="text" inputMode="numeric" placeholder="Nomor rekening" value={bankNumber} onChange={(e) => setBankNumber(e.target.value.replace(/[^0-9]/g, ""))} required className="bg-white/70 border-slate-200 h-10 text-xs rounded-xl focus-visible:ring-[#2557D6]" />
                    </div>
                    <Button type="button" className="w-full h-10 text-xs rounded-xl bg-gradient-to-r from-[#2F6BE8] to-[#1E48BF] hover:opacity-95 shadow-md shadow-blue-500/30" disabled={otpSending} onClick={handleSendOtp}>
                      {otpSending ? (<><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Memproses...</>) : "Lanjut ke Verifikasi"}
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleVerifyAndRegister} className="space-y-3">
                    <div className="text-center space-y-1.5 mb-3">
                      <Shield className="w-8 h-8 text-[#2557D6] mx-auto" />
                      <p className="text-[11px] text-slate-500">Verifikasi bahwa Anda bukan robot. Ketik ulang kode di bawah.</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-slate-600">Kode Captcha</Label>
                      <div className="flex items-center gap-2">
                        <div
                          className="flex-1 select-none text-center font-mono text-xl font-bold tracking-[0.4em] py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800"
                          style={{
                            backgroundImage: "repeating-linear-gradient(45deg, rgba(37,87,214,0.08) 0 2px, transparent 2px 8px)",
                            letterSpacing: "0.4em",
                            textShadow: "1px 1px 0 rgba(37,87,214,0.25)",
                          }}
                        >
                          {captchaCode}
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={() => { setCaptchaCode(generateCaptcha()); setOtpCode(""); }} className="h-10 px-2 text-[11px] rounded-xl">↻</Button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="otp-code" className="text-[11px] text-slate-600">Masukkan Kode di Atas</Label>
                      <Input id="otp-code" type="text" placeholder="Ketik kode captcha" value={otpCode} onChange={(e) => setOtpCode(e.target.value.toUpperCase().slice(0, 6))} maxLength={6} className="bg-white/70 text-center text-lg tracking-widest font-mono h-11 uppercase rounded-xl border-slate-200" autoFocus />
                    </div>
                    <Button type="submit" className="w-full h-10 text-xs rounded-xl bg-gradient-to-r from-[#2F6BE8] to-[#1E48BF] hover:opacity-95 shadow-md shadow-blue-500/30" disabled={isLoading}>
                      {isLoading ? (<><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Memverifikasi...</>) : "Verifikasi & Daftar"}
                    </Button>
                    <div className="text-left text-[11px]">
                      <button type="button" onClick={() => { setOtpStep("form"); setOtpCode(""); }} className="text-slate-500 hover:text-slate-800">← Kembali</button>
                    </div>
                  </form>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>

        <div className="mt-4 text-center text-[10px] text-white/90 space-x-3 drop-shadow">
          <a href="/about" className="hover:underline">Tentang</a>
          <span>·</span>
          <a href="/contact" className="hover:underline">Kontak</a>
          <span>·</span>
          <a href="/privacy-policy" className="hover:underline">Kebijakan Privasi</a>
          <span>·</span>
          <a href="/terms-of-service" className="hover:underline">Syarat</a>
        </div>
      </div>
    </div>
  );
};

export default Auth;
