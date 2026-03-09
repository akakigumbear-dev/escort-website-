import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Crown, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface RegisterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSwitchToLogin: () => void;
}

const RegisterModal = ({ open, onOpenChange, onSwitchToLogin }: RegisterModalProps) => {
  const { t } = useTranslation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.email || !form.password) {
      setError(t("auth.emailPasswordRequired"));
      return;
    }
    setLoading(true);
    try {
      await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("auth.somethingWrong"));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (val: boolean) => {
    if (!val) {
      setForm({ email: "", password: "" });
      setError("");
      setSuccess(false);
    }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border/50 sm:max-w-md">
        <DialogHeader className="items-center">
          <Crown className="h-8 w-8 text-primary mb-2" />
          <DialogTitle className="font-display text-2xl gold-text">{t("auth.createAccount")}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {t("auth.joinHint")}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="text-center py-4">
            <p className="text-foreground font-medium mb-4">{t("auth.registerSuccess")}</p>
            <Button onClick={() => { handleClose(false); onSwitchToLogin(); }} className="gold-gradient font-semibold">
              {t("auth.loginNow")}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reg-email">{t("auth.email")}</Label>
              <Input id="reg-email" type="email" placeholder={t("auth.emailPlaceholder")} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-background border-border/50" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-password">{t("auth.password")}</Label>
              <Input id="reg-password" type="password" placeholder={t("auth.passwordPlaceholder")} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="bg-background border-border/50" />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full gold-gradient font-semibold">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("header.register")}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              {t("auth.alreadyHaveAccount")}{" "}
              <button type="button" onClick={() => { handleClose(false); onSwitchToLogin(); }} className="text-primary hover:underline">{t("header.login")}</button>
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RegisterModal;
