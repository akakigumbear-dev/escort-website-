import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useFavorites } from "@/contexts/FavoritesContext";
import { buildImageUrl, PLACEHOLDER_THUMBNAIL } from "@/lib/api";
import { Heart, X } from "lucide-react";

interface FavoritesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function FavoritesModal({ open, onOpenChange }: FavoritesModalProps) {
  const { t } = useTranslation();
  const { favorites, removeFavorite } = useFavorites();
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border/50 sm:max-w-sm max-h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 pb-2 border-b border-border/50">
          <DialogTitle className="font-display text-lg flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary fill-primary" />
            {t("favorites.title")}
            {favorites.length > 0 && (
              <span className="text-xs text-muted-foreground font-normal">({favorites.length})</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-2">
          {favorites.length === 0 ? (
            <div className="py-10 text-center">
              <Heart className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{t("favorites.empty")}</p>
              <p className="text-xs text-muted-foreground/70 mt-1">{t("favorites.emptyHint")}</p>
            </div>
          ) : (
            <ul className="space-y-1">
              {favorites.map((escort) => (
                <li key={escort.id} className="flex items-center gap-3 rounded-lg hover:bg-muted/50 transition-colors p-2">
                  <Link
                    to={`/escort/${escort.id}`}
                    onClick={() => onOpenChange(false)}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <img
                      src={
                        failedIds.has(escort.id) || !escort.profilePicturePath
                          ? PLACEHOLDER_THUMBNAIL
                          : buildImageUrl(escort.profilePicturePath)
                      }
                      alt={escort.username}
                      className="h-10 w-10 rounded-full object-cover border border-border/50 flex-shrink-0"
                      onError={() => setFailedIds((prev) => new Set(prev).add(escort.id))}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{escort.username}</p>
                      <p className="text-xs text-muted-foreground">{escort.city}</p>
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={() => removeFavorite(escort.id)}
                    className="flex-shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    aria-label={`Remove ${escort.username}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
