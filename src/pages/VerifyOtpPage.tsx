import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { authClient, useSession } from "@/lib/auth-client";
import { api } from "@/lib/api";
import { toast } from "sonner";

const styles = `
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
.fade-up { animation: fadeUp 0.45s ease forwards; }
`;

export default function VerifyOtpPage() {
  const navigate = useNavigate();
  const { data: session, isPending } = useSession();

  const email = session?.user?.email || sessionStorage.getItem("verify_email") || "";

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);

  // Poll for the OTP code from the backend and auto-fill it
  useEffect(() => {
    if (!email) return;
    let cancelled = false;
    async function fetchCode() {
      try {
        const res = await api.get<{ otp: string }>(`/api/dev/otp?email=${encodeURIComponent(email)}`);
        if (!cancelled && res?.otp) {
          setDevCode(res.otp);
          setOtp(res.otp); // auto-fill the input
        }
      } catch {
        // ignore
      }
    }
    fetchCode();
    const interval = setInterval(fetchCode, 2000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [email]);

  useEffect(() => {
    if (!isPending && session?.user?.emailVerified) {
      window.location.href = "/wardrobe";
    }
  }, [isPending, session]);

  useEffect(() => {
    if (!isPending && !session?.user && !sessionStorage.getItem("verify_email")) {
      navigate("/login", { replace: true });
    }
  }, [isPending, session, navigate]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) { setError("Please enter the 6-digit code."); return; }
    setError("");
    setLoading(true);
    const { error: err } = await authClient.emailOtp.verifyEmail({ email, otp });
    if (err) { setLoading(false); setError(err.message ?? "Invalid or expired code. Try again."); return; }
    sessionStorage.removeItem("verify_email");
    sessionStorage.removeItem("verify_password");
    toast.success("Email verified! Welcome to Closet Canvas.");
    window.location.href = "/wardrobe";
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resending || !email) return;
    setResending(true);
    setError("");
    try {
      await authClient.emailOtp.sendVerificationOtp({ email, type: "email-verification" });
      toast.success("Verification code resent!");
      setResendCooldown(60);
    } catch {
      toast.error("Failed to resend code. Try again.");
    } finally {
      setResending(false);
    }
  };

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
      <style>{styles}</style>

      <div
        className="pointer-events-none absolute top-0 right-0 w-64 h-64 rounded-full opacity-20"
        style={{ background: "radial-gradient(circle at 70% 30%, #C9A96E 0%, transparent 70%)" }}
      />

      <div className="px-6 pt-14 pb-2 relative z-10">
        <button onClick={() => navigate("/login")} className="flex items-center gap-1.5 text-muted-foreground text-sm font-medium">
          <ArrowLeft size={16} /> Back
        </button>
      </div>

      <div className="px-6 pt-6 pb-8 relative z-10 fade-up">
        <span className="text-xs font-bold tracking-widest uppercase" style={{ color: "#C9A96E" }}>
          Closet Canvas
        </span>
        <h1 className="mt-3 text-foreground" style={{ fontSize: "2.2rem", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
          Verify your{"\n"}email.
        </h1>
        <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
          We sent a 6-digit code to
        </p>
        <p className="text-sm font-semibold truncate max-w-[280px]" style={{ color: "#C9A96E" }}>
          {email || "your email"}
        </p>
        <p className="mt-2 text-muted-foreground text-xs">
          Check your spam folder if you don't see it.
        </p>
        {devCode ? (
          <div
            className="mt-4 rounded-2xl px-5 py-4"
            style={{ background: "linear-gradient(135deg, #C9A96E 0%, #A07850 100%)" }}
          >
            <p className="text-xs font-bold uppercase tracking-widest text-white/80 mb-1">Your verification code</p>
            <p className="font-mono font-black text-4xl tracking-[0.4em] text-white">{devCode}</p>
            <p className="text-xs text-white/70 mt-1">Auto-filled below — just tap Verify</p>
          </div>
        ) : (
          <div
            className="mt-4 rounded-xl px-4 py-3 flex items-center gap-2"
            style={{ background: "rgba(201,169,110,0.08)", border: "1px dashed rgba(201,169,110,0.3)" }}
          >
            <div className="w-4 h-4 rounded-full border-2 border-accent/40 border-t-accent animate-spin shrink-0" />
            <p className="text-xs text-muted-foreground">Fetching your code...</p>
          </div>
        )}
      </div>

      <form onSubmit={handleVerify} className="px-6 flex flex-col gap-4 relative z-10 fade-up" style={{ animationDelay: "0.08s" }}>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5 ml-1">Verification Code</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="000000"
            maxLength={6}
            value={otp}
            onChange={e => { setOtp(e.target.value.replace(/\D/g, "")); setError(""); }}
            autoComplete="one-time-code"
            autoFocus
            disabled={loading}
            className="w-full px-4 py-4 rounded-xl border bg-white/70 text-foreground outline-none transition-all text-center"
            style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "0.35em", borderColor: "hsl(var(--border))" }}
            onFocus={e => { e.currentTarget.style.borderColor = "#C9A96E"; }}
            onBlur={e => { e.currentTarget.style.borderColor = "hsl(var(--border))"; }}
          />
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3">
            <p className="text-destructive text-sm font-medium">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || otp.length < 6}
          className="mt-1 w-full py-4 rounded-2xl text-white font-bold text-base tracking-tight transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, #C9A96E 0%, #A07850 100%)",
            boxShadow: loading || otp.length < 6 ? "none" : "0 6px 24px rgba(201,169,110,0.35)",
          }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Verifying...
            </span>
          ) : "Verify Email"}
        </button>
      </form>

      <div className="px-6 mt-6 text-center relative z-10">
        {resendCooldown > 0 ? (
          <p className="text-muted-foreground text-sm">
            Resend code in <span className="font-semibold" style={{ color: "#C9A96E" }}>{resendCooldown}s</span>
          </p>
        ) : (
          <button onClick={handleResend} disabled={resending} className="text-sm font-semibold disabled:opacity-50" style={{ color: "#C9A96E" }}>
            {resending ? "Sending..." : "Resend code"}
          </button>
        )}
      </div>

      <div className="px-6 mt-4 text-center relative z-10 pb-8">
        <button
          onClick={async () => {
            await authClient.signOut();
            sessionStorage.removeItem("verify_email");
            sessionStorage.removeItem("verify_password");
            window.location.href = "/";
          }}
          className="text-xs text-muted-foreground underline"
        >
          Use a different account
        </button>
      </div>
    </div>
  );
}
