import { useTranslation } from "react-i18next";
import { Sparkles, MapPin } from "lucide-react";

const CITIES = ["Tbilisi", "Batumi", "Kutaisi", "Rustavi", "Zugdidi"];

interface FooterProps {
  selectedCity: string | null;
  onCitySelect: (city: string | null) => void;
}

const Footer = ({ selectedCity, onCitySelect }: FooterProps) => {
  const { t } = useTranslation();
  return (
    <footer className="border-t border-border/50 bg-card/50 backdrop-blur-sm mt-12">
      <div className="container py-10">
        <div className="flex flex-col items-center gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-display text-lg font-bold gold-text">ELITEFUN</span>
          </div>

          {/* Cities */}
          <nav className="text-center space-y-3" aria-label="Browse by city">
            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t("footer.browseByCity")}</span>
            </div>
            <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="City filters">
              {CITIES.map((city) => (
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
          </nav>

          {/* Copyright */}
          <p className="text-xs text-muted-foreground/50 mt-4">
            {t("footer.copyright", { year: new Date().getFullYear() })}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
