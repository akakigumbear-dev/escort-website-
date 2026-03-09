import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import SEO from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { getMySubscriptions, unsubscribeFromEscort } from "@/lib/subscriptions-api";
import {
  Lock,
  Eye,
  EyeOff,
  Loader2,
  Crown,
  Trash2,
  CalendarDays,
  Mail,
  Phone,
  Wallet,
} from "lucide-react";

interface SubscriptionItem {
  id: string;
  escortProfileId: string;
  escortUsername: string;
  status: string;
  startDate: string;
  endDate: string | null;
}

export default function MyAccount() {
  const { t } = useTranslation();
  const { isAuthenticated, user, refreshBalance } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  const [subs, setSubs] = useState<SubscriptionItem[]>([]);
  const [subsLoading, setSubsLoading] = useState(true);
  const [unsubbing, setUnsubbing] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    getMySubscriptions()
      .then((data) => setSubs(data as SubscriptionItem[]))
      .catch(() => setSubs([]))
      .finally(() => setSubsLoading(false));
  }, [isAuthenticated]);

  const handleChangePassword = async () => {
    setPwError(null);
    setPwSuccess(false);
    if (!currentPassword || !newPassword) {
      setPwError(t("account.fillAllFields"));
      return;
    }
    if (newPassword.length < 6) {
      setPwError(t("account.passwordMinLength"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError(t("account.passwordsDoNotMatch"));
      return;
    }
    setPwLoading(true);
    try {
      await apiFetch("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setPwSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPwError(err.message || t("auth.somethingWrong"));
    } finally {
      setPwLoading(false);
    }
  };

  const handleUnsubscribe = async (escortProfileId: string) => {
    setUnsubbing(escortProfileId);
    try {
      await unsubscribeFromEscort(escortProfileId);
      setSubs((prev) => prev.filter((s) => s.escortProfileId !== escortProfileId));
      await refreshBalance();
    } catch {
      // ignore
    } finally {
      setUnsubbing(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-20 text-center">
          <p className="text-muted-foreground">{t("account.loginRequired")}</p>
          <Link to="/" className="mt-4 inline-block text-primary hover:underline">{t("profile.backToHome")}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO title={t("account.title")} noindex />
      <Header />
      <main className="container py-8 max-w-2xl mx-auto space-y-8">
        <h1 className="font-display text-2xl font-bold text-foreground">{t("account.title")}</h1>

        {/* User info */}
        <div className="rounded-xl border border-border/50 bg-card p-6 space-y-3">
          <h2 className="font-display text-lg font-semibold text-foreground">{t("account.info")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4 text-primary" />
              <span>{user?.email}</span>
            </div>
            {user?.phoneNumber && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4 text-primary" />
                <span>{user.phoneNumber}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Wallet className="h-4 w-4 text-primary" />
              <span>{t("account.balance")}: <span className="font-semibold text-foreground">{Number(user?.balance ?? 0).toFixed(2)} ₾</span></span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Crown className="h-4 w-4 text-primary" />
              <span>{t("account.role")}: <span className="font-semibold text-foreground">{user?.role ?? "CLIENT"}</span></span>
            </div>
          </div>
        </div>

        {/* Change password */}
        <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" /> {t("account.changePassword")}
          </h2>

          <div className="space-y-3 max-w-sm">
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                placeholder={t("account.currentPassword")}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                placeholder={t("account.newPassword")}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <input
              type="password"
              placeholder={t("account.confirmPassword")}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm"
            />
          </div>

          {pwError && (
            <div className="rounded-lg bg-destructive/15 text-destructive px-4 py-2 text-sm font-medium">
              {pwError}
            </div>
          )}
          {pwSuccess && (
            <div className="rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-4 py-2 text-sm font-medium">
              {t("account.passwordChanged")}
            </div>
          )}

          <button
            type="button"
            onClick={handleChangePassword}
            disabled={pwLoading}
            className="gold-gradient inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:opacity-90 disabled:opacity-70"
          >
            {pwLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("account.updatePassword")}
          </button>
        </div>

        {/* Subscriptions */}
        <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" /> {t("account.subscriptions")}
          </h2>

          {subsLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : subs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">{t("account.noSubscriptions")}</p>
          ) : (
            <div className="space-y-3">
              {subs.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/30 bg-muted/30 px-4 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/escort/${sub.escortProfileId}`}
                      className="font-medium text-sm text-foreground hover:text-primary transition-colors truncate block"
                    >
                      {sub.escortUsername}
                    </Link>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <CalendarDays className="h-3 w-3" />
                      <span>
                        {new Date(sub.startDate).toLocaleDateString()}
                        {sub.endDate && ` — ${new Date(sub.endDate).toLocaleDateString()}`}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUnsubscribe(sub.escortProfileId)}
                    disabled={unsubbing === sub.escortProfileId}
                    className="flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50"
                  >
                    {unsubbing === sub.escortProfileId ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                    {t("account.unsubscribe")}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
