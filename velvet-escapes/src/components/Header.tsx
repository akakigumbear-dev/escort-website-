import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { io, type Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Sparkles, Heart, MessageCircle, Wallet, Sun, Moon } from "lucide-react";
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
  const [unread, setUnread] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  const onMessagesPageRef = useRef(onMessagesPage);
  onMessagesPageRef.current = onMessagesPage;

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

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, token]);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="font-display text-xl font-bold tracking-wide gold-text">ELITEFUN</span>
          </Link>

          <nav className="flex items-center gap-3" aria-label="Main navigation">
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
        </div>
      </header>

      <RegisterModal open={registerOpen} onOpenChange={setRegisterOpen} onSwitchToLogin={() => setLoginOpen(true)} />
      <LoginModal open={loginOpen} onOpenChange={setLoginOpen} onSwitchToRegister={() => setRegisterOpen(true)} />
      <DepositModal open={depositOpen} onOpenChange={setDepositOpen} />
      <FavoritesModal open={favoritesOpen} onOpenChange={setFavoritesOpen} />
    </>
  );
};

export default Header;
