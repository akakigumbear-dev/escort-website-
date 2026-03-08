import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { fetchEscortById } from "@/lib/escorts-api";
import { subscribeToEscort } from "@/lib/subscriptions-api";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Lock, Loader2 } from "lucide-react";

export default function Payment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const [completed, setCompleted] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const { data: escort, isLoading, error } = useQuery({
    queryKey: ["escort", id],
    queryFn: () => fetchEscortById(id!),
    enabled: !!id && isAuthenticated,
  });

  const payMutation = useMutation({
    mutationFn: () => subscribeToEscort(id!),
    onSuccess: () => {
      setPayError(null);
      setCompleted(true);
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-8 max-w-md mx-auto">
        <Link to={id ? `/escort/${id}` : "/"} className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to profile
        </Link>

        <div className="rounded-xl border border-border/50 bg-card p-6 space-y-6">
          <h1 className="font-display text-xl font-semibold text-foreground flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" /> Subscribe to {escort.username}
          </h1>
          <p className="text-sm text-muted-foreground">
            One-time subscription. You will get access to exclusive content and direct messaging.
          </p>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold gold-text">{price}₾</span>
            <span className="text-muted-foreground text-sm">/ month</span>
          </div>

          {payError && (
            <div className="rounded-lg bg-destructive/15 text-destructive px-4 py-3 text-sm font-medium">
              {payError}
            </div>
          )}
          {completed ? (
            <div className="rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-4 py-3 text-sm font-medium">
              Payment successful. Redirecting...
            </div>
          ) : (
            <button
              type="button"
              onClick={() => { setPayError(null); payMutation.mutate(); }}
              disabled={payMutation.isPending}
              className="gold-gradient w-full inline-flex items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-semibold text-primary-foreground shadow hover:opacity-90 disabled:opacity-70"
            >
              {payMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>Complete payment — {price}₾</>
              )}
            </button>
          )}
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          This is a demo payment. No real charge.
        </p>
      </div>
    </div>
  );
}
