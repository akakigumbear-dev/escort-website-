import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Crown, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSwitchToRegister: () => void;
}

const LoginModal = ({ open, onOpenChange, onSwitchToRegister }: LoginModalProps) => {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.identifier || !form.password) {
      setError(t("auth.allFieldsRequired"));
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: form.identifier, password: form.password }),
      });
      const token = data.token || data.access_token || data.accessToken || "";
      const u = data.user || { email: form.identifier };
      login({ id: u.id, email: u.email || form.identifier, role: u.role }, token);
      handleClose(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("auth.somethingWrong"));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (val: boolean) => {
    if (!val) {
      setForm({ identifier: "", password: "" });
      setError("");
    }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border/50 sm:max-w-md">
        <DialogHeader className="items-center">
          <Crown className="h-8 w-8 text-primary mb-2" />
          <DialogTitle className="font-display text-2xl gold-text">{t("auth.welcomeBack")}</DialogTitle>
          <DialogDescription className="text-muted-foreground">{t("auth.signInHint")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login-id">{t("auth.emailOrPhone")}</Label>
            <Input id="login-id" placeholder={t("auth.emailOrPhonePlaceholder")} value={form.identifier} onChange={(e) => setForm({ ...form, identifier: e.target.value })} className="bg-background border-border/50" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="login-pw">{t("auth.password")}</Label>
            <Input id="login-pw" type="password" placeholder={t("auth.passwordPlaceholder")} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="bg-background border-border/50" />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={loading} className="w-full gold-gradient font-semibold">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("header.login")}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {t("auth.dontHaveAccount")}{" "}
            <button type="button" onClick={() => { handleClose(false); onSwitchToRegister(); }} className="text-primary hover:underline">{t("header.register")}</button>
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LoginModal;
