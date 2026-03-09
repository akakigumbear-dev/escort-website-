import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/Header";
import SEO from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { fetchEscortById } from "@/lib/escorts-api";
import { subscribeToEscort } from "@/lib/subscriptions-api";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Lock, Loader2, Wallet } from "lucide-react";

export default function Payment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated, user, refreshBalance } = useAuth();
  const [completed, setCompleted] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const { data: escort, isLoading, error } = useQuery({
    queryKey: ["escort", id],
    queryFn: () => fetchEscortById(id!),
    enabled: !!id && isAuthenticated,
  });

  const payMutation = useMutation({
    mutationFn: () => subscribeToEscort(id!),
    onSuccess: async () => {
      setPayError(null);
      setCompleted(true);
      await refreshBalance();
      queryClient.invalidateQueries({ queryKey: ["escort", id] });
      setTimeout(() => navigate(id ? `/escort/${id}` : "/"), 1500);
    },
    onError: (err: Error) => setPayError(err.message || "Subscription failed"),
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-20 text-center">
          <p className="text-muted-foreground">Please log in to subscribe.</p>
          <Link to="/" className="mt-4 inline-block text-primary hover:underline">Back to home</Link>
        </div>
      </div>
    );
  }

  if (isLoading || !escort) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-12 max-w-md mx-auto">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !id) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-20 text-center">
          <p className="text-muted-foreground">Profile not found.</p>
          <Link to="/" className="mt-4 inline-block text-primary hover:underline">Back to home</Link>
        </div>
      </div>
    );
  }

  const price = escort.subscriptionPriceGel != null ? escort.subscriptionPriceGel : 29;
  const balance = Number(user?.balance ?? 0);
  const canAfford = balance >= price;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`Subscribe to ${escort.username}`}
        description={`Subscribe to ${escort.username} on ELITEFUN for exclusive content and direct messaging.`}
        noindex
      />
      <Header />
      <main className="container py-8 max-w-md mx-auto">
        <Link to={id ? `/escort/${id}` : "/"} className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to profile
        </Link>

        <div className="rounded-xl border border-border/50 bg-card p-6 space-y-6">
          <h1 className="font-display text-xl font-semibold text-foreground flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" /> Subscribe to {escort.username}
          </h1>
          <p className="text-sm text-muted-foreground">
            30-day subscription. Access exclusive content and direct messaging.
          </p>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold gold-text">{price}₾</span>
            <span className="text-muted-foreground text-sm">/ month</span>
          </div>

          <div className="flex items-center gap-2 text-sm rounded-lg border border-border/50 bg-muted/50 px-4 py-3">
            <Wallet className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Your balance:</span>
            <span className={`font-semibold ${canAfford ? "text-foreground" : "text-destructive"}`}>
              {balance.toFixed(2)} ₾
            </span>
            {!canAfford && (
              <span className="text-xs text-destructive ml-auto">
                Need {(price - balance).toFixed(2)} ₾ more
              </span>
            )}
          </div>

          {payError && (
            <div className="rounded-lg bg-destructive/15 text-destructive px-4 py-3 text-sm font-medium">
              {payError}
            </div>
          )}
          {completed ? (
            <div className="rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-4 py-3 text-sm font-medium">
              Subscribed! Redirecting...
            </div>
          ) : (
            <button
              type="button"
              onClick={() => { setPayError(null); payMutation.mutate(); }}
              disabled={payMutation.isPending || !canAfford}
              className="gold-gradient w-full inline-flex items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-semibold text-primary-foreground shadow hover:opacity-90 disabled:opacity-70"
            >
              {payMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>Pay {price}₾ from balance</>
              )}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
