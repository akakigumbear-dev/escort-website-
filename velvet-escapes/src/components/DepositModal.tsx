import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, Loader2, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";

interface DepositModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const QUICK_AMOUNTS = [10, 25, 50, 100, 200, 500];

const DepositModal = ({ open, onOpenChange }: DepositModalProps) => {
  const { t } = useTranslation();
  const { user, refreshBalance } = useAuth();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [newBalance, setNewBalance] = useState<number | null>(null);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(amount);
    if (!num || num <= 0) {
      setError(t("deposit.invalidAmount"));
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = await apiFetch("/profile/balance", {
        method: "POST",
        body: JSON.stringify({ amount: num }),
      });
      setNewBalance(data.balance);
      setSuccess(true);
      await refreshBalance();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("auth.somethingWrong"));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (val: boolean) => {
    if (!val) {
      setAmount("");
      setError("");
      setSuccess(false);
      setNewBalance(null);
    }
    onOpenChange(val);
  };

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

        {success ? (
          <div className="text-center py-6 space-y-3">
            <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto" />
            <p className="text-foreground font-medium">{t("deposit.success")}</p>
            <p className="text-2xl font-bold gold-text">{Number(newBalance ?? 0).toFixed(2)} ₾</p>
            <Button onClick={() => handleClose(false)} className="gold-gradient font-semibold">
              {t("deposit.close")}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleDeposit} className="space-y-5">
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
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : `${t("deposit.deposit")} ${amount ? `${amount} ₾` : ""}`}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              {t("deposit.demoNote")}
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DepositModal;
