import { Link } from "react-router-dom";
import { Eye, TrendingUp } from "lucide-react";
import { topViewed } from "@/data/escorts";

const TopViewed = () => {
  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-bold text-foreground">Top Viewed</h2>
      </div>

      <div className="space-y-2">
        {topViewed.map((escort, i) => (
          <Link
            key={escort.id}
            to={`/escort/${escort.id}`}
            className="group flex items-center gap-3 rounded-lg bg-card border border-border/50 p-3 transition-all duration-200 hover:border-primary/30 hover:bg-surface-hover"
          >
            <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full">
              <img
                src={escort.image}
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
              {escort.views.toLocaleString()}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default TopViewed;
