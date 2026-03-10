import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Wifi } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchOnlineEscorts } from "@/lib/escorts-api";
import { buildImageUrl, PLACEHOLDER_THUMBNAIL } from "@/lib/api";
import { OnlineDot, OnlineLabel } from "@/components/OnlineStatus";

const OnlineNow = () => {
  const { t } = useTranslation();
  const { data: online = [], isLoading } = useQuery({
    queryKey: ["escorts", "online"],
    queryFn: fetchOnlineEscorts,
    refetchInterval: 60_000,
  });

  if (!isLoading && online.length === 0) return null;

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Wifi className="h-5 w-5 text-emerald-500" />
        <h2 className="font-display text-xl font-bold text-foreground">{t("onlineNow.title")}</h2>
        <span className="ml-auto flex h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" />
      </div>

      <div className="space-y-2">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg bg-card border border-border/50 p-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))
          : online.map((escort) => (
              <Link
                key={escort.id}
                to={`/escort/${escort.id}`}
                className="group flex items-center gap-3 rounded-lg bg-card border border-emerald-500/20 p-3 transition-all duration-200 hover:border-emerald-500/40 hover:bg-surface-hover"
              >
                <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full ring-2 ring-emerald-500/40">
                  <img
                    src={escort.profilePicture ? buildImageUrl(escort.profilePicture.picturePath) : PLACEHOLDER_THUMBNAIL}
                    alt={escort.username}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-card shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground group-hover:text-emerald-500 transition-colors">
                    {escort.username}
                  </p>
                  <p className="text-xs text-muted-foreground">{escort.city}</p>
                </div>

                <OnlineLabel lastSeen={escort.lastSeen} isOnline={escort.isOnline} />
              </Link>
            ))}
      </div>
    </div>
  );
};

export default OnlineNow;
