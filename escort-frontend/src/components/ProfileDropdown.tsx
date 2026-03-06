import { useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { User, LogOut, Star } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import BecomeEscortModal from "@/components/BecomeEscortModal";

const ProfileDropdown = () => {
  const { user, logout } = useAuth();
  const [escortModalOpen, setEscortModalOpen] = useState(false);

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
          <DropdownMenuItem onClick={() => setEscortModalOpen(true)} className="cursor-pointer">
            <Star className="h-4 w-4 mr-2 text-primary" /> Become Escort
          </DropdownMenuItem>
          <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
            <LogOut className="h-4 w-4 mr-2" /> Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <BecomeEscortModal open={escortModalOpen} onOpenChange={setEscortModalOpen} />
    </>
  );
};

export default ProfileDropdown;
