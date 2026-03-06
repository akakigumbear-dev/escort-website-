import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Crown, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSwitchToRegister: () => void;
}

const LoginModal = ({ open, onOpenChange, onSwitchToRegister }: LoginModalProps) => {
  const { login } = useAuth();
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.identifier || !form.password) {
      setError("All fields are required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("http://localhost:3000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Login failed");
      }
      const data = await res.json();
      login({ email: form.identifier });
      handleClose(false);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (val: boolean) => {
    if (!val) {
      setForm({ identifier: "", password: "" });
      setError("");
    }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border/50 sm:max-w-md">
        <DialogHeader className="items-center">
          <Crown className="h-8 w-8 text-primary mb-2" />
          <DialogTitle className="font-display text-2xl gold-text">Welcome Back</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Sign in with your email or phone number
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login-id">Email or Phone</Label>
            <Input
              id="login-id"
              placeholder="your@email.com or +1234567890"
              value={form.identifier}
              onChange={(e) => setForm({ ...form, identifier: e.target.value })}
              className="bg-background border-border/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="login-pw">Password</Label>
            <Input
              id="login-pw"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="bg-background border-border/50"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={loading} className="w-full gold-gradient font-semibold">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Login"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <button type="button" onClick={() => { handleClose(false); onSwitchToRegister(); }} className="text-primary hover:underline">
              Register
            </button>
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LoginModal;
