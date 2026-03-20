import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { io, type Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Sparkles, Heart, MessageCircle, Wallet, Sun, Moon, Menu, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { API_BASE_URL } from "@/lib/api";
import { getUnreadCount } from "@/lib/messages-api";
import RegisterModal from "@/components/RegisterModal";
import LoginModal from "@/components/LoginModal";
import DepositModal from "@/components/DepositModal";
import FavoritesModal from "@/components/FavoritesModal";
import ProfileDropdown from "@/components/ProfileDropdown";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useTheme } from "@/contexts/ThemeContext";

const Header = () => {
  const { t } = useTranslation();
  const { isAuthenticated, user, token } = useAuth();
  const { favorites } = useFavorites();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const onMessagesPage = location.pathname === "/messages";
  const [registerOpen, setRegisterOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  const onMessagesPageRef = useRef(onMessagesPage);
  onMessagesPageRef.current = onMessagesPage;

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Fetch unread count on login
  useEffect(() => {
    if (!isAuthenticated || !token) {
      setUnread(0);
      return;
    }
    getUnreadCount().then(setUnread).catch(() => setUnread(0));
  }, [isAuthenticated, token]);

  // Clear badge instantly when entering messages page; re-fetch when leaving
  useEffect(() => {
    if (onMessagesPage) {
      setUnread(0);
    } else if (isAuthenticated && token) {
      getUnreadCount().then(setUnread).catch(() => {});
    }
  }, [onMessagesPage, isAuthenticated, token]);

  // Listen for conversations being marked as read inside the Messages page
  useEffect(() => {
    const handler = () => {
      if (onMessagesPageRef.current) {
        setUnread(0);
      } else {
        getUnreadCount().then(setUnread).catch(() => {});
      }
    };
    window.addEventListener("messages-read", handler);
    return () => window.removeEventListener("messages-read", handler);
  }, []);

  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated || !token) return;
    const socket = io(API_BASE_URL + "/messages", {
      auth: { token },
      path: "/socket.io",
    });
    socketRef.current = socket;

    socket.on("notification", (payload: { unreadCount?: number }) => {
      if (onMessagesPageRef.current) return;
      if (payload.unreadCount != null) {
        setUnread(payload.unreadCount);
      } else {
        setUnread((prev) => prev + 1);
      }
    });

    socket.on("user-status", () => {
      queryClient.invalidateQueries({ queryKey: ["escorts", "online"] });
    });

    const onBeforeUnload = () => {
      socket.emit("go-offline");
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    const onLogout = () => {
      socket.emit("go-offline");
    };
    window.addEventListener("auth-logout", onLogout);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("auth-logout", onLogout);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, token, queryClient]);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            <span className="font-display text-lg sm:text-xl font-bold tracking-wide gold-text">ELITEFUN</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-3" aria-label="Main navigation">
            <LanguageSwitcher />
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => setDepositOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-sm font-medium text-foreground hover:bg-primary/10 transition-colors"
                aria-label={t("deposit.title")}
              >
                <Wallet className="h-4 w-4 text-primary" />
                <span className="gold-text font-semibold">{Number(user?.balance ?? 0).toFixed(0)} ₾</span>
              </button>
            )}
            {isAuthenticated && (
              <Link
                to="/messages"
                className="relative flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                aria-label="Messages"
                onClick={() => setUnread(0)}
              >
                <MessageCircle className="h-5 w-5" />
                {!onMessagesPage && unread > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white animate-pulse">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </Link>
            )}
            <button
              type="button"
              onClick={() => setFavoritesOpen(true)}
              className="relative flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label={t("header.favorites")}
            >
              <Heart className="h-5 w-5" fill={favorites.length > 0 ? "currentColor" : "none"} />
              {favorites.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {favorites.length}
                </span>
              )}
            </button>
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
          </nav>

          {/* Mobile nav - essential icons + hamburger */}
          <div className="flex md:hidden items-center gap-1.5">
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => setDepositOpen(true)}
                className="flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/5 px-2 py-1 text-xs font-medium"
                aria-label={t("deposit.title")}
              >
                <Wallet className="h-3.5 w-3.5 text-primary" />
                <span className="gold-text font-semibold">{Number(user?.balance ?? 0).toFixed(0)} ₾</span>
              </button>
            )}
            {isAuthenticated && (
              <Link
                to="/messages"
                className="relative flex items-center justify-center rounded-lg p-2 text-muted-foreground"
                aria-label="Messages"
                onClick={() => setUnread(0)}
              >
                <MessageCircle className="h-5 w-5" />
                {!onMessagesPage && unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white animate-pulse">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </Link>
            )}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-muted transition-colors"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu overlay */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl animate-in slide-in-from-top-2 duration-200">
            <div className="container px-4 py-4 space-y-3">
              {/* Theme + Language row */}
              <div className="flex items-center justify-between">
                <LanguageSwitcher />
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="flex items-center justify-center rounded-lg p-2.5 text-muted-foreground hover:bg-muted transition-colors"
                  aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                >
                  {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </button>
              </div>

              {/* Favorites */}
              <button
                type="button"
                onClick={() => { setFavoritesOpen(true); setMobileMenuOpen(false); }}
                className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                <Heart className="h-5 w-5 text-primary" fill={favorites.length > 0 ? "currentColor" : "none"} />
                {t("header.favorites")}
                {favorites.length > 0 && (
                  <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {favorites.length}
                  </span>
                )}
              </button>

              {/* Auth section */}
              {isAuthenticated ? (
                <div className="pt-2 border-t border-border/50">
                  <ProfileDropdown mobile onAction={() => setMobileMenuOpen(false)} />
                </div>
              ) : (
                <div className="flex gap-2 pt-2 border-t border-border/50">
                  <Button variant="outline" className="flex-1" onClick={() => { setLoginOpen(true); setMobileMenuOpen(false); }}>
                    {t("header.login")}
                  </Button>
                  <Button className="flex-1 gold-gradient font-semibold" onClick={() => { setRegisterOpen(true); setMobileMenuOpen(false); }}>
                    {t("header.register")}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      <RegisterModal open={registerOpen} onOpenChange={setRegisterOpen} onSwitchToLogin={() => setLoginOpen(true)} />
      <LoginModal open={loginOpen} onOpenChange={setLoginOpen} onSwitchToRegister={() => setRegisterOpen(true)} />
      <DepositModal open={depositOpen} onOpenChange={setDepositOpen} />
      <FavoritesModal open={favoritesOpen} onOpenChange={setFavoritesOpen} />
    </>
  );
};

export default Header;
