import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Eye, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchTopViewedEscorts } from "@/lib/escorts-api";
import { buildImageUrl, PLACEHOLDER_THUMBNAIL } from "@/lib/api";

const TopViewed = () => {
  const { t } = useTranslation();
  const { data: topViewed = [], isLoading } = useQuery({
    queryKey: ["escorts", "top-viewed"],
    queryFn: fetchTopViewedEscorts,
  });

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-bold text-foreground">{t("topViewed.title")}</h2>
      </div>

      <div className="space-y-2">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg bg-card border border-border/50 p-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))
          : topViewed.map((escort, i) => (
              <Link
                key={escort.id}
                to={`/escort/${escort.id}`}
                className="group flex items-center gap-3 rounded-lg bg-card border border-border/50 p-3 transition-all duration-200 hover:border-primary/30 hover:bg-surface-hover"
              >
                <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full">
                   <img
                     src={escort.profilePicture ? buildImageUrl(escort.profilePicture.picturePath) : PLACEHOLDER_THUMBNAIL}
                     alt={escort.username}
                     className="h-full w-full object-cover"
                     loading="lazy"
                   />
                  <span className="absolute -top-0.5 -left-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                    {escort.username}
                  </p>
                  <p className="text-xs text-muted-foreground">{escort.city}</p>
                </div>

                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Eye className="h-3 w-3" />
                  {escort.viewCount.toLocaleString()}
                </div>
              </Link>
            ))}
        {!isLoading && topViewed.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">{t("topViewed.noData")}</p>
        )}
      </div>
    </div>
  );
};

export default TopViewed;
