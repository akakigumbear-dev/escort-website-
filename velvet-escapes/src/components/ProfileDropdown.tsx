import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { User, LogOut, Star, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import BecomeEscortModal from "@/components/BecomeEscortModal";

const ProfileDropdown = ({ mobile, onAction }: { mobile?: boolean; onAction?: () => void }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout, escortProfile } = useAuth();
  const [escortModalOpen, setEscortModalOpen] = useState(false);

  const handleAction = (fn: () => void) => {
    fn();
    onAction?.();
  };

  // Mobile: render links as a list instead of dropdown
  if (mobile) {
    return (
      <>
        <div className="space-y-1">
          <div className="px-3 py-1.5 text-xs text-muted-foreground truncate">{user?.email}</div>
          <Link
            to="/account"
            onClick={onAction}
            className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            <Settings className="h-5 w-5 text-primary" /> {t("account.title")}
          </Link>
          {escortProfile ? (
            <Link
              to="/profile"
              onClick={onAction}
              className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              <User className="h-5 w-5 text-primary" /> {t("profile.myProfileTitle")}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => handleAction(() => setEscortModalOpen(true))}
              className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Star className="h-5 w-5 text-primary" /> {t("auth.becomeEscort")}
            </button>
          )}
          <button
            type="button"
            onClick={() => handleAction(logout)}
            className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-muted transition-colors"
          >
            <LogOut className="h-5 w-5" /> {t("auth.logout")}
          </button>
        </div>

        <BecomeEscortModal open={escortModalOpen} onOpenChange={setEscortModalOpen} onComplete={() => { setEscortModalOpen(false); onAction?.(); navigate("/profile"); }} />
      </>
    );
  }

  // Desktop: dropdown menu
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full border border-primary/30 bg-primary/10 hover:bg-primary/20">
            <User className="h-4 w-4 text-primary" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 bg-card border-border/50">
          <div className="px-3 py-2 text-xs text-muted-foreground truncate">{user?.email}</div>
          <DropdownMenuSeparator className="bg-border/50" />
          <DropdownMenuItem asChild>
            <Link to="/account" className="cursor-pointer flex items-center">
              <Settings className="h-4 w-4 mr-2 text-primary" /> {t("account.title")}
            </Link>
          </DropdownMenuItem>
          {escortProfile ? (
            <DropdownMenuItem asChild>
              <Link to="/profile" className="cursor-pointer flex items-center">
                <User className="h-4 w-4 mr-2 text-primary" /> {t("profile.myProfileTitle")}
              </Link>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => setEscortModalOpen(true)} className="cursor-pointer">
              <Star className="h-4 w-4 mr-2 text-primary" /> {t("auth.becomeEscort")}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator className="bg-border/50" />
          <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
            <LogOut className="h-4 w-4 mr-2" /> {t("auth.logout")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <BecomeEscortModal open={escortModalOpen} onOpenChange={setEscortModalOpen} onComplete={() => { setEscortModalOpen(false); navigate("/profile"); }} />
    </>
  );
};

export default ProfileDropdown;
