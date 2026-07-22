import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, ArrowRight, Mail, Phone, Key, ShieldCheck, RefreshCw, ChevronLeft, User, AlertCircle, CheckCircle2 } from "lucide-react";

interface AuthWelcomeProps {
  onAuthSuccess: (token: string, user: { email: string; name: string; photoUrl?: string }) => void;
  onContinueAsGuest: () => void;
}

export default function AuthWelcome({ onAuthSuccess, onContinueAsGuest }: AuthWelcomeProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  
  const [step, setStep] = useState<"welcome" | "email" | "phone" | "otp">("welcome");
  const [otpType, setOtpType] = useState<"email" | "phone">("email");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Timer for OTP expiration (300 seconds = 5 minutes)
  const [timeLeft, setTimeLeft] = useState(300);
  const [timerActive, setTimerActive] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Dynamically load Google Identity Services (GIS) on component mount
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      try {
        const g = (window as any).google;
        if (g) {
          g.accounts.id.initialize({
            // Use configured Google client ID or fallback to a default client ID
            client_id: ((import.meta as any).env?.VITE_GOOGLE_CLIENT_ID) || "338165507968-3hce7df04r1e2bdtu4be9u95sc170of7.apps.googleusercontent.com",
            callback: handleGoogleCredentialResponse,
          });

          // Render Google Button in Step 1
          const container = document.getElementById("google-signin-btn-container");
          if (container) {
            g.accounts.id.renderButton(container, {
              theme: "filled_blue",
              size: "large",
              width: "100%",
              text: "continue_with",
              shape: "rectangular",
            });
          }
        }
      } catch (err) {
        console.error("Failed to initialize Google Sign-In SDK:", err);
      }
    };

    return () => {
      try {
        document.body.removeChild(script);
      } catch (e) {}
    };
  }, [step]); // Re-initialize button if returning to step === "welcome"

  // Process Google credential token on successful OAuth login
  const handleGoogleCredentialResponse = async (response: any) => {
    const idToken = response.credential;
    if (!idToken) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Google verification failed on backend.");
      }

      onAuthSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || "Failed to sign in with Google.");
    } finally {
      setLoading(false);
    }
  };

  // Timer countdown logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setTimerActive(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive, timeLeft]);

  // Resend cooldown timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    } else if (resendCooldown === 0) {
      setCanResend(true);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendCooldown]);

  // Request Email OTP
  const handleSendEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send verification code.");
      }

      setSuccessMsg(data.message);
      setOtpType("email");
      setStep("otp");
      setTimeLeft(300); // 5 minutes
      setTimerActive(true);
      setCanResend(false);
      setResendCooldown(60); // 1 minute cooldown
      setOtp(Array(6).fill(""));
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred sending your verification email.");
    } finally {
      setLoading(false);
    }
  };

  // Request Phone OTP
  const handleSendPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phoneNumber.trim().replace(/\s+/g, "");
    if (!cleanPhone || !/^\+[1-9]\d{1,14}$/.test(cleanPhone)) {
      setError("A valid international phone number starting with '+' and country code is required (e.g., +15551234567).");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/send-phone-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: cleanPhone }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send verification SMS.");
      }

      setSuccessMsg(data.message);
      setOtpType("phone");
      setStep("otp");
      setTimeLeft(300); // 5 minutes
      setTimerActive(true);
      setCanResend(false);
      setResendCooldown(60); // 1 minute cooldown
      setOtp(Array(6).fill(""));
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred sending your verification SMS.");
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP Code on Backend (Unified for Email and Phone)
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const otpCode = otp.join("");
    if (otpCode.length !== 6) {
      setError("Please enter the full 6-digit code.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const endpoint = otpType === "email" ? "/api/auth/verify-otp" : "/api/auth/verify-phone-otp";
      const payload = otpType === "email" 
        ? { email, otp: otpCode, name } 
        : { phoneNumber: phoneNumber.trim().replace(/\s+/g, ""), otp: otpCode };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Verification failed. Please check the code and try again.");
      }

      // Successful auth completion
      onAuthSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || "Invalid or expired verification code.");
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP Code
  const handleResendOtp = async () => {
    if (!canResend) return;
    setLoading(true);
    setError(null);

    try {
      if (otpType === "email") {
        const response = await fetch("/api/auth/send-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to resend code.");
        setSuccessMsg("A new verification email has been sent.");
      } else {
        const response = await fetch("/api/auth/send-phone-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phoneNumber: phoneNumber.trim().replace(/\s+/g, "") }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to resend SMS.");
        setSuccessMsg("A new verification SMS has been sent.");
      }

      setTimeLeft(300);
      setTimerActive(true);
      setCanResend(false);
      setResendCooldown(60);
      setOtp(Array(6).fill(""));
    } catch (err: any) {
      setError(err.message || "Failed to resend code.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    const cleanVal = val.replace(/[^0-9]/g, "").slice(-1);
    const newOtp = [...otp];
    newOtp[index] = cleanVal;
    setOtp(newOtp);

    // Auto-focus next input
    if (cleanVal && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        const newOtp = [...otp];
        newOtp[index - 1] = "";
        setOtp(newOtp);
        otpRefs.current[index - 1]?.focus();
      } else {
        const newOtp = [...otp];
        newOtp[index] = "";
        setOtp(newOtp);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, 6);
    if (pasteData) {
      const newOtp = [...otp];
      for (let i = 0; i < pasteData.length; i++) {
        newOtp[i] = pasteData[i];
      }
      setOtp(newOtp);
      const lastIndex = Math.min(pasteData.length - 1, 5);
      otpRefs.current[lastIndex]?.focus();
    }
  };

  // Automatically verify when 6 digits are fully typed
  useEffect(() => {
    if (otp.join("").length === 6 && step === "otp") {
      handleVerifyOtp();
    }
  }, [otp]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950 flex items-center justify-center p-4 selection:bg-blue-500/30">
      
      {/* Background visual graphics */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(37,99,235,0.12),transparent_40%),radial-gradient(circle_at_70%_70%,rgba(6,182,212,0.09),transparent_40%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-25" />

      {/* Auth Container Frame */}
      <div className="relative w-full max-w-lg bg-slate-900/50 backdrop-blur-2xl border border-slate-800/80 rounded-3xl shadow-2xl p-8 sm:p-10 text-white overflow-hidden">
        
        {/* Sleek top ambient glow lines */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
        
        <AnimatePresence mode="wait">
          
          {/* STEP 1: CHOOSE AUTH PATHWAY SCREEN */}
          {step === "welcome" && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="flex flex-col items-center text-center space-y-8 animate-fade-in"
              id="auth-welcome-step"
            >
              {/* Brand Logo & Glowing Backdrop */}
              <div className="relative group">
                <div className="absolute -inset-1.5 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 opacity-60 blur-md group-hover:opacity-85 transition duration-500 animate-pulse" />
                <div className="relative w-16 h-16 bg-slate-950 rounded-2xl flex items-center justify-center border border-slate-800/80 text-3xl font-extrabold text-blue-500 font-display">
                  N
                </div>
              </div>

              {/* Taglines */}
              <div className="space-y-2.5">
                <h1 className="text-3xl sm:text-4xl font-extrabold font-display tracking-tight bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  Nurovia AI
                </h1>
                <p className="text-sm text-slate-400 font-medium max-w-sm mx-auto leading-relaxed">
                  Your patient, highly intelligent bento tutor designed to help you learn faster and understand concepts deeply.
                </p>
              </div>

              {error && (
                <div className="w-full flex items-start gap-2.5 bg-red-500/10 border border-red-500/25 text-red-400 p-3.5 rounded-xl text-xs text-left">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Authentication Choices panel */}
              <div className="w-full space-y-3.5 pt-2">
                
                {/* CHOICE 1: Native Google Identity Services Button Container */}
                <div className="relative w-full">
                  <div id="google-signin-btn-container" className="w-full min-h-[44px] overflow-hidden rounded-xl border border-slate-800 shadow-sm" />
                </div>

                <div className="relative flex py-2 items-center text-xs text-slate-500">
                  <div className="flex-grow border-t border-slate-800/80" />
                  <span className="flex-shrink mx-4 font-bold tracking-wider uppercase text-[10px]">Or continue with</span>
                  <div className="flex-grow border-t border-slate-800/80" />
                </div>

                {/* CHOICE 2a: Email Sign In Button */}
                <button
                  onClick={() => { setError(null); setStep("email"); }}
                  className="w-full flex items-center justify-between bg-slate-950/60 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 active:bg-slate-900 text-slate-200 font-bold py-3 px-5 rounded-xl transition-all duration-150 cursor-pointer text-sm font-display group"
                  id="auth-choice-email"
                >
                  <div className="flex items-center gap-3">
                    <Mail size={16} className="text-blue-500 group-hover:scale-110 transition-transform" />
                    <span>Email Verification</span>
                  </div>
                  <ArrowRight size={14} className="text-slate-500 group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* CHOICE 2b: Phone Sign In Button */}
                <button
                  onClick={() => { setError(null); setStep("phone"); }}
                  className="w-full flex items-center justify-between bg-slate-950/60 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 active:bg-slate-900 text-slate-200 font-bold py-3 px-5 rounded-xl transition-all duration-150 cursor-pointer text-sm font-display group"
                  id="auth-choice-phone"
                >
                  <div className="flex items-center gap-3">
                    <Phone size={16} className="text-cyan-500 group-hover:scale-110 transition-transform" />
                    <span>Mobile Number (SMS)</span>
                  </div>
                  <ArrowRight size={14} className="text-slate-500 group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* CHOICE 3: Guest Mode Button */}
                <button
                  onClick={onContinueAsGuest}
                  className="w-full flex items-center justify-center gap-2 bg-slate-900/60 hover:bg-slate-800 active:bg-slate-900 border border-slate-800 text-slate-300 font-semibold py-3.5 px-6 rounded-xl transition-all duration-150 cursor-pointer text-xs"
                  id="auth-guest-btn"
                >
                  <span>Continue as Guest</span>
                </button>

              </div>

              {/* Safe Badges */}
              <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-950/30 px-4 py-2.5 rounded-full border border-slate-900/60 select-none">
                <ShieldCheck size={14} className="text-blue-500/80" />
                <span>Enterprise grade, passwordless encryption</span>
              </div>
            </motion.div>
          )}

          {/* STEP 2A: EMAIL SIGN-IN FORM */}
          {step === "email" && (
            <motion.div
              key="email"
              initial={{ opacity: 0, x: 25 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -25 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="space-y-6"
              id="auth-email-step"
            >
              {/* Navigation Back */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => { setError(null); setStep("welcome"); }}
                  className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-xs font-semibold cursor-pointer py-1 px-2.5 bg-slate-950/40 rounded-lg border border-slate-900/80"
                >
                  <ChevronLeft size={14} />
                  <span>Back</span>
                </button>
                <span className="text-[10px] font-bold tracking-widest text-blue-500 uppercase">EMAIL ENTRY</span>
              </div>

              <div className="space-y-1.5">
                <h2 className="text-2xl font-extrabold font-display">Sign in with Email</h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  We'll dispatch a secure One-Time Password (OTP) code directly to your email inbox.
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-xs animate-shake">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSendEmailOtp} className="space-y-5">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Your Name (Optional)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <User size={15} />
                      </div>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Scholar"
                        className="block w-full pl-10 pr-4 py-3.5 bg-slate-950/50 border border-slate-800 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500/30 rounded-xl text-white placeholder-slate-700 text-sm transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-display">Email Address</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <Mail size={15} />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="username@email.com"
                        className="block w-full pl-10 pr-4 py-3.5 bg-slate-950/50 border border-slate-800 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500/30 rounded-xl text-white placeholder-slate-700 text-sm transition-all"
                        autoFocus
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-40 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg transition-all duration-150 cursor-pointer text-sm font-display"
                >
                  {loading ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      <span>Sending OTP Code...</span>
                    </>
                  ) : (
                    <>
                      <span>Send OTP Code</span>
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}

          {/* STEP 2B: PHONE SIGN-IN FORM */}
          {step === "phone" && (
            <motion.div
              key="phone"
              initial={{ opacity: 0, x: 25 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -25 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="space-y-6"
              id="auth-phone-step"
            >
              {/* Navigation Back */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => { setError(null); setStep("welcome"); }}
                  className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-xs font-semibold cursor-pointer py-1 px-2.5 bg-slate-950/40 rounded-lg border border-slate-900/80"
                >
                  <ChevronLeft size={14} />
                  <span>Back</span>
                </button>
                <span className="text-[10px] font-bold tracking-widest text-cyan-500 uppercase font-mono">SMS MOBILE</span>
              </div>

              <div className="space-y-1.5">
                <h2 className="text-2xl font-extrabold font-display">Sign in with Mobile</h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Enter your phone number in full international format. We'll send you a secure 6-digit SMS verification code.
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-xs animate-shake">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSendPhoneOtp} className="space-y-5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-display">Phone Number (with Country Code)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Phone size={15} />
                    </div>
                    <input
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+1 (555) 123-4567"
                      className="block w-full pl-10 pr-4 py-3.5 bg-slate-950/50 border border-slate-800 focus:border-cyan-500 focus:outline-hidden focus:ring-1 focus:ring-cyan-500/30 rounded-xl text-white placeholder-slate-700 text-sm transition-all"
                      autoFocus
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                    Example format: <strong>+15551234567</strong> or <strong>+447911123456</strong>. Make sure to enter the prefix '+' and country code.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || !phoneNumber}
                  className="w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 disabled:opacity-40 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg transition-all duration-150 cursor-pointer text-sm font-display"
                >
                  {loading ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      <span>Sending SMS OTP...</span>
                    </>
                  ) : (
                    <>
                      <span>Send SMS Verification</span>
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}

          {/* STEP 3: OTP CODE DIGITS VERIFICATION SCREEN */}
          {step === "otp" && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 25 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -25 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="space-y-6"
              id="auth-otp-step"
            >
              {/* Back out and reset */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setStep(otpType === "email" ? "email" : "phone");
                    setError(null);
                  }}
                  className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-xs font-semibold cursor-pointer py-1 px-2.5 bg-slate-950/40 rounded-lg border border-slate-900/80"
                >
                  <ChevronLeft size={14} />
                  <span>Edit Contact Info</span>
                </button>
                <span className="text-[10px] font-bold tracking-widest text-emerald-500 uppercase font-mono">OTP VERIFY</span>
              </div>

              <div className="space-y-1.5">
                <h2 className="text-2xl font-extrabold font-display">Enter Verification Code</h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  We dispatched a 6-digit verification code to <span className="text-white font-bold">{otpType === "email" ? email : phoneNumber}</span>. Please enter it below.
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-xs animate-shake">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && !error && (
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 py-2.5 rounded-xl text-xs select-none">
                  <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                  <span className="truncate">{successMsg}</span>
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-6">
                
                {/* 6 Grid Inputs */}
                <div className="flex justify-between items-center gap-2.5 sm:gap-3.5">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      ref={(el) => { otpRefs.current[idx] = el; }}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      onPaste={idx === 0 ? handlePaste : undefined}
                      className="w-12 h-14 sm:w-14 sm:h-16 text-center text-xl sm:text-2xl font-extrabold font-mono bg-slate-950/70 border border-slate-800 rounded-xl focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500/40 transition-all text-white"
                      disabled={loading}
                      autoFocus={idx === 0}
                    />
                  ))}
                </div>

                {/* Expiry Timers and resends */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 font-display">
                  <div className="flex items-center gap-1.5 font-mono">
                    <Key size={13} className={timeLeft > 0 ? "text-blue-500 animate-pulse" : "text-red-500"} />
                    {timeLeft > 0 ? (
                      <span>Expires in <span className="text-white font-bold">{formatTime(timeLeft)}</span></span>
                    ) : (
                      <span className="text-red-400 font-bold">Verification code expired</span>
                    )}
                  </div>

                  <div>
                    {resendCooldown > 0 ? (
                      <span className="text-slate-500 font-medium select-none">Resend in <strong className="text-slate-400">{resendCooldown}s</strong></span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        className="text-blue-400 hover:text-blue-300 font-bold transition-colors cursor-pointer py-1 px-2.5 hover:bg-slate-950 rounded-lg border border-slate-800"
                        disabled={loading}
                      >
                        Resend Code
                      </button>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.join("").length !== 6}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-40 text-white font-bold py-4 px-6 rounded-xl shadow-lg transition-all duration-150 cursor-pointer text-sm font-display"
                >
                  {loading ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      <span>Verifying Security Code...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={16} />
                      <span>Verify & Access Workspace</span>
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
