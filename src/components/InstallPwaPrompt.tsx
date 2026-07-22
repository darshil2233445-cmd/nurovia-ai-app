import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Download, Share, PlusSquare, X, Smartphone, Monitor, CheckCircle2 } from "lucide-react";

interface InstallPwaPromptProps {
  className?: string;
  variant?: "button" | "banner";
}

export default function InstallPwaPrompt({
  className = "",
  variant = "button"
}: InstallPwaPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(() => (window as any).deferredPwaPrompt || null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [browserInfo, setBrowserInfo] = useState<string>("");
  const [showIOSModal, setShowIOSModal] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  useEffect(() => {
    // 1. Audit Standalone mode (App already installed and launched from home screen/app launcher)
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        window.matchMedia("(display-mode: minimal-ui)").matches ||
        (navigator as any).standalone === true ||
        document.referrer.includes("android-app://");

      if (isStandaloneMode) {
        setIsStandalone(true);
        console.log("Already installed");
      }
    };

    checkStandalone();

    // 2. Platform & Browser Detection
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    setIsIOS(isIosDevice);

    if (isIosDevice) {
      setBrowserInfo("iOS Safari");
    } else if (userAgent.includes("edg/")) {
      setBrowserInfo("Microsoft Edge");
    } else if (userAgent.includes("chrome") || userAgent.includes("crios")) {
      setBrowserInfo(userAgent.includes("android") ? "Android Chrome" : "Desktop Chrome");
    } else {
      setBrowserInfo("Web Browser");
    }

    // 3. Check for pre-captured prompt from index.html
    if ((window as any).deferredPwaPrompt) {
      setDeferredPrompt((window as any).deferredPwaPrompt);
      console.log("Install available");
    }

    // 4. Audit potential blocking reasons
    if (!window.isSecureContext && location.protocol !== "http:" && !location.hostname.includes("localhost")) {
      console.log("Install blocked because site is not served over HTTPS");
    }
    if (window.self !== window.top) {
      console.log("Install blocked because app is embedded inside an iframe");
    }

    // 5. Event Listeners for PWA installation lifecycle
    const handlePromptReady = () => {
      if ((window as any).deferredPwaPrompt) {
        setDeferredPrompt((window as any).deferredPwaPrompt);
        console.log("beforeinstallprompt fired");
        console.log("Install available");
      }
    };

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).deferredPwaPrompt = e;
      setDeferredPrompt(e);
      console.log("beforeinstallprompt fired");
      console.log("Install available");
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      (window as any).deferredPwaPrompt = null;
      console.log("Already installed");
    };

    window.addEventListener("pwa-prompt-ready", handlePromptReady);
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("pwa-prompt-ready", handlePromptReady);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // Handle click on "Install App" button
  const handleInstallClick = async () => {
    // iOS Safari Flow: Show clear step-by-step modal guide
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    const currentPrompt = deferredPrompt || (window as any).deferredPwaPrompt;

    if (!currentPrompt) {
      console.log("Install blocked because beforeinstallprompt has not fired yet or prompt was previously used/dismissed");
      alert(
        "To install NUVORIA AI:\n\n" +
        "• On Chrome/Edge: Click the install icon in the right side of the address bar or open menu (⋮) -> 'Install NUVORIA AI'.\n" +
        "• On Mobile: Tap browser menu (⋮) -> 'Add to Home screen'."
      );
      return;
    }

    try {
      // Trigger the native Chrome / Edge install prompt
      await currentPrompt.prompt();
      const choiceResult = await currentPrompt.userChoice;

      if (choiceResult && choiceResult.outcome === "accepted") {
        console.log("Install accepted by user");
        setIsInstalled(true);
      } else {
        console.log("Install blocked because user cancelled the install prompt");
      }

      setDeferredPrompt(null);
      (window as any).deferredPwaPrompt = null;
    } catch (err) {
      console.log("Install blocked because of error during prompt execution:", err);
    }
  };

  // Do not render button/banner if app is already running in standalone mode or installed
  if (isStandalone || isInstalled) {
    return null;
  }

  // Hide floating banner if user clicked 'X'
  if (variant === "banner" && isDismissed) {
    return null;
  }

  // Check if install option is available (either beforeinstallprompt fired OR device is iOS Safari)
  const canPrompt = Boolean(deferredPrompt || (window as any).deferredPwaPrompt || isIOS);

  // If button variant, render Install App button
  if (variant === "button") {
    // If not iOS and prompt hasn't fired yet, keep button accessible with fallback or active prompt
    return (
      <>
        <button
          onClick={handleInstallClick}
          className={`px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs font-display rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer min-h-[44px] shrink-0 active:scale-95 ${className}`}
          title={`Install NUVORIA AI app (${browserInfo})`}
        >
          <Download size={15} className="animate-bounce" />
          <span>Install App</span>
        </button>

        {/* iOS Safari Instruction Modal */}
        <AnimatePresence>
          {showIOSModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl relative space-y-5"
              >
                <button
                  onClick={() => setShowIOSModal(false)}
                  className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Smartphone size={24} />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 font-display">
                      Install NUVORIA AI
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Add to iOS Home Screen
                    </p>
                  </div>
                </div>

                <div className="space-y-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-700 dark:text-slate-300">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 font-display">
                      1
                    </span>
                    <p className="pt-0.5">
                      Tap <strong className="text-slate-900 dark:text-white font-bold inline-flex items-center gap-1">Share <Share size={13} className="text-blue-600" /></strong> at the bottom of Safari.
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 font-display">
                      2
                    </span>
                    <p className="pt-0.5">
                      Tap <strong className="text-slate-900 dark:text-white font-bold inline-flex items-center gap-1"><PlusSquare size={13} className="text-blue-600" /> Add to Home Screen</strong>.
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 font-display">
                      3
                    </span>
                    <p className="pt-0.5">
                      Tap <strong className="text-slate-900 dark:text-white font-bold">Add</strong> in top right corner.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowIOSModal(false)}
                  className="w-full py-3 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition-all cursor-pointer font-display"
                >
                  Got It
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </>
    );
  }

  // Floating Banner variant
  return (
    <AnimatePresence>
      {!isDismissed && canPrompt && (
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          className="fixed bottom-4 right-4 z-40 max-w-sm w-[calc(100%-2rem)] bg-white dark:bg-slate-900 rounded-2xl p-4 border border-blue-200 dark:border-slate-800 shadow-2xl flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Nuvoria" className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-slate-700" />
            <div>
              <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 font-display">
                Install NUVORIA AI
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Install on {browserInfo} for instant access.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleInstallClick}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer font-display flex items-center gap-1"
            >
              <Download size={13} />
              <span>Install</span>
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
