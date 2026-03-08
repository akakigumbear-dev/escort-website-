import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Crown, Check, DollarSign } from "lucide-react";
import { useAuth, type EscortProfile as AuthEscortProfile } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";

interface BecomeEscortModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

const SERVICES = ["DINNER", "EVENT", "TRAVEL", "CITY_GUIDE", "BUSINESS_EVENT"];
const ETHNICITIES = ["EUROPEAN", "ASIAN", "LATIN", "MIXED", "OTHER"];
const GENDERS = ["FEMALE", "MALE", "OTHER"];
const LANGUAGES = ["EN", "KA", "RU", "TR", "DE"];

const BecomeEscortModal = ({ open, onOpenChange, onComplete }: BecomeEscortModalProps) => {
  const { setEscortProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [profile, setProfile] = useState({
    username: "",
    city: "",
    address: "",
    phoneNumber: "",
    services: [] as string[],
    height: "",
    weight: "",
    ethnicity: "",
    gender: "",
    languages: [] as string[],
  });

  const [inCall, setInCall] = useState({ price30min: "", price1hour: "", priceWholeNight: "" });
  const [outCall, setOutCall] = useState({ price30min: "", price1hour: "", priceWholeNight: "" });
  const [completed, setCompleted] = useState(false);

  const toggleMulti = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!profile.username || !profile.city || !profile.gender || !profile.ethnicity || !profile.phoneNumber?.trim()) {
      setError("Please fill all required fields (username, city, gender, ethnicity, phone).");
      return;
    }
    setLoading(true);
    try {
      const body = {
        username: String(profile.username).trim(),
        city: String(profile.city).trim(),
        address: String(profile.address ?? "").trim(),
        phoneNumber: String(profile.phoneNumber).trim(),
        services: Array.isArray(profile.services) ? profile.services : [],
        height: profile.height !== "" && profile.height != null ? Number(profile.height) : undefined,
        weight: profile.weight !== "" && profile.weight != null ? Number(profile.weight) : undefined,
        ethnicity: String(profile.ethnicity).trim() || undefined,
        gender: String(profile.gender).trim(),
        languages: Array.isArray(profile.languages) ? profile.languages : [],
      };
      const saved = await apiFetch("/profile/create", { method: "POST", body: JSON.stringify(body) }) as { id: string; username: string; city: string; address: string; height?: number; weight?: number; [k: string]: unknown };
      setEscortProfile({
        id: saved.id,
        username: saved.username,
        city: saved.city,
        address: saved.address,
        services: body.services,
        height: saved.height ?? (body.height !== undefined && body.height !== "" ? Number(body.height) : 0),
        weight: saved.weight ?? (body.weight !== undefined && body.weight !== "" ? Number(body.weight) : 0),
        ethnicity: body.ethnicity,
        gender: body.gender,
        languages: body.languages,
      } as AuthEscortProfile);
      setStep(2);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePrices = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      for (const [loc, prices] of [["IN_CALL", inCall], ["OUT_CALL", outCall]] as const) {
        const body = {
          serviceLocation: loc,
          price30min: Number(prices.price30min) || 0,
          price1hour: Number(prices.price1hour) || 0,
          priceWholeNight: Number(prices.priceWholeNight) || 0,
        };
        await apiFetch("/profile/prices", { method: "POST", body: JSON.stringify(body) });
      }
      setCompleted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (val: boolean) => {
    if (!val) {
      setStep(1);
      setProfile({ username: "", city: "", address: "", phoneNumber: "", services: [], height: "", weight: "", ethnicity: "", gender: "", languages: [] });
      setInCall({ price30min: "", price1hour: "", priceWholeNight: "" });
      setOutCall({ price30min: "", price1hour: "", priceWholeNight: "" });
      setError("");
      setCompleted(false);
    }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border/50 sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="items-center">
          <Crown className="h-8 w-8 text-primary mb-2" />
          <DialogTitle className="font-display text-2xl gold-text">Become an Escort</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {completed ? "You're all set!" : step === 1 ? "Step 1: Create your profile" : "Step 2: Set your prices"}
          </DialogDescription>
        </DialogHeader>

        <div className="mb-4">
          <Progress value={completed ? 100 : step === 1 ? 33 : 66} className="h-1.5" />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span className={step >= 1 ? "text-primary" : ""}>Profile</span>
            <span className={step >= 2 ? "text-primary" : ""}>Pricing</span>
            <span className={completed ? "text-primary" : ""}>Complete</span>
          </div>
        </div>

        {completed ? (
          <div className="text-center py-6 space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <p className="text-foreground font-display text-lg">Profile Created Successfully!</p>
            <p className="text-sm text-muted-foreground">Your escort profile is now live.</p>
            <Button onClick={() => { handleClose(false); onComplete?.(); }} className="gold-gradient font-semibold">Done</Button>
          </div>
        ) : step === 1 ? (
          <form onSubmit={handleCreateProfile} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Username *</Label>
                <Input value={profile.username} onChange={(e) => setProfile({ ...profile, username: e.target.value })} placeholder="anna_vip" className="bg-background border-border/50 h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">City *</Label>
                <Input value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} placeholder="Tbilisi" className="bg-background border-border/50 h-9 text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Address</Label>
              <Input value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} placeholder="Vake district" className="bg-background border-border/50 h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone number *</Label>
              <Input type="tel" value={profile.phoneNumber} onChange={(e) => setProfile({ ...profile, phoneNumber: e.target.value })} placeholder="+995599123456" className="bg-background border-border/50 h-9 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Gender *</Label>
                <Select value={profile.gender} onValueChange={(v) => setProfile({ ...profile, gender: v })}>
                  <SelectTrigger className="bg-background border-border/50 h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Ethnicity *</Label>
                <Select value={profile.ethnicity} onValueChange={(v) => setProfile({ ...profile, ethnicity: v })}>
                  <SelectTrigger className="bg-background border-border/50 h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{ETHNICITIES.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Height (cm)</Label>
                <Input type="number" value={profile.height} onChange={(e) => setProfile({ ...profile, height: e.target.value })} placeholder="170" className="bg-background border-border/50 h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Weight (kg)</Label>
                <Input type="number" value={profile.weight} onChange={(e) => setProfile({ ...profile, weight: e.target.value })} placeholder="55" className="bg-background border-border/50 h-9 text-sm" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Services</Label>
              <div className="flex flex-wrap gap-1.5">
                {SERVICES.map((s) => (
                  <Badge key={s} variant={profile.services.includes(s) ? "default" : "secondary"} className={`cursor-pointer text-[10px] transition-colors ${profile.services.includes(s) ? "gold-gradient text-primary-foreground" : "bg-secondary hover:bg-secondary/80"}`} onClick={() => setProfile({ ...profile, services: toggleMulti(profile.services, s) })}>
                    {s.replace("_", " ")}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Languages</Label>
              <div className="flex flex-wrap gap-1.5">
                {LANGUAGES.map((l) => (
                  <Badge key={l} variant={profile.languages.includes(l) ? "default" : "secondary"} className={`cursor-pointer text-[10px] transition-colors ${profile.languages.includes(l) ? "gold-gradient text-primary-foreground" : "bg-secondary hover:bg-secondary/80"}`} onClick={() => setProfile({ ...profile, languages: toggleMulti(profile.languages, l) })}>
                    {l}
                  </Badge>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full gold-gradient font-semibold">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue to Pricing"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleCreatePrices} className="space-y-5">
            {([["In Call", inCall, setInCall], ["Out Call", outCall, setOutCall]] as const).map(([label, prices, setPrices]) => (
              <div key={label} className="rounded-lg border border-border/50 bg-background p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <h3 className="font-display text-sm font-semibold text-foreground">{label}</h3>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {([["30 min", "price30min"], ["1 hour", "price1hour"], ["Whole Night", "priceWholeNight"]] as const).map(([lbl, key]) => (
                    <div key={key} className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">{lbl}</Label>
                      <Input type="number" placeholder="0" value={prices[key]} onChange={(e) => setPrices({ ...prices, [key]: e.target.value })} className="bg-card border-border/50 h-8 text-sm" />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1 border-border/50">Back</Button>
              <Button type="submit" disabled={loading} className="flex-1 gold-gradient font-semibold">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Complete Setup"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BecomeEscortModal;
