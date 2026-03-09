import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Sparkles, Heart, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import RegisterModal from "@/components/RegisterModal";
import LoginModal from "@/components/LoginModal";
import ProfileDropdown from "@/components/ProfileDropdown";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const Header = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { favorites } = useFavorites();
  const [registerOpen, setRegisterOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="font-display text-xl font-bold tracking-wide gold-text">ELITEFUN</span>
          </Link>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            {isAuthenticated && (
              <Link
                to="/messages"
                className="flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                aria-label="Messages"
              >
                <MessageCircle className="h-5 w-5" />
              </Link>
            )}
            <Link
              to="/favorites"
              className="relative flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label={t("header.favorites")}
            >
              <Heart className="h-5 w-5" fill={favorites.length > 0 ? "currentColor" : "none"} />
              {favorites.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {favorites.length}
                </span>
              )}
            </Link>
            {isAuthenticated ? (
              <ProfileDropdown />
            ) : (
              <>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={() => setLoginOpen(true)}>
                  {t("header.login")}
                </Button>
                <Button size="sm" className="gold-gradient font-semibold" onClick={() => setRegisterOpen(true)}>
                  {t("header.register")}
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <RegisterModal open={registerOpen} onOpenChange={setRegisterOpen} onSwitchToLogin={() => setLoginOpen(true)} />
      <LoginModal open={loginOpen} onOpenChange={setLoginOpen} onSwitchToRegister={() => setRegisterOpen(true)} />
    </>
  );
};

export default Header;
