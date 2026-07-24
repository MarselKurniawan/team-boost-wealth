import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Eye, EyeOff, Phone, Lock, Loader2, Leaf, Gift } from "lucide-react";
import { z } from "zod";
import ForgotPasswordFlow from "@/components/ForgotPasswordFlow";
import brandLogo from "@/assets/logo.png";

const phoneSchema = z
  .string()
  .min(10, "Nomor WhatsApp minimal 10 digit")
  .regex(/^[0-9+]+$/, "Format nomor tidak valid");
const passwordSchema = z.string().min(1, "Kata sandi tidak boleh kosong");

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, loading, signIn, signUp } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/");
  }, [loading, user, navigate]);

  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [registerPhone, setRegisterPhone] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [referralCode, setReferralCode] = useState(searchParams.get("ref") || "");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      phoneSchema.parse(loginPhone);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: "Error", description: error.errors[0].message, variant: "destructive" });
        return;
      }
    }
    try {
      passwordSchema.parse(loginPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: "Error", description: error.errors[0].message, variant: "destructive" });
        return;
      }
    }
    setIsLoading(true);
    const { error } = await signIn(loginPhone, loginPassword);
    setIsLoading(false);
    if (error) {
      toast({
        title: "Login Gagal",
        description:
          error.message === "Invalid login credentials" ? "Nomor WhatsApp atau password salah" : error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Login Berhasil!", description: "Selamat datang kembali di Terracycle" });
    navigate("/");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      phoneSchema.parse(registerPhone);
      passwordSchema.parse(registerPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: "Error", description: error.errors[0].message, variant: "destructive" });
        return;
      }
    }

    setIsLoading(true);

    // Check password against known data breaches before creating the account
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
          setIsLoading(false);
          return;
        }
      }
    } catch (hibpErr) {
      console.warn("HIBP check skipped:", hibpErr);
    }

    try {
      const { error } = await signUp(registerPhone, registerPassword, registerPhone, referralCode || undefined);
      if (error) {
        let errorMessage = error.message;
        if (error.message.includes("already registered")) errorMessage = "Nomor sudah terdaftar. Silakan login.";
        toast({ title: "Registrasi Gagal", description: errorMessage, variant: "destructive" });
        setIsLoading(false);
        return;
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
        <div className="animate-pulse text-emerald-600 text-sm">Memuat...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-10 bg-gradient-to-b from-emerald-50 via-emerald-50 to-green-100">
      <div className="w-full max-w-[400px]">
        <div className="bg-white shadow-xl shadow-emerald-900/10 rounded-3xl overflow-hidden">
          {/* Gradient header */}
          <div className="relative bg-gradient-to-br from-emerald-500 via-emerald-600 to-green-700 px-6 pt-7 pb-12 text-white overflow-hidden">
            <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute top-10 right-14 w-16 h-16 rounded-full bg-white/10" />

            <p className="text-[11px] font-semibold tracking-widest uppercase text-white/70 relative z-10">
              Terracycle
            </p>
            <h1 className="text-2xl font-bold mt-1 relative z-10">Selamat Datang</h1>
            <p className="text-sm text-white/80 mt-1 relative z-10">
              Masuk atau daftar untuk mulai daur ulang
            </p>
          </div>

          {/* Floating logo badge straddling header/body */}
          <div className="relative">
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-16 h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center ring-1 ring-black/5">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center overflow-hidden p-1.5">
                <img src={brandLogo} alt="Terracycle" className="w-full h-full object-contain" />
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 pt-12 pb-7">
            {showForgotPassword ? (
              <ForgotPasswordFlow onBack={() => setShowForgotPassword(false)} />
            ) : (
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-5 bg-emerald-50 h-11 rounded-full p-1">
                  <TabsTrigger
                    value="login"
                    className="text-xs h-9 rounded-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:to-green-700 data-[state=active]:text-white data-[state=active]:shadow-md font-semibold"
                  >
                    Masuk
                  </TabsTrigger>
                  <TabsTrigger
                    id="tab-register-trigger"
                    value="register"
                    className="text-xs h-9 rounded-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:to-green-700 data-[state=active]:text-white data-[state=active]:shadow-md font-semibold"
                  >
                    Daftar
                  </TabsTrigger>
                </TabsList>

                {/* Login */}
                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-3.5">
                    <div className="space-y-1.5">
                      <Label htmlFor="login-phone" className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                        <Phone className="w-3.5 h-3.5" /> Nomor WhatsApp
                      </Label>
                      <Input
                        id="login-phone"
                        type="tel"
                        placeholder="08123456789"
                        value={loginPhone}
                        onChange={(e) => setLoginPhone(e.target.value)}
                        required
                        className="bg-emerald-50/40 border-emerald-100 h-11 text-sm rounded-full px-4 focus-visible:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="login-password" className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                        <Lock className="w-3.5 h-3.5" /> Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="login-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Masukkan password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          required
                          className="bg-emerald-50/40 border-emerald-100 h-11 text-sm rounded-full px-4 pr-11 focus-visible:ring-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-400 hover:text-emerald-700"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-3 flex items-center gap-2.5">
                      <Leaf className="w-4 h-4 text-emerald-600 shrink-0" />
                      <p className="text-[11px] text-emerald-700 leading-relaxed">
                        Masuk untuk melanjutkan aktivitas daur ulang Anda.
                      </p>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-12 text-sm rounded-full bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 font-semibold shadow-md shadow-emerald-900/10"
                      disabled={isLoading}
                    >
                      {isLoading ? "Memproses..." : "Masuk"}
                    </Button>

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-xs text-emerald-600 hover:underline font-medium"
                      >
                        Lupa Password?
                      </button>
                    </div>
                  </form>
                </TabsContent>

                {/* Register */}
                <TabsContent value="register">
                  <form onSubmit={handleRegister} className="space-y-3.5">
                    <div className="space-y-1.5">
                      <Label htmlFor="register-phone" className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                        <Phone className="w-3.5 h-3.5" />
                        Nomor WhatsApp
                      </Label>
                      <Input
                        id="register-phone"
                        type="tel"
                        placeholder="08123456789"
                        value={registerPhone}
                        onChange={(e) => setRegisterPhone(e.target.value)}
                        required
                        className="bg-emerald-50/40 border-emerald-100 h-11 text-sm rounded-full px-4 focus-visible:ring-emerald-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="register-password" className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                        <Lock className="w-3.5 h-3.5" />
                        Kata Sandi
                      </Label>
                      <div className="relative">
                        <Input
                          id="register-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Masukkan kata sandi"
                          value={registerPassword}
                          onChange={(e) => setRegisterPassword(e.target.value)}
                          required
                          className="bg-emerald-50/40 border-emerald-100 h-11 text-sm rounded-full px-4 pr-11 focus-visible:ring-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-400 hover:text-emerald-700"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="referral-code" className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                        <Gift className="w-3.5 h-3.5" />
                        Kode Undangan
                      </Label>
                      <Input
                        id="referral-code"
                        type="text"
                        placeholder="Masukkan kode undangan"
                        value={referralCode}
                        onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                        required
                        className="bg-emerald-50/40 border-emerald-100 h-11 text-sm rounded-full px-4 focus-visible:ring-emerald-500"
                      />
                    </div>

                    <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-3 flex items-center gap-2.5">
                      <Leaf className="w-4 h-4 text-emerald-600 shrink-0" />
                      <p className="text-[11px] text-emerald-700 leading-relaxed">
                        Gunakan kombinasi huruf & angka untuk kata sandi yang lebih aman.
                      </p>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-12 text-sm rounded-full bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 font-semibold shadow-md shadow-emerald-900/10"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Memproses...
                        </>
                      ) : (
                        "Daftar"
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>

        <div className="mt-5 text-center text-[11px] text-emerald-800/70 space-x-3">
          <a href="/about" className="hover:underline">
            Tentang
          </a>
          <span>·</span>
          <a href="/contact" className="hover:underline">
            Kontak
          </a>
          <span>·</span>
          <a href="/privacy-policy" className="hover:underline">
            Kebijakan Privasi
          </a>
          <span>·</span>
          <a href="/terms-of-service" className="hover:underline">
            Syarat
          </a>
        </div>
      </div>
    </div>
  );
};

export default Auth;
