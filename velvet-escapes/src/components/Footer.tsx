import { Crown, MapPin } from "lucide-react";

const CITIES = ["Tbilisi", "Batumi", "Kutaisi", "Rustavi", "Zugdidi"];

interface FooterProps {
  selectedCity: string | null;
  onCitySelect: (city: string | null) => void;
}

const Footer = ({ selectedCity, onCitySelect }: FooterProps) => {
  return (
    <footer className="border-t border-border/50 bg-card/50 backdrop-blur-sm mt-12">
      <div className="container py-10">
        <div className="flex flex-col items-center gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            <span className="font-display text-lg font-bold gold-text">ÉLITE</span>
          </div>

          {/* Cities */}
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span>Browse by City</span>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {CITIES.map((city) => (
                <button
                  key={city}
                  onClick={() => onCitySelect(selectedCity === city ? null : city)}
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
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Copyright */}
          <p className="text-xs text-muted-foreground/50 mt-4">
            © {new Date().getFullYear()} Élite Companions. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
