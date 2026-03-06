import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import RegisterModal from "@/components/RegisterModal";
import LoginModal from "@/components/LoginModal";
import ProfileDropdown from "@/components/ProfileDropdown";

const Header = () => {
  const { isAuthenticated } = useAuth();
  const [registerOpen, setRegisterOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Crown className="h-6 w-6 text-primary" />
            <span className="font-display text-xl font-bold tracking-wide gold-text">ÉLITE</span>
          </Link>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <ProfileDropdown />
            ) : (
              <>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={() => setLoginOpen(true)}>
                  Login
                </Button>
                <Button size="sm" className="gold-gradient font-semibold" onClick={() => setRegisterOpen(true)}>
                  Register
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
