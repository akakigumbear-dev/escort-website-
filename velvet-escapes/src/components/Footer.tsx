import { useTranslation } from "react-i18next";
import { Sparkles, MapPin, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchFilterOptions } from "@/lib/escorts-api";
import { Link } from "react-router-dom";

interface FooterProps {
  selectedCity: string | null;
  onCitySelect: (city: string | null) => void;
}

const Footer = ({ selectedCity, onCitySelect }: FooterProps) => {
  const { t } = useTranslation();

  const { data: filterOptions, isLoading } = useQuery({
    queryKey: ["escort", "filter-options"],
    queryFn: fetchFilterOptions,
    staleTime: 5 * 60 * 1000,
  });

  const cities = filterOptions?.cities ?? [];

  return (
    <footer className="border-t border-border/50 bg-card/50 backdrop-blur-sm mt-12">
      <div className="container py-10">
        <div className="flex flex-col items-center gap-6">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-display text-lg font-bold gold-text">ELITEFUN</span>
          </Link>

          {/* SEO text block - hidden visually but readable by search engines */}
          <div className="sr-only" aria-hidden="true">
            <h2>Escort Services in Georgia | ესკორტი საქართველო</h2>
            <p>Escort girls Tbilisi, Batumi, Kutaisi | ესკორტ გოგოები თბილისი, ბათუმი, ქუთაისი</p>
            <p>Premium escort service Georgia | პრემიუმ ესკორტ სერვისი საქართველო</p>
            <p>Escort gogoebi, escort girls, companion services | ესკორტ გოგოები, კომპანიონ სერვისი</p>
          </div>

          {/* Cities from API */}
          <nav className="text-center space-y-3 w-full max-w-2xl" aria-label="Browse by city">
            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t("footer.browseByCity")}</span>
            </div>
            {isLoading ? (
              <div className="flex justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="City filters">
                {cities.map((city) => (
                  <button
                    key={city}
                    onClick={() => onCitySelect(selectedCity === city ? null : city)}
                    aria-pressed={selectedCity === city}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                      selectedCity === city
                        ? "gold-gradient text-primary-foreground shadow-md"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:text-foreground"
                    }`}
                  >
                    {city}
                  </button>
                ))}
                {selectedCity && (
                  <button
                    onClick={() => onCitySelect(null)}
                    className="px-4 py-1.5 rounded-full text-sm font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                  >
                    {t("footer.clear")}
                  </button>
                )}
              </div>
            )}
          </nav>

          {/* SEO keyword links - visible, natural looking */}
          {cities.length > 0 && (
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground/60 max-w-2xl text-center">
              {cities.map((city) => (
                <span key={city}>
                  Escort {city} · ესკორტი {city}
                </span>
              ))}
            </div>
          )}

          {/* Copyright */}
          <p className="text-xs text-muted-foreground/50 mt-2">
            {t("footer.copyright", { year: new Date().getFullYear() })}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
