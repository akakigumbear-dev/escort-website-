import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Crown, Check, DollarSign, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";

interface EditEscortModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SERVICES = ["DINNER", "EVENT", "TRAVEL", "CITY_GUIDE", "BUSINESS_EVENT"];
const ETHNICITIES = ["EUROPEAN", "ASIAN", "LATIN", "MIXED", "OTHER"];
const GENDERS = ["FEMALE", "MALE", "OTHER"];
const LANGUAGES = ["EN", "KA", "RU", "TR", "DE"];

const EditEscortModal = ({ open, onOpenChange }: EditEscortModalProps) => {
  const { escortProfile, setEscortProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [profile, setProfile] = useState({
    username: "", city: "", address: "", services: [] as string[],
    height: "", weight: "", ethnicity: "", gender: "", languages: [] as string[],
  });

  const [inCall, setInCall] = useState({ price30min: "", price1hour: "", priceWholeNight: "" });
  const [outCall, setOutCall] = useState({ price30min: "", price1hour: "", priceWholeNight: "" });
  const [pictures, setPictures] = useState<Array<{ id: string; picturePath: string; isProfilePicture: boolean; isExclusive?: boolean }>>([]);

  useEffect(() => {
    if (open && escortProfile) {
      apiFetch("/profile/get")
        .then((p: { pictures?: Array<{ id: string; picturePath: string; isProfilePicture: boolean; isExclusive?: boolean }> }) => setPictures(p.pictures || []))
        .catch(() => setPictures([]));
      setProfile({
        username: escortProfile.username || "",
        city: escortProfile.city || "",
        address: escortProfile.address || "",
        services: escortProfile.services || [],
        height: String(escortProfile.height || ""),
        weight: String(escortProfile.weight || ""),
        ethnicity: escortProfile.ethnicity || "",
        gender: escortProfile.gender || "",
        languages: escortProfile.languages || [],
      });
      setSuccess(false);
      setError("");
    }
  }, [open, escortProfile]);

  const toggleMulti = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!profile.username || !profile.city || !profile.gender || !profile.ethnicity) {
      setError("Please fill all required fields.");
      return;
    }
    setLoading(true);
    try {
      const body = {
        username: String(profile.username).trim(),
        city: String(profile.city).trim(),
        address: String(profile.address ?? "").trim(),
        services: Array.isArray(profile.services) ? profile.services : [],
        height: profile.height !== "" && profile.height != null ? Number(profile.height) : undefined,
        weight: profile.weight !== "" && profile.weight != null ? Number(profile.weight) : undefined,
        ethnicity: (profile.ethnicity && String(profile.ethnicity).trim()) || undefined,
        gender: String(profile.gender).trim(),
        languages: Array.isArray(profile.languages) ? profile.languages : [],
      };
      await apiFetch("/profile/edit", { method: "PATCH", body: JSON.stringify(body) });
      setEscortProfile({ ...escortProfile, ...body, height: body.height ?? 0, weight: body.weight ?? 0 });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleSavePrices = async () => {
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
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (val: boolean) => {
    if (!val) { setError(""); setSuccess(false); }
    onOpenChange(val);
  };

  const setPictureExclusive = async (pictureId: string, isExclusive: boolean) => {
    try {
      await apiFetch(`/profile/pictures/${pictureId}/exclusive`, {
        method: "PATCH",
        body: JSON.stringify({ isExclusive }),
      });
      setPictures((prev) => prev.map((p) => (p.id === pictureId ? { ...p, isExclusive } : p)));
    } catch {
      // Ignore exclusive toggle errors
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border/50 sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="items-center">
          <Crown className="h-8 w-8 text-primary mb-2" />
          <DialogTitle className="font-display text-2xl gold-text">Edit Escort Profile</DialogTitle>
          <DialogDescription className="text-muted-foreground">Update your profile and pricing</DialogDescription>
        </DialogHeader>

        {success && (
          <div className="flex items-center gap-2 rounded-md bg-primary/10 border border-primary/20 px-3 py-2 text-sm text-primary">
            <Check className="h-4 w-4" /> Saved successfully
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Username *</Label>
              <Input value={profile.username} onChange={(e) => setProfile({ ...profile, username: e.target.value })} className="bg-background border-border/50 h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">City *</Label>
              <Input value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} className="bg-background border-border/50 h-9 text-sm" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Address</Label>
            <Input value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} className="bg-background border-border/50 h-9 text-sm" />
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
              <Input type="number" value={profile.height} onChange={(e) => setProfile({ ...profile, height: e.target.value })} className="bg-background border-border/50 h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Weight (kg)</Label>
              <Input type="number" value={profile.weight} onChange={(e) => setProfile({ ...profile, weight: e.target.value })} className="bg-background border-border/50 h-9 text-sm" />
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
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Profile"}
          </Button>
        </form>

        {/* Premium / Exclusive photos */}
        {pictures.filter((p) => !p.isProfilePicture).length > 0 && (
          <div className="border-t border-border/50 pt-4 mt-2 space-y-3">
            <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" /> Premium content
            </h3>
            <p className="text-xs text-muted-foreground">Mark photos as exclusive (visible only to subscribers).</p>
            <div className="flex flex-wrap gap-2">
              {pictures.filter((p) => !p.isProfilePicture).map((pic) => (
                <div key={pic.id} className="rounded-lg border border-border/50 p-2 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">Photo</span>
                  <button
                    type="button"
                    onClick={() => setPictureExclusive(pic.id, !pic.isExclusive)}
                    className={`text-xs px-2 py-1 rounded border transition-colors ${pic.isExclusive ? "gold-gradient text-primary-foreground border-primary/30" : "bg-muted border-border/50 hover:bg-muted/80"}`}
                  >
                    {pic.isExclusive ? "Exclusive" : "Public"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pricing section */}
        <div className="border-t border-border/50 pt-4 mt-2 space-y-4">
          <h3 className="font-display text-sm font-semibold text-foreground">Update Pricing</h3>
          {([["In Call", inCall, setInCall], ["Out Call", outCall, setOutCall]] as const).map(([label, prices, setPrices]) => (
            <div key={label} className="rounded-lg border border-border/50 bg-background p-4 space-y-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="font-display text-sm font-semibold text-foreground">{label}</span>
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
          <Button onClick={handleSavePrices} disabled={loading} className="w-full gold-gradient font-semibold">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Prices"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditEscortModal;
