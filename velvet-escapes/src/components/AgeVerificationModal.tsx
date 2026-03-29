import { useState, useEffect } from "react";
import { Shield, ExternalLink } from "lucide-react";

const AGE_VERIFIED_KEY = "age_verified";

const AgeVerificationModal = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const verified = localStorage.getItem(AGE_VERIFIED_KEY);
    if (!verified) {
      setOpen(true);
    }
  }, []);

  const handleConfirmAge = () => {
    localStorage.setItem(AGE_VERIFIED_KEY, "true");
    setOpen(false);
  };

  const handleUnderAge = () => {
    window.location.href = "https://google.com";
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative z-10 w-[90%] max-w-md mx-auto overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* Banner */}
        <div className="gold-gradient px-6 py-8 text-center">
          <Shield className="mx-auto mb-3 h-12 w-12 text-white drop-shadow-lg" />
          <h2 className="font-display text-2xl font-bold text-white">
            Age Verification
          </h2>
          <p className="mt-2 text-sm text-white/80">
            This website contains adult content. You must be 18 years or older to enter.
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-4">
          {/* Age buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleConfirmAge}
              className="gold-gradient rounded-xl px-4 py-4 text-center font-semibold text-white text-lg transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] shadow-md"
            >
              18+
              <span className="block text-xs font-normal text-white/80 mt-1">
                Enter
              </span>
            </button>
            <button
              onClick={handleUnderAge}
              className="rounded-xl border-2 border-border bg-muted px-4 py-4 text-center font-semibold text-muted-foreground text-lg transition-all hover:bg-muted/80 hover:scale-[1.02] active:scale-[0.98]"
            >
              18-
              <span className="block text-xs font-normal mt-1">
                Leave
              </span>
            </button>
          </div>

          {/* Telegram button */}
          <a
            href="https://t.me/elitfans"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-[#2AABEE] px-4 py-3 font-semibold text-white transition-all hover:bg-[#229ED9] hover:scale-[1.02] active:scale-[0.98] shadow-md"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
            </svg>
            Telegram Channel
            <ExternalLink className="h-4 w-4" />
          </a>

          <p className="text-center text-xs text-muted-foreground">
            By entering, you confirm that you are of legal age in your jurisdiction.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AgeVerificationModal;
