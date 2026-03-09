import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, Loader2, CheckCircle, ExternalLink, Clock, Copy, Check } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";

interface DepositModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const QUICK_AMOUNTS = [10, 25, 50, 100, 200, 500];
const POLL_INTERVAL = 5000;

type Step = "amount" | "waiting" | "success";

interface InvoiceData {
  transactionId: string;
  trackId: string;
  paymentUrl: string;
  amountGel: number;
  amountUsd: number;
}

const DepositModal = ({ open, onOpenChange }: DepositModalProps) => {
  const { t } = useTranslation();
  const { user, refreshBalance } = useAuth();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<Step>("amount");
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [copied, setCopied] = useState(false);
  const [rate, setRate] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (open) {
      apiFetch("/payment/exchange-rate").then((d) => setRate(d.usdToGel)).catch(() => {});
    }
  }, [open]);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => {
    if (step !== "waiting" || !invoice) return;
    const poll = async () => {
      try {
        const data = await apiFetch(`/payment/status/${invoice.transactionId}`);
        if (data.status === "paid") {
          stopPolling();
          await refreshBalance();
          setStep("success");
        }
      } catch {}
    };
    pollRef.current = setInterval(poll, POLL_INTERVAL);
    return stopPolling;
  }, [step, invoice]);

  useEffect(() => {
    if (!open) stopPolling();
  }, [open]);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(amount);
    if (!num || num <= 0) {
      setError(t("deposit.invalidAmount"));
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data: InvoiceData = await apiFetch("/payment/create-invoice", {
        method: "POST",
        body: JSON.stringify({ amount: num }),
      });
      setInvoice(data);
      setStep("waiting");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("auth.somethingWrong"));
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (!invoice?.paymentUrl) return;
    await navigator.clipboard.writeText(invoice.paymentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = (val: boolean) => {
    if (!val) {
      setAmount("");
      setError("");
      setStep("amount");
      setInvoice(null);
      setCopied(false);
      stopPolling();
    }
    onOpenChange(val);
  };

  const usdPreview = rate && amount ? (Number(amount) / rate).toFixed(2) : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border/50 sm:max-w-md">
        <DialogHeader className="items-center">
          <Wallet className="h-8 w-8 text-primary mb-2" />
          <DialogTitle className="font-display text-2xl gold-text">{t("deposit.title")}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {t("deposit.currentBalance")}: <span className="font-semibold text-foreground">{Number(user?.balance ?? 0).toFixed(2)} ₾</span>
          </DialogDescription>
        </DialogHeader>

        {step === "success" && (
          <div className="text-center py-6 space-y-3">
            <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto" />
            <p className="text-foreground font-medium">{t("deposit.success")}</p>
            <p className="text-2xl font-bold gold-text">{Number(user?.balance ?? 0).toFixed(2)} ₾</p>
            <Button onClick={() => handleClose(false)} className="gold-gradient font-semibold">
              {t("deposit.close")}
            </Button>
          </div>
        )}

        {step === "waiting" && invoice && (
          <div className="space-y-4 py-2">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 px-3 py-1 text-xs font-medium">
                <Clock className="h-3 w-3 animate-pulse" />
                Waiting for payment...
              </div>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{invoice.amountGel} ₾</span>
                {" "}≈{" "}
                <span className="font-semibold text-foreground">{invoice.amountUsd} $</span>
                {" "}in crypto
              </p>
            </div>

            <div className="flex justify-center">
              <div className="rounded-xl border border-border/50 bg-white p-4">
                <QRCodeSVG value={invoice.paymentUrl} size={200} level="M" />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => window.open(invoice.paymentUrl, "_blank")}
              >
                <ExternalLink className="h-4 w-4" /> Open payment page
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={copyLink}
                className="flex-shrink-0"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Payment link expires in 60 minutes. Balance updates automatically once confirmed.
            </p>

            <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => { setStep("amount"); setInvoice(null); stopPolling(); }}>
              Cancel &amp; enter different amount
            </Button>
          </div>
        )}

        {step === "amount" && (
          <form onSubmit={handleCreateInvoice} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="deposit-amount">{t("deposit.amount")}</Label>
              <Input
                id="deposit-amount"
                type="number"
                min={1}
                step={0.01}
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-background border-border/50 text-lg h-12"
              />
              {usdPreview && (
                <p className="text-xs text-muted-foreground">≈ {usdPreview} $ (USD)</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((qa) => (
                <button
                  key={qa}
                  type="button"
                  onClick={() => setAmount(String(qa))}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    amount === String(qa)
                      ? "gold-gradient text-primary-foreground shadow-md"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  {qa} ₾
                </button>
              ))}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={loading || !amount} className="w-full gold-gradient font-semibold h-11">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : `Pay with Crypto ${amount ? `— ${amount} ₾` : ""}`}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Powered by OxaPay. Supports BTC, ETH, USDT, LTC, TRX and more.
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DepositModal;
