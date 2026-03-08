import { Link } from "react-router-dom";
import Header from "@/components/Header";
import { useFavorites } from "@/contexts/FavoritesContext";
import { buildImageUrl } from "@/lib/api";
import { Heart } from "lucide-react";

const PLACEHOLDER = "/placeholder.svg";

const Favorites = () => {
  const { favorites } = useFavorites();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-8">
        <h1 className="font-display text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
          <Heart className="h-6 w-6 text-primary fill-primary" />
          Favorites
        </h1>
        {favorites.length === 0 ? (
          <div className="rounded-xl border border-border/50 bg-card p-12 text-center">
            <Heart className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">No saved profiles yet</p>
            <p className="text-sm text-muted-foreground/80 mt-1">Click &quot;Save Profile&quot; on escort pages to add them here</p>
            <Link to="/" className="mt-4 inline-block text-primary hover:underline">Browse escorts</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {favorites.map((escort) => (
              <Link
                key={escort.id}
                to={`/escort/${escort.id}`}
                className="group block overflow-hidden rounded-lg border border-border/50 bg-card transition-all hover:border-primary/30"
              >
                <div className="aspect-[3/4] overflow-hidden">
                  <img
                    src={escort.profilePicturePath ? buildImageUrl(escort.profilePicturePath) : PLACEHOLDER}
                    alt={escort.username}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                </div>
                <div className="p-3">
                  <h3 className="font-medium text-foreground truncate">{escort.username}</h3>
                  <p className="text-xs text-muted-foreground">{escort.city}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Favorites;
