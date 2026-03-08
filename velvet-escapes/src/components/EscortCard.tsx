import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Crown, ShieldCheck, MapPin } from "lucide-react";
import type { EscortListItem } from "@/lib/escorts-api";
import { buildImageUrl } from "@/lib/api";

interface EscortCardProps {
  escort: EscortListItem;
  compact?: boolean;
}

const PLACEHOLDER = "/placeholder.svg";

const EscortCard = ({ escort, compact }: EscortCardProps) => {
  const image = escort.profilePicture ? buildImageUrl(escort.profilePicture.picturePath) : PLACEHOLDER;

  return (
    <Link
      to={`/escort/${escort.id}`}
      className={`group relative block overflow-hidden rounded-lg bg-card border border-border/50 transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_30px_-5px_hsl(var(--gold)/0.15)] ${compact ? "w-full" : ""}`}
    >
      <div className="relative overflow-hidden aspect-[3/4]">
        <img
          src={image}
          alt={escort.username}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />

        <div className="absolute top-2 left-2 flex gap-1.5">
          {escort.isVip && (
            <span className="flex items-center gap-1 rounded-full gold-gradient px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
              <Crown className="h-3 w-3" /> VIP
            </span>
          )}
          {escort.isVerified && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
              <ShieldCheck className="h-3 w-3" /> Verified
            </span>
          )}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-3">
        <h3 className="font-display text-lg font-semibold text-foreground">
          {escort.username}
        </h3>
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 text-primary" />
          {escort.city}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1">
          <Badge variant="secondary" className="text-[10px] bg-secondary/80 border-0">
            {escort.gender}
          </Badge>
          <Badge variant="secondary" className="text-[10px] bg-secondary/80 border-0">
            {escort.ethnicity}
          </Badge>
        </div>
      </div>
    </Link>
  );
};

export default EscortCard;
