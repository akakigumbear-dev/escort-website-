import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/Header";
import SEO from "@/components/SEO";
import { useAuth, type EscortProfile as AuthEscortProfile } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getMyProfile,
  updateProfile,
  uploadProfilePictures,
  uploadSubscriberMedia,
  setProfilePicture,
  setPictureExclusive,
  deletePicture,
  purchaseVip,
} from "@/lib/profile-api";
import { getMySubscribers } from "@/lib/subscriptions-api";
import {
  getMyPosts,
  createPost,
  upvotePost,
  unvotePost,
  addPostComment,
  getPostComments,
  deletePost,
  buildPostMediaUrl,
  type SubscriptionPostDto,
  type PostCommentDto,
} from "@/lib/subscription-posts-api";
import { buildImageUrl, API_BASE_URL } from "@/lib/api";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import { upsertPrices } from "@/lib/profile-api";
import {
  Crown,
  Loader2,
  Upload,
  MessageCircle,
  ThumbsUp,
  MessageSquare,
  Trash2,
  Image as ImageIcon,
  Video,
  Banknote,
  Users,
  Sparkles,
  Wallet,
} from "lucide-react";

const VIP_PRICE_PER_DAY = 10;

export default function EscortDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, escortProfile, setEscortProfile, refreshBalance } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [postMedia, setPostMedia] = useState<File | null>(null);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [formState, setFormState] = useState({
    username: "", city: "", address: "", phoneNumber: "", bio: "",
    age: "", height: "", weight: "", ethnicity: "", gender: "",
    services: [] as string[], languages: [] as string[],
    subscriptionPriceGel: "",
  });
  const [inCall, setInCall] = useState({ price30min: "", price1hour: "", priceWholeNight: "" });
  const [outCall, setOutCall] = useState({ price30min: "", price1hour: "", priceWholeNight: "" });
  const [enumOptions, setEnumOptions] = useState<{ services: string[]; ethnicities: string[]; genders: string[]; languages: string[]; serviceLocations: string[] } | null>(null);
  const [pricesSaving, setPricesSaving] = useState(false);
  const [pricesSaved, setPricesSaved] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [postError, setPostError] = useState("");
  const [vipDays, setVipDays] = useState(1);
  const [vipLoading, setVipLoading] = useState(false);
  const [vipError, setVipError] = useState("");
  const [vipSuccess, setVipSuccess] = useState(false);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["escort-profile"],
    queryFn: getMyProfile,
    enabled: !!escortProfile,
  });

  const { data: subscribers, isLoading: subsLoading } = useQuery({
    queryKey: ["my-subscribers"],
    queryFn: getMySubscribers,
    enabled: !!escortProfile && activeTab === "subscribers",
  });

  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ["my-posts"],
    queryFn: getMyPosts,
    enabled: !!escortProfile && !!profile?.id && activeTab === "posts",
  });

  const updateMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => updateProfile(body),
    onSuccess: (data) => {
      setEscortProfile(data as AuthEscortProfile);
      queryClient.invalidateQueries({ queryKey: ["escort-profile"] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    },
  });

  const createPostMutation = useMutation({
    mutationFn: () => createPost(profile!.id, postContent || undefined, postMedia || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-posts"] });
      setPostContent("");
      setPostMedia(null);
      setPostError("");
    },
    onError: (err: Error) => setPostError(err.message),
  });

  useEffect(() => {
    if (!enumOptions) {
      apiFetch("/escort/enums").then(setEnumOptions).catch(() => {});
    }
  }, [enumOptions]);

  useEffect(() => {
    if (profile) {
      setFormState({
        username: (profile.username ?? "").toString(),
        city: (profile.city ?? "").toString(),
        address: (profile.address ?? "").toString(),
        phoneNumber: (profile.phoneNumber ?? "").toString(),
        bio: ((profile as any).bio ?? "").toString(),
        age: profile.age != null ? String(profile.age) : "",
        height: profile.height != null ? String(profile.height) : "",
        weight: profile.weight != null ? String(profile.weight) : "",
        ethnicity: ((profile as any).ethnicity ?? "").toString(),
        gender: ((profile as any).gender ?? "").toString(),
        services: Array.isArray((profile as any).services) ? (profile as any).services : [],
        languages: Array.isArray((profile as any).languages) ? (profile as any).languages : [],
        subscriptionPriceGel: profile.subscriptionPriceGel != null ? String(profile.subscriptionPriceGel) : "",
      });
      const prices = Array.isArray((profile as any).prices) ? (profile as any).prices : [];
      const inLoc = enumOptions?.serviceLocations?.[0] || "ჩემთან";
      const outLoc = enumOptions?.serviceLocations?.[1] || "გამოძახებით";
      const inP = prices.find((p: any) => p.serviceLocation === inLoc);
      const outP = prices.find((p: any) => p.serviceLocation === outLoc);
      if (inP) setInCall({ price30min: inP.price30min != null ? String(inP.price30min) : "", price1hour: inP.price1hour != null ? String(inP.price1hour) : "", priceWholeNight: inP.priceWholeNight != null ? String(inP.priceWholeNight) : "" });
      if (outP) setOutCall({ price30min: outP.price30min != null ? String(outP.price30min) : "", price1hour: outP.price1hour != null ? String(outP.price1hour) : "", priceWholeNight: outP.priceWholeNight != null ? String(outP.priceWholeNight) : "" });
    }
  }, [profile, enumOptions]);

  useEffect(() => {
    if (user && !escortProfile) {
      navigate("/");
      return;
    }
  }, [user, escortProfile, navigate]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-20 text-center text-muted-foreground">Please log in.</div>
      </div>
    );
  }

  if (!escortProfile) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-20 text-center text-muted-foreground">
          You need an escort profile. <Link to="/" className="text-primary hover:underline">Go home</Link> and use &quot;Become Escort&quot;.
        </div>
      </div>
    );
  }

  const toggleMulti = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      city: formState.city.trim(),
      address: formState.address.trim(),
      phoneNumber: formState.phoneNumber.trim() || undefined,
      bio: formState.bio.trim() || undefined,
      age: formState.age ? Number(formState.age) : undefined,
      height: formState.height ? Number(formState.height) : undefined,
      weight: formState.weight ? Number(formState.weight) : undefined,
      ethnicity: formState.ethnicity || undefined,
      gender: formState.gender || undefined,
      services: formState.services,
      languages: formState.languages,
      subscriptionPriceGel: formState.subscriptionPriceGel ? Number(formState.subscriptionPriceGel) : undefined,
    });
  };

  const handleSavePrices = async () => {
    setPricesSaving(true);
    setPricesSaved(false);
    try {
      const inLoc = enumOptions?.serviceLocations?.[0] || "ჩემთან";
      const outLoc = enumOptions?.serviceLocations?.[1] || "გამოძახებით";
      await upsertPrices(inLoc as any, { price30min: Number(inCall.price30min) || 0, price1hour: Number(inCall.price1hour) || 0, priceWholeNight: Number(inCall.priceWholeNight) || 0 });
      await upsertPrices(outLoc as any, { price30min: Number(outCall.price30min) || 0, price1hour: Number(outCall.price1hour) || 0, priceWholeNight: Number(outCall.priceWholeNight) || 0 });
      queryClient.invalidateQueries({ queryKey: ["escort-profile"] });
      setPricesSaved(true);
      setTimeout(() => setPricesSaved(false), 2000);
    } catch {} finally {
      setPricesSaving(false);
    }
  };

  const handleUploadProfileMedia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploadError("");
    try {
      await uploadProfilePictures(Array.from(files));
      queryClient.invalidateQueries({ queryKey: ["escort-profile"] });
    } catch (err) {
      setUploadError((err as Error).message);
    }
    e.target.value = "";
  };

  const handleUploadSubscriberMedia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploadError("");
    try {
      await uploadSubscriberMedia(Array.from(files));
      queryClient.invalidateQueries({ queryKey: ["escort-profile"] });
    } catch (err) {
      setUploadError((err as Error).message);
    }
    e.target.value = "";
  };

  const posts = postsData?.posts ?? [];
  type SubscriberItem = { id: string; clientId: string; clientEmail?: string };
  const subs: SubscriberItem[] = Array.isArray(subscribers) ? subscribers : [];

  const isVipActive = profile?.vipUntil && new Date(profile.vipUntil) > new Date();
  const balance = Number(user?.balance ?? 0);
  const vipCost = vipDays * VIP_PRICE_PER_DAY;
  const canAffordVip = balance >= vipCost;

  const handlePurchaseVip = async () => {
    setVipError("");
    setVipSuccess(false);
    if (vipDays < 1) return;
    setVipLoading(true);
    try {
      await purchaseVip(vipDays);
      await refreshBalance();
      queryClient.invalidateQueries({ queryKey: ["escort-profile"] });
      setVipSuccess(true);
      setTimeout(() => setVipSuccess(false), 3000);
    } catch (err: unknown) {
      setVipError(err instanceof Error ? err.message : t("auth.somethingWrong"));
    } finally {
      setVipLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO title="My Dashboard" description="Manage your escort profile on ELITEFUN." noindex />
      <Header />
      <main className="container py-8 max-w-4xl">
        <div className="flex items-center gap-2 mb-6">
          <Crown className="h-8 w-8 text-primary" />
          <h1 className="font-display text-2xl font-bold text-foreground">{t("profile.myProfileTitle")}</h1>
        </div>

        {/* VIP Status & Purchase */}
        <div className="rounded-xl border border-border/50 bg-card p-6 mb-6">
          <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> {t("vipPurchase.title")}
          </h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-sm">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t("deposit.currentBalance")}:</span>
              <span className="font-semibold gold-text">{balance.toFixed(2)} ₾</span>
            </div>
            {isVipActive ? (
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                {t("vipPurchase.activeUntil")}: {new Date(profile!.vipUntil!).toLocaleDateString()}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">{t("vipPurchase.notActive")}</p>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">{t("vipPurchase.pricePerDay")}</span>
              <Input
                type="number"
                min={1}
                max={365}
                value={vipDays}
                onChange={(e) => setVipDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-20 h-9 text-center"
              />
              <span className="text-xs text-muted-foreground">{t("vipPurchase.days")}</span>
              <Button
                onClick={handlePurchaseVip}
                disabled={vipLoading || !canAffordVip}
                className="gold-gradient text-sm"
              >
                {vipLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : `${t("vipPurchase.buy")} — ${vipCost} ₾`}
              </Button>
            </div>
          </div>
          {!canAffordVip && balance < vipCost && vipDays >= 1 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">{t("vipPurchase.insufficientBalance")}</p>
          )}
          {vipError && <p className="text-sm text-destructive mt-2">{vipError}</p>}
          {vipSuccess && <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-2">{t("vipPurchase.success")}</p>}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
            <TabsTrigger value="posts">Posts</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            {profileLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : (
              <>
                <form onSubmit={handleSaveProfile} className="space-y-5 rounded-xl border border-border/50 bg-card p-6">
                  <h2 className="font-display text-lg font-semibold">Profile Details</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Username</Label>
                      <Input value={formState.username} readOnly disabled className="opacity-60" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">City *</Label>
                      <Input value={formState.city} onChange={(e) => setFormState((s) => ({ ...s, city: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Address</Label>
                      <Input value={formState.address} onChange={(e) => setFormState((s) => ({ ...s, address: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Phone</Label>
                      <Input value={formState.phoneNumber} onChange={(e) => setFormState((s) => ({ ...s, phoneNumber: e.target.value }))} placeholder="+995..." />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Bio</Label>
                    <textarea
                      value={formState.bio}
                      onChange={(e) => setFormState((s) => ({ ...s, bio: e.target.value }))}
                      placeholder="Tell something about yourself..."
                      className="w-full min-h-[80px] rounded-md border border-border/50 bg-background px-3 py-2 text-sm resize-y"
                      maxLength={2000}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Gender *</Label>
                      <Select value={formState.gender} onValueChange={(v) => setFormState((s) => ({ ...s, gender: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{(enumOptions?.genders || []).map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Ethnicity *</Label>
                      <Select value={formState.ethnicity} onValueChange={(v) => setFormState((s) => ({ ...s, ethnicity: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{(enumOptions?.ethnicities || []).map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Height (cm)</Label>
                      <Input type="number" value={formState.height} onChange={(e) => setFormState((s) => ({ ...s, height: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Weight (kg)</Label>
                      <Input type="number" value={formState.weight} onChange={(e) => setFormState((s) => ({ ...s, weight: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Age</Label>
                      <Input type="number" value={formState.age} onChange={(e) => setFormState((s) => ({ ...s, age: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Services</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {(enumOptions?.services || []).map((s) => (
                        <Badge
                          key={s}
                          variant={formState.services.includes(s) ? "default" : "secondary"}
                          className={`cursor-pointer text-[11px] transition-colors ${formState.services.includes(s) ? "gold-gradient text-primary-foreground" : "bg-secondary hover:bg-secondary/80"}`}
                          onClick={() => setFormState((prev) => ({ ...prev, services: toggleMulti(prev.services, s) }))}
                        >
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Languages</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {(enumOptions?.languages || []).map((l) => (
                        <Badge
                          key={l}
                          variant={formState.languages.includes(l) ? "default" : "secondary"}
                          className={`cursor-pointer text-[11px] transition-colors ${formState.languages.includes(l) ? "gold-gradient text-primary-foreground" : "bg-secondary hover:bg-secondary/80"}`}
                          onClick={() => setFormState((prev) => ({ ...prev, languages: toggleMulti(prev.languages, l) }))}
                        >
                          {l}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1"><Banknote className="h-3 w-3 text-primary" /> Subscription price (₾/month)</Label>
                    <Input type="number" min={0} step={1} placeholder="29" value={formState.subscriptionPriceGel} onChange={(e) => setFormState((s) => ({ ...s, subscriptionPriceGel: e.target.value }))} className="max-w-[140px]" />
                  </div>
                  {updateMutation.isError && <p className="text-sm text-destructive">{updateMutation.error.message}</p>}
                  {saveSuccess && <p className="text-sm text-emerald-600">Saved.</p>}
                  <Button type="submit" disabled={updateMutation.isPending} className="gold-gradient">
                    {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save profile"}
                  </Button>
                </form>

                {/* Pricing */}
                <div className="rounded-xl border border-border/50 bg-card p-6 space-y-5">
                  <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                    <Banknote className="h-5 w-5 text-primary" /> Pricing (₾)
                  </h2>
                  {([
                    [enumOptions?.serviceLocations?.[0] || "ჩემთან", inCall, setInCall] as const,
                    [enumOptions?.serviceLocations?.[1] || "გამოძახებით", outCall, setOutCall] as const,
                  ]).map(([label, prices, setPrices]) => (
                    <div key={label} className="rounded-lg border border-border/30 bg-muted/30 p-4 space-y-3">
                      <span className="font-display text-sm font-semibold">{label}</span>
                      <div className="grid grid-cols-3 gap-3">
                        {([["30 min", "price30min"], ["1 hour", "price1hour"], ["Whole Night", "priceWholeNight"]] as const).map(([lbl, key]) => (
                          <div key={key} className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">{lbl}</Label>
                            <Input type="number" min={0} placeholder="0" value={prices[key]} onChange={(e) => setPrices({ ...prices, [key]: e.target.value })} className="h-8 text-sm" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {pricesSaved && <p className="text-sm text-emerald-600">Prices saved.</p>}
                  <Button onClick={handleSavePrices} disabled={pricesSaving} className="gold-gradient">
                    {pricesSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save prices"}
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="media" className="space-y-8">
            <div className="rounded-xl border border-border/50 bg-card p-6">
              <h2 className="font-display text-lg font-semibold mb-2">Profile photos & videos</h2>
              <p className="text-sm text-muted-foreground mb-4">Shown on your public profile. Max 20 files, images or video.</p>
              <label className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-2 cursor-pointer hover:bg-muted">
                <Upload className="h-4 w-4" /> Upload
                <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleUploadProfileMedia} />
              </label>
              {uploadError && <p className="mt-2 text-sm text-destructive">{uploadError}</p>}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(profile?.pictures ?? []).map((pic: { id: string; picturePath: string; isProfilePicture: boolean; isExclusive?: boolean; mediaType?: string | null }) => {
                  const mediaUrl = pic.picturePath?.startsWith("/uploads") ? `${API_BASE_URL}${pic.picturePath}` : buildImageUrl(pic.picturePath);
                  return (
                  <div key={pic.id} className="relative group rounded-lg overflow-hidden border border-border/50">
                    {pic.mediaType === "video" ? (
                      <video src={mediaUrl} className="w-full aspect-square object-cover" controls />
                    ) : (
                      <img src={mediaUrl} alt="Profile photo" className="w-full aspect-square object-cover" />
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 p-2">
                      {!pic.isProfilePicture && (
                        <Button size="sm" variant="secondary" className="text-xs" onClick={() => setProfilePicture(pic.id).then(() => queryClient.invalidateQueries({ queryKey: ["escort-profile"] }))}>
                          Set main
                        </Button>
                      )}
                      {!pic.isProfilePicture && (
                        <Button size="sm" variant="secondary" className="text-xs" onClick={() => setPictureExclusive(pic.id, !pic.isExclusive).then(() => queryClient.invalidateQueries({ queryKey: ["escort-profile"] }))}>
                          {pic.isExclusive ? "Public" : "Subscribers only"}
                        </Button>
                      )}
                      <Button size="sm" variant="destructive" className="text-xs" onClick={() => deletePicture(pic.id).then(() => queryClient.invalidateQueries({ queryKey: ["escort-profile"] }))}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    {pic.isProfilePicture && <span className="absolute top-1 left-1 text-[10px] bg-primary text-primary-foreground px-1 rounded">Main</span>}
                  </div>
                  );
                })}
              </div>
            </div>
            <div className="rounded-xl border border-border/50 bg-card p-6">
              <h2 className="font-display text-lg font-semibold mb-2">Subscriber-only media</h2>
              <p className="text-sm text-muted-foreground mb-4">Only visible to paying subscribers.</p>
              <label className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-2 cursor-pointer hover:bg-muted">
                <Upload className="h-4 w-4" /> Upload
                <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleUploadSubscriberMedia} />
              </label>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(profile?.subscriberPhotos ?? []).map((pic: { id: string; picturePath: string; mediaType?: string | null }) => (
                  <div key={pic.id} className="relative rounded-lg overflow-hidden border border-border/50">
                    {pic.mediaType === "video" ? (
                      <video src={`${API_BASE_URL}${pic.picturePath}`} className="w-full aspect-square object-cover" controls />
                    ) : (
                      <img src={`${API_BASE_URL}${pic.picturePath}`} alt="Subscriber-only photo" className="w-full aspect-square object-cover" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="subscribers" className="space-y-4">
            {subsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="rounded-xl border border-border/50 bg-card p-6">
                <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> My subscribers</h2>
                {subs.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No subscribers yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {subs.map((s) => (
                      <li key={s.id || s.clientId} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                        <span className="text-sm">{s.clientEmail ?? s.clientId}</span>
                        <Link to={`/messages?with=${s.clientId}`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                          <MessageCircle className="h-4 w-4" /> Message
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="posts" className="space-y-6">
            <div className="rounded-xl border border-border/50 bg-card p-6">
              <h2 className="font-display text-lg font-semibold mb-4">Create post for subscribers</h2>
              <div className="flex flex-col gap-2">
                <textarea
                  placeholder="Write something..."
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  className="min-h-[80px] rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="inline-flex items-center gap-1 text-sm text-muted-foreground cursor-pointer">
                    <ImageIcon className="h-4 w-4" /> Photo/Video
                    <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => setPostMedia(e.target.files?.[0] ?? null)} />
                  </label>
                  {postMedia && <span className="text-xs text-muted-foreground">{postMedia.name}</span>}
                  <Button
                    onClick={() => createPostMutation.mutate()}
                    disabled={createPostMutation.isPending || (!postContent.trim() && !postMedia)}
                    className="gold-gradient"
                  >
                    {createPostMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post"}
                  </Button>
                </div>
                {postError && <p className="text-sm text-destructive mt-2">{postError}</p>}
              </div>
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold mb-4">Your posts</h2>
              {postsLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
              ) : posts.length === 0 ? (
                <p className="text-muted-foreground text-sm">No posts yet.</p>
              ) : (
                <ul className="space-y-4">
                  {posts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      isOwner
                      onUpvote={() => upvotePost(post.id).then(() => queryClient.invalidateQueries({ queryKey: ["my-posts"] }))}
                      onUnvote={() => unvotePost(post.id).then(() => queryClient.invalidateQueries({ queryKey: ["my-posts"] }))}
                      onComment={(content) => addPostComment(post.id, content).then(() => queryClient.invalidateQueries({ queryKey: ["my-posts"] }))}
                      onDelete={() => deletePost(post.id).then(() => queryClient.invalidateQueries({ queryKey: ["my-posts"] }))}
                      expandedComments={expandedComments}
                      setExpandedComments={setExpandedComments}
                      commentInputs={commentInputs}
                      setCommentInputs={setCommentInputs}
                    />
                  ))}
                </ul>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function PostCard({
  post,
  isOwner,
  onUpvote,
  onUnvote,
  onComment,
  onDelete,
  expandedComments,
  setExpandedComments,
  commentInputs,
  setCommentInputs,
}: {
  post: SubscriptionPostDto;
  isOwner: boolean;
  onUpvote: () => void;
  onUnvote: () => void;
  onComment: (content: string) => Promise<unknown>;
  onDelete: () => void;
  expandedComments: Set<string>;
  setExpandedComments: (s: Set<string>) => void;
  commentInputs: Record<string, string>;
  setCommentInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  const [comments, setComments] = useState<PostCommentDto[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const expanded = expandedComments.has(post.id);

  const loadComments = () => {
    if (!expanded) {
      setExpandedComments(new Set([...expandedComments, post.id]));
      setLoadingComments(true);
      getPostComments(post.id).then((r) => {
        setComments(r.comments);
        setLoadingComments(false);
      });
    } else {
      setExpandedComments(new Set([...expandedComments].filter((id) => id !== post.id)));
    }
  };

  const handleSendComment = () => {
    const content = commentInputs[post.id]?.trim();
    if (!content) return;
    onComment(content).then(() => {
      setCommentInputs((prev) => ({ ...prev, [post.id]: "" }));
      getPostComments(post.id).then((r) => setComments(r.comments));
    });
  };

  return (
    <li className="rounded-xl border border-border/50 bg-card p-4">
      {post.content && <p className="text-sm text-foreground whitespace-pre-wrap mb-2">{post.content}</p>}
      {post.mediaPath && (
        <div className="mb-2">
          {post.mediaType === "video" ? (
            <video src={buildPostMediaUrl(post.mediaPath)} className="max-w-full max-h-64 rounded-lg" controls />
          ) : (
            <img src={buildPostMediaUrl(post.mediaPath)} alt="Post media" className="max-w-full max-h-64 rounded-lg object-contain" />
          )}
        </div>
      )}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{new Date(post.createdAt).toLocaleString()}</span>
        <button type="button" onClick={post.upvotedByMe ? onUnvote : onUpvote} className="flex items-center gap-1 hover:text-foreground">
          <ThumbsUp className={`h-4 w-4 ${post.upvotedByMe ? "fill-current" : ""}`} /> {post.upvoteCount}
        </button>
        <button type="button" onClick={loadComments} className="flex items-center gap-1 hover:text-foreground">
          <MessageSquare className="h-4 w-4" /> {post.commentCount}
        </button>
        {isOwner && (
          <button type="button" onClick={onDelete} className="text-destructive hover:underline flex items-center gap-1">
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        )}
      </div>
      {expanded && (
        <div className="mt-4 pt-4 border-t border-border/50">
          {loadingComments ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <>
              <ul className="space-y-2 mb-4">
                {comments.map((c) => (
                  <li key={c.id} className="text-sm">
                    <span className="font-medium">{c.userEmail ?? c.userId}</span>: {c.content}
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a comment..."
                  value={commentInputs[post.id] ?? ""}
                  onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && handleSendComment()}
                  className="flex-1"
                />
                <Button size="sm" onClick={handleSendComment}>Send</Button>
              </div>
            </>
          )}
        </div>
      )}
    </li>
  );
}
