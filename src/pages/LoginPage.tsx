import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";

const styles = `
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
.fade-up { animation: fadeUp 0.45s ease forwards; }
`;

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "signup" ? "signup" : "login";
  const [tab, setTab] = useState<"login" | "signup">(initialTab);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reset = () => { setError(""); };

  // Sign out any existing session so a different user can log in
  useEffect(() => {
    authClient.signOut().catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password.trim()) return;
    if (tab === "signup" && !name.trim()) { setError("Please enter your name."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }

    setLoading(true);

    if (tab === "signup") {
      try {
        const { error: err } = await authClient.signUp.email({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        });
        if (err) { setLoading(false); setError(err.message ?? "Sign up failed. Try again."); return; }
        // Send OTP — don't await, fire and forget so it never blocks navigation
        authClient.emailOtp.sendVerificationOtp({ email: email.trim().toLowerCase(), type: "email-verification" }).catch(() => {});
        sessionStorage.setItem("verify_email", email.trim().toLowerCase());
        sessionStorage.setItem("verify_password", password);
        setLoading(false);
        toast.success("Account created! Please check your email for a verification code.");
        window.location.href = "/verify-otp";
      } catch {
        setLoading(false);
        setError("Sign up failed. Please try again.");
      }
    } else {
      const { error: err } = await authClient.signIn.email({
        email: email.trim().toLowerCase(),
        password,
      });
      setLoading(false);
      if (err) { setError(err.message ?? "Invalid email or password."); return; }
      window.location.href = "/wardrobe";
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
      <style>{styles}</style>

      {/* Decorative top blob */}
      <div
        className="pointer-events-none absolute top-0 right-0 w-64 h-64 rounded-full opacity-20"
        style={{ background: "radial-gradient(circle at 70% 30%, #C9A96E 0%, transparent 70%)" }}
      />

      {/* Back */}
      <div className="px-6 pt-14 pb-2 relative z-10">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-muted-foreground text-sm font-medium"
        >
          <ArrowLeft size={16} /> Back
        </button>
      </div>

      {/* Brand */}
      <div className="px-6 pt-6 pb-8 relative z-10 fade-up">
        <span
          className="text-xs font-bold tracking-widest uppercase"
          style={{ color: "#C9A96E" }}
        >
          Closet Canvas
        </span>
        <h1
          className="mt-3 text-foreground"
          style={{ fontSize: "2.2rem", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1 }}
        >
          {tab === "login" ? "Welcome\nback." : "Create your\naccount."}
        </h1>
      </div>

      {/* Tab switcher */}
      <div className="px-6 mb-6 relative z-10" style={{ animationDelay: "0.05s" }}>
        <div className="flex bg-white/60 rounded-2xl p-1 border border-border">
          {(["login", "signup"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); reset(); }}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
              style={
                tab === t
                  ? { background: "linear-gradient(135deg,#C9A96E,#A07850)", color: "#fff", boxShadow: "0 2px 8px rgba(201,169,110,0.3)" }
                  : { color: "hsl(var(--muted-foreground))" }
              }
            >
              {t === "login" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="px-6 flex flex-col gap-3 relative z-10" style={{ animationDelay: "0.1s" }}>
        {tab === "signup" && (
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 ml-1">Your Name</label>
            <input
              type="text"
              placeholder="Jane Doe"
              value={name}
              onChange={e => { setName(e.target.value); reset(); }}
              autoComplete="name"
              disabled={loading}
              className="w-full h-13 px-4 py-3.5 rounded-xl border bg-white/70 text-foreground text-base outline-none transition-all"
              style={{ borderColor: "hsl(var(--border))" }}
              onFocus={e => e.currentTarget.style.borderColor = "#C9A96E"}
              onBlur={e => e.currentTarget.style.borderColor = "hsl(var(--border))"}
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5 ml-1">Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => { setEmail(e.target.value); reset(); }}
            autoComplete="email"
            disabled={loading}
            className="w-full h-13 px-4 py-3.5 rounded-xl border bg-white/70 text-foreground text-base outline-none transition-all"
            style={{ borderColor: "hsl(var(--border))" }}
            onFocus={e => e.currentTarget.style.borderColor = "#C9A96E"}
            onBlur={e => e.currentTarget.style.borderColor = "hsl(var(--border))"}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5 ml-1">Password</label>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              placeholder={tab === "signup" ? "Min. 8 characters" : "Your password"}
              value={password}
              onChange={e => { setPassword(e.target.value); reset(); }}
              autoComplete={tab === "signup" ? "new-password" : "current-password"}
              disabled={loading}
              className="w-full h-13 px-4 py-3.5 pr-12 rounded-xl border bg-white/70 text-foreground text-base outline-none transition-all"
              style={{ borderColor: "hsl(var(--border))" }}
              onFocus={e => e.currentTarget.style.borderColor = "#C9A96E"}
              onBlur={e => e.currentTarget.style.borderColor = "hsl(var(--border))"}
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3">
            <p className="text-destructive text-sm font-medium">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !email.trim() || !password.trim()}
          className="mt-2 w-full py-4 rounded-2xl text-white font-bold text-base tracking-tight transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, #C9A96E 0%, #A07850 100%)",
            boxShadow: loading || !email.trim() || !password.trim() ? "none" : "0 6px 24px rgba(201,169,110,0.35)",
          }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              {tab === "signup" ? "Creating account..." : "Signing in..."}
            </span>
          ) : tab === "signup" ? "Create Account" : "Sign In"}
        </button>
      </form>

      <p className="text-center text-muted-foreground text-xs mt-8 px-6">
        {tab === "login" ? "Don't have an account? " : "Already have an account? "}
        <button
          onClick={() => { setTab(tab === "login" ? "signup" : "login"); reset(); }}
          className="font-semibold"
          style={{ color: "#C9A96E" }}
        >
          {tab === "login" ? "Sign up" : "Sign in"}
        </button>
      </p>
    </div>
  );
}
