import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Crown, Loader2 } from "lucide-react";

interface RegisterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSwitchToLogin: () => void;
}

const RegisterModal = ({ open, onOpenChange, onSwitchToLogin }: RegisterModalProps) => {
  const [form, setForm] = useState({ email: "", phoneNumber: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.email || !form.password) {
      setError("Email and password are required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("http://localhost:3000/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Registration failed");
      }
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (val: boolean) => {
    if (!val) {
      setForm({ email: "", phoneNumber: "", password: "" });
      setError("");
      setSuccess(false);
    }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border/50 sm:max-w-md">
        <DialogHeader className="items-center">
          <Crown className="h-8 w-8 text-primary mb-2" />
          <DialogTitle className="font-display text-2xl gold-text">Create Account</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Join the premier companion marketplace
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="text-center py-4">
            <p className="text-foreground font-medium mb-4">Registration successful!</p>
            <Button onClick={() => { handleClose(false); onSwitchToLogin(); }} className="gold-gradient font-semibold">
              Login Now
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reg-email">Email</Label>
              <Input
                id="reg-email"
                type="email"
                placeholder="your@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="bg-background border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-phone">Phone Number</Label>
              <Input
                id="reg-phone"
                type="tel"
                placeholder="+1 234 567 890"
                value={form.phoneNumber}
                onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                className="bg-background border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-password">Password</Label>
              <Input
                id="reg-password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="bg-background border-border/50"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full gold-gradient font-semibold">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Register"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <button type="button" onClick={() => { handleClose(false); onSwitchToLogin(); }} className="text-primary hover:underline">
                Login
              </button>
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RegisterModal;
