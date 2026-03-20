import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/Header";
import SEO from "@/components/SEO";
import { useAuth, type EscortProfile as AuthEscortProfile } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { buildImageUrl, API_BASE_URL, PLACEHOLDER_THUMBNAIL } from "@/lib/api";
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
  Camera,
  MapPin,
  User,
  Globe,
  Ruler,
  Weight,
  Calendar,
  Briefcase,
  Settings,
  FileText,
  Images,
  Info,
} from "lucide-react";

const VIP_PRICE_PER_DAY = 10;

type TabValue = "posts" | "photos" | "about" | "settings";

export default function EscortDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, escortProfile, setEscortProfile, refreshBalance } = useAuth();
  const [activeTab, setActiveTab] = useState<TabValue>("posts");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [postMedia, setPostMedia] = useState<File | null>(null);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [editingAbout, setEditingAbout] = useState(false);
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
  const [subPriceSaving, setSubPriceSaving] = useState(false);
  const [subPriceSaved, setSubPriceSaved] = useState(false);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["escort-profile"],
    queryFn: getMyProfile,
    enabled: !!escortProfile,
  });

  const { data: subscribers, isLoading: subsLoading } = useQuery({
    queryKey: ["my-subscribers"],
    queryFn: getMySubscribers,
    enabled: !!escortProfile && activeTab === "settings",
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
      setEditingAbout(false);
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
      subscriptionPriceGel: formState.subscriptionPriceGel ? Number(formState.subscriptionPriceGel) : null,
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

  const handleSaveSubscriptionPrice = async () => {
    setSubPriceSaving(true);
    setSubPriceSaved(false);
    try {
      const data = await updateProfile({
        subscriptionPriceGel: formState.subscriptionPriceGel ? Number(formState.subscriptionPriceGel) : null,
      });
      setEscortProfile(data as AuthEscortProfile);
      queryClient.invalidateQueries({ queryKey: ["escort-profile"] });
      setSubPriceSaved(true);
      setTimeout(() => setSubPriceSaved(false), 2000);
    } catch {} finally {
      setSubPriceSaving(false);
    }
  };

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

  const handleChangeProfilePicture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploadError("");
    try {
      const result = await uploadProfilePictures(Array.from(files));
      if (result?.items?.[0]?.id) {
        await setProfilePicture(result.items[0].id);
      }
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

  const profilePic = profile?.pictures?.find((p: any) => p.isProfilePicture);
  const profilePicUrl = profilePic
    ? (profilePic.picturePath?.startsWith("/uploads") ? `${API_BASE_URL}${profilePic.picturePath}` : buildImageUrl(profilePic.picturePath))
    : PLACEHOLDER_THUMBNAIL;
  const allPictures = profile?.pictures ?? [];
  const photosCount = allPictures.length;
  const subscriberMediaCount = (profile?.subscriberPhotos ?? []).length;

  const tabs: { value: TabValue; label: string; icon: React.ReactNode }[] = [
    { value: "posts", label: t("profilePage.posts"), icon: <FileText className="h-4 w-4" /> },
    { value: "photos", label: t("profilePage.photos"), icon: <Images className="h-4 w-4" /> },
    { value: "about", label: t("profilePage.about"), icon: <Info className="h-4 w-4" /> },
    { value: "settings", label: t("profilePage.settings"), icon: <Settings className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO title={formState.username || t("profile.myProfileTitle")} description="Manage your profile on ELITEFUN." noindex />
      <Header />

      {/* ===== COVER PHOTO + PROFILE SECTION ===== */}
      <div className="relative">
        {/* Cover gradient */}
        <div className="h-36 sm:h-48 md:h-56 bg-gradient-to-br from-primary/30 via-primary/10 to-background relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
          {isVipActive && (
            <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex items-center gap-1.5 rounded-full gold-gradient px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-lg">
              <Crown className="h-3.5 w-3.5" /> VIP
            </div>
          )}
        </div>

        {/* Profile picture + info row */}
        <div className="container max-w-4xl px-4 sm:px-6">
          <div className="relative -mt-16 sm:-mt-20 flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-5">
            {/* Avatar with camera button */}
            <div className="relative flex-shrink-0">
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full border-4 border-background bg-card overflow-hidden shadow-xl">
                <img
                  src={profilePicUrl}
                  alt={formState.username}
                  className="w-full h-full object-cover"
                />
              </div>
              <label className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary text-primary-foreground cursor-pointer shadow-md hover:opacity-90 transition-opacity">
                <Camera className="h-4 w-4" />
                <input type="file" accept="image/*" className="hidden" onChange={handleChangeProfilePicture} />
              </label>
            </div>

            {/* Name, bio, stats */}
            <div className="flex-1 min-w-0 pb-1 sm:pb-3">
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground truncate">
                {formState.username}
              </h1>
              {formState.bio && (
                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{formState.bio}</p>
              )}
              <div className="flex items-center gap-3 sm:gap-4 mt-1.5 text-xs sm:text-sm text-muted-foreground flex-wrap">
                {formState.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-primary" /> {formState.city}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Images className="h-3.5 w-3.5" /> {photosCount} {t("profilePage.photos").toLowerCase()}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> {subs.length || 0} {t("profilePage.subscribers").toLowerCase()}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pb-2 sm:pb-3 flex-shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="text-xs sm:text-sm"
                onClick={() => { setActiveTab("about"); setEditingAbout(true); }}
              >
                {t("profilePage.editProfile")}
              </Button>
              {profile?.id && (
                <Button size="sm" variant="outline" className="text-xs sm:text-sm" asChild>
                  <Link to={`/escort/${profile.id}`}>
                    {t("profilePage.viewPublic")}
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== TAB BAR (sticky) ===== */}
      <div className="sticky top-16 z-40 border-b border-border/50 bg-background/95 backdrop-blur-sm mt-4">
        <div className="container max-w-4xl px-4 sm:px-6">
          <div className="flex overflow-x-auto scrollbar-hide -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-3 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${
                  activeTab === tab.value
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ===== TAB CONTENT ===== */}
      <main className="container max-w-4xl px-4 sm:px-6 py-4 sm:py-6">
        {uploadError && (
          <div className="rounded-lg bg-destructive/15 text-destructive px-4 py-2 text-sm font-medium mb-4">{uploadError}</div>
        )}

        {/* ---- POSTS TAB ---- */}
        {activeTab === "posts" && (
          <div className="space-y-4">
            {/* Create post card */}
            <div className="rounded-xl border border-border/50 bg-card p-4">
              <div className="flex items-start gap-3">
                <img
                  src={profilePicUrl}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0 hidden sm:block"
                />
                <div className="flex-1 min-w-0">
                  <textarea
                    placeholder={t("profilePage.whatsOnYourMind")}
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    className="w-full min-h-[60px] sm:min-h-[80px] rounded-lg border border-border/50 bg-background px-3 py-2 text-sm resize-y placeholder:text-muted-foreground"
                  />
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30 flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <label className="inline-flex items-center gap-1.5 text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors px-2 py-1.5 rounded-lg hover:bg-muted">
                        <ImageIcon className="h-4 w-4 text-emerald-500" /> {t("profilePage.photoVideo")}
                        <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => setPostMedia(e.target.files?.[0] ?? null)} />
                      </label>
                      {postMedia && (
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md max-w-[120px] truncate">
                          {postMedia.name}
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => createPostMutation.mutate()}
                      disabled={createPostMutation.isPending || (!postContent.trim() && !postMedia)}
                      className="gold-gradient text-sm px-6"
                    >
                      {createPostMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("profilePage.post")}
                    </Button>
                  </div>
                  {postError && <p className="text-sm text-destructive mt-2">{postError}</p>}
                </div>
              </div>
            </div>

            {/* Posts feed */}
            {postsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12 rounded-xl border border-border/50 bg-card">
                <FileText className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">{t("profilePage.noPosts")}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    isOwner
                    profilePicUrl={profilePicUrl}
                    username={formState.username}
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
              </div>
            )}
          </div>
        )}

        {/* ---- PHOTOS TAB ---- */}
        {activeTab === "photos" && (
          <div className="space-y-8">
            {/* Profile Photos */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg font-semibold text-foreground">{t("profilePage.profilePhotos")}</h2>
                <label className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 cursor-pointer hover:bg-muted transition-colors text-sm">
                  <Upload className="h-4 w-4 text-primary" /> {t("profilePage.addPhotos")}
                  <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleUploadProfileMedia} />
                </label>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{t("profilePage.profilePhotosDesc")}</p>
              {allPictures.length === 0 ? (
                <div className="text-center py-12 rounded-xl border border-dashed border-border/50">
                  <Images className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">{t("profilePage.noPhotos")}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                  {allPictures.map((pic: { id: string; picturePath: string; isProfilePicture: boolean; isExclusive?: boolean; mediaType?: string | null }) => {
                    const mediaUrl = pic.picturePath?.startsWith("/uploads") ? `${API_BASE_URL}${pic.picturePath}` : buildImageUrl(pic.picturePath);
                    return (
                      <div key={pic.id} className="relative group rounded-xl overflow-hidden border border-border/50 bg-card">
                        {pic.mediaType === "video" ? (
                          <video src={mediaUrl} className="w-full aspect-square object-cover" controls />
                        ) : (
                          <img src={mediaUrl} alt="Profile photo" className="w-full aspect-square object-cover" />
                        )}
                        {/* Overlay actions */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-2">
                          {!pic.isProfilePicture && (
                            <Button size="sm" variant="secondary" className="text-xs w-full max-w-[140px]" onClick={() => setProfilePicture(pic.id).then(() => queryClient.invalidateQueries({ queryKey: ["escort-profile"] }))}>
                              {t("profilePage.setMain")}
                            </Button>
                          )}
                          {!pic.isProfilePicture && (
                            <Button size="sm" variant="secondary" className="text-xs w-full max-w-[140px]" onClick={() => setPictureExclusive(pic.id, !pic.isExclusive).then(() => queryClient.invalidateQueries({ queryKey: ["escort-profile"] }))}>
                              {pic.isExclusive ? t("profilePage.makePublic") : t("profilePage.subscribersOnly")}
                            </Button>
                          )}
                          <Button size="sm" variant="destructive" className="text-xs w-full max-w-[140px]" onClick={() => deletePicture(pic.id).then(() => queryClient.invalidateQueries({ queryKey: ["escort-profile"] }))}>
                            <Trash2 className="h-3 w-3 mr-1" /> {t("profilePage.delete")}
                          </Button>
                        </div>
                        {/* Badges */}
                        {pic.isProfilePicture && (
                          <span className="absolute top-1.5 left-1.5 text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-medium">{t("profilePage.main")}</span>
                        )}
                        {pic.isExclusive && !pic.isProfilePicture && (
                          <span className="absolute top-1.5 left-1.5 text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-medium">{t("profilePage.exclusive")}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Subscriber Media */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg font-semibold text-foreground">{t("profilePage.subscriberMedia")}</h2>
                <label className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 cursor-pointer hover:bg-muted transition-colors text-sm">
                  <Upload className="h-4 w-4 text-primary" /> {t("profilePage.upload")}
                  <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleUploadSubscriberMedia} />
                </label>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{t("profilePage.subscriberMediaDesc")}</p>
              {(profile?.subscriberPhotos ?? []).length === 0 ? (
                <div className="text-center py-12 rounded-xl border border-dashed border-border/50">
                  <Video className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">{t("profilePage.noSubscriberMedia")}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                  {(profile?.subscriberPhotos ?? []).map((pic: { id: string; picturePath: string; mediaType?: string | null }) => (
                    <div key={pic.id} className="relative rounded-xl overflow-hidden border border-border/50 bg-card">
                      {pic.mediaType === "video" ? (
                        <video src={`${API_BASE_URL}${pic.picturePath}`} className="w-full aspect-square object-cover" controls />
                      ) : (
                        <img src={`${API_BASE_URL}${pic.picturePath}`} alt="Subscriber-only photo" className="w-full aspect-square object-cover" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---- ABOUT TAB ---- */}
        {activeTab === "about" && (
          <div className="space-y-6">
            {profileLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : !editingAbout ? (
              /* Read-only view */
              <div className="space-y-4">
                {/* Bio */}
                <div className="rounded-xl border border-border/50 bg-card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display text-base font-semibold flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" /> Bio
                    </h3>
                    <Button size="sm" variant="ghost" className="text-xs text-primary" onClick={() => setEditingAbout(true)}>
                      {t("profilePage.edit")}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{formState.bio || t("profilePage.noBio")}</p>
                </div>

                {/* Details grid */}
                <div className="rounded-xl border border-border/50 bg-card p-5">
                  <h3 className="font-display text-base font-semibold mb-4 flex items-center gap-2">
                    <Info className="h-4 w-4 text-primary" /> {t("profilePage.details")}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { icon: <MapPin className="h-4 w-4" />, label: t("profilePage.city"), value: formState.city },
                      { icon: <MapPin className="h-4 w-4" />, label: t("profilePage.address"), value: formState.address },
                      { icon: <User className="h-4 w-4" />, label: t("profile.gender"), value: formState.gender },
                      { icon: <Globe className="h-4 w-4" />, label: t("profile.ethnicity"), value: formState.ethnicity },
                      { icon: <Ruler className="h-4 w-4" />, label: t("profile.height"), value: formState.height ? `${formState.height} cm` : "—" },
                      { icon: <Weight className="h-4 w-4" />, label: t("profile.weight"), value: formState.weight ? `${formState.weight} kg` : "—" },
                      { icon: <Calendar className="h-4 w-4" />, label: t("profile.age"), value: formState.age || "—" },
                      { icon: <MessageCircle className="h-4 w-4" />, label: t("profilePage.phone"), value: formState.phoneNumber || "—" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2.5">
                        <span className="text-primary">{item.icon}</span>
                        <div className="min-w-0">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{item.label}</p>
                          <p className="text-sm font-medium text-foreground truncate">{item.value || "—"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Services */}
                <div className="rounded-xl border border-border/50 bg-card p-5">
                  <h3 className="font-display text-base font-semibold mb-3 flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary" /> {t("profile.services")}
                  </h3>
                  {formState.services.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {formState.services.map((s) => (
                        <Badge key={s} className="gold-gradient text-primary-foreground text-[11px] border-0">{s.replace("_", " ")}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t("profilePage.noServices")}</p>
                  )}
                </div>

                {/* Languages */}
                <div className="rounded-xl border border-border/50 bg-card p-5">
                  <h3 className="font-display text-base font-semibold mb-3 flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" /> {t("profile.languages")}
                  </h3>
                  {formState.languages.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {formState.languages.map((l) => (
                        <Badge key={l} variant="secondary" className="text-[11px] border-0">{l}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t("profilePage.noLanguages")}</p>
                  )}
                </div>

                {saveSuccess && (
                  <div className="rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-4 py-2 text-sm font-medium">
                    {t("profile.saved")}
                  </div>
                )}
              </div>
            ) : (
              /* Edit form */
              <form onSubmit={handleSaveProfile} className="space-y-5 rounded-xl border border-border/50 bg-card p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-semibold">{t("profilePage.editProfile")}</h2>
                  <Button type="button" size="sm" variant="ghost" className="text-xs" onClick={() => setEditingAbout(false)}>
                    {t("profilePage.cancel")}
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Username</Label>
                    <Input value={formState.username} readOnly disabled className="opacity-60" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("profilePage.city")} *</Label>
                    <Input value={formState.city} onChange={(e) => setFormState((s) => ({ ...s, city: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("profilePage.address")}</Label>
                    <Input value={formState.address} onChange={(e) => setFormState((s) => ({ ...s, address: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("profilePage.phone")}</Label>
                    <Input value={formState.phoneNumber} onChange={(e) => setFormState((s) => ({ ...s, phoneNumber: e.target.value }))} placeholder="+995..." />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Bio</Label>
                  <textarea
                    value={formState.bio}
                    onChange={(e) => setFormState((s) => ({ ...s, bio: e.target.value }))}
                    placeholder={t("profilePage.bioPlaceholder")}
                    className="w-full min-h-[80px] rounded-md border border-border/50 bg-background px-3 py-2 text-sm resize-y"
                    maxLength={2000}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("profile.gender")} *</Label>
                    <Select value={formState.gender} onValueChange={(v) => setFormState((s) => ({ ...s, gender: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{(enumOptions?.genders || []).map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("profile.ethnicity")} *</Label>
                    <Select value={formState.ethnicity} onValueChange={(v) => setFormState((s) => ({ ...s, ethnicity: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{(enumOptions?.ethnicities || []).map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 sm:gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("profile.height")} (cm)</Label>
                    <Input type="number" value={formState.height} onChange={(e) => setFormState((s) => ({ ...s, height: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("profile.weight")} (kg)</Label>
                    <Input type="number" value={formState.weight} onChange={(e) => setFormState((s) => ({ ...s, weight: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("profile.age")}</Label>
                    <Input type="number" value={formState.age} onChange={(e) => setFormState((s) => ({ ...s, age: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("profile.services")}</Label>
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
                  <Label className="text-xs">{t("profile.languages")}</Label>
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
                {updateMutation.isError && <p className="text-sm text-destructive">{updateMutation.error.message}</p>}
                {saveSuccess && <p className="text-sm text-emerald-600">{t("profile.saved")}</p>}
                <Button type="submit" disabled={updateMutation.isPending} className="gold-gradient w-full sm:w-auto">
                  {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("profilePage.saveChanges")}
                </Button>
              </form>
            )}
          </div>
        )}

        {/* ---- SETTINGS TAB ---- */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            {/* VIP Status & Purchase */}
            <div className="rounded-xl border border-border/50 bg-card p-4 sm:p-6">
              <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" /> {t("vipPurchase.title")}
              </h2>
              <div className="flex flex-col gap-4">
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
                    type="number" min={1} max={365} value={vipDays}
                    onChange={(e) => setVipDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-20 h-9 text-center"
                  />
                  <span className="text-xs text-muted-foreground">{t("vipPurchase.days")}</span>
                  <Button onClick={handlePurchaseVip} disabled={vipLoading || !canAffordVip} className="gold-gradient text-sm">
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

            {/* Subscription Price */}
            <div className="rounded-xl border-2 border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10 p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <h2 className="font-display text-base font-semibold flex items-center gap-2 mb-1">
                    <Banknote className="h-5 w-5 text-primary" /> {t("profilePage.subscriptionPrice")}
                  </h2>
                  <p className="text-xs text-muted-foreground">{t("profilePage.subscriptionPriceDesc")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number" min={0} step={1} placeholder="29"
                    value={formState.subscriptionPriceGel}
                    onChange={(e) => setFormState((s) => ({ ...s, subscriptionPriceGel: e.target.value }))}
                    className="w-24 sm:w-28 h-10 text-center text-lg font-semibold"
                  />
                  <span className="text-sm font-medium text-muted-foreground">₾/mo</span>
                  <Button onClick={handleSaveSubscriptionPrice} disabled={subPriceSaving} className="gold-gradient h-10">
                    {subPriceSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("profilePage.save")}
                  </Button>
                </div>
              </div>
              {subPriceSaved && <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-2">{t("profilePage.subscriptionPriceSaved")}</p>}
            </div>

            {/* Pricing */}
            <div className="rounded-xl border border-border/50 bg-card p-4 sm:p-6 space-y-5">
              <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                <Banknote className="h-5 w-5 text-primary" /> {t("profilePage.pricing")}
              </h2>
              {([
                [enumOptions?.serviceLocations?.[0] || "ჩემთან", inCall, setInCall] as const,
                [enumOptions?.serviceLocations?.[1] || "გამოძახებით", outCall, setOutCall] as const,
              ]).map(([label, prices, setPrices]) => (
                <div key={label} className="rounded-lg border border-border/30 bg-muted/30 p-3 sm:p-4 space-y-3">
                  <span className="font-display text-sm font-semibold">{label}</span>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {([["30 min", "price30min"], ["1 hour", "price1hour"], ["Whole Night", "priceWholeNight"]] as const).map(([lbl, key]) => (
                      <div key={key} className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">{lbl}</Label>
                        <Input type="number" min={0} placeholder="0" value={prices[key]} onChange={(e) => setPrices({ ...prices, [key]: e.target.value })} className="h-8 text-sm" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {pricesSaved && <p className="text-sm text-emerald-600">{t("profilePage.pricesSaved")}</p>}
              <Button onClick={handleSavePrices} disabled={pricesSaving} className="gold-gradient w-full sm:w-auto">
                {pricesSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("profilePage.savePrices")}
              </Button>
            </div>

            {/* Subscribers */}
            <div className="rounded-xl border border-border/50 bg-card p-4 sm:p-6">
              <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" /> {t("profilePage.mySubscribers")}
              </h2>
              {subsLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
              ) : subs.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t("profilePage.noSubscribers")}</p>
              ) : (
                <ul className="space-y-2">
                  {subs.map((s) => (
                    <li key={s.id || s.clientId} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-muted/30 border-b border-border/30 last:border-0">
                      <span className="text-sm truncate">{s.clientEmail ?? s.clientId}</span>
                      <Link to={`/messages?with=${s.clientId}`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline flex-shrink-0 ml-2">
                        <MessageCircle className="h-4 w-4" /> {t("profilePage.message")}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/* ===== POST CARD COMPONENT ===== */

function PostCard({
  post,
  isOwner,
  profilePicUrl,
  username,
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
  profilePicUrl: string;
  username: string;
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
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      {/* Post header - Facebook style */}
      <div className="flex items-center gap-3 p-4 pb-2">
        <img src={profilePicUrl} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{username}</p>
          <p className="text-xs text-muted-foreground">{new Date(post.createdAt).toLocaleString()}</p>
        </div>
        {isOwner && (
          <button type="button" onClick={onDelete} className="ml-auto text-muted-foreground hover:text-destructive transition-colors p-1">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Post content */}
      {post.content && <p className="text-sm text-foreground whitespace-pre-wrap px-4 pb-2">{post.content}</p>}

      {/* Post media */}
      {post.mediaPath && (
        <div className="border-t border-b border-border/30">
          {post.mediaType === "video" ? (
            <video src={buildPostMediaUrl(post.mediaPath)} className="w-full max-h-[400px] object-contain bg-black" controls />
          ) : (
            <img src={buildPostMediaUrl(post.mediaPath)} alt="Post media" className="w-full max-h-[400px] object-contain bg-muted/20" />
          )}
        </div>
      )}

      {/* Engagement bar */}
      <div className="flex items-center gap-1 px-4 py-2 border-t border-border/30">
        <button
          type="button"
          onClick={post.upvotedByMe ? onUnvote : onUpvote}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
            post.upvotedByMe ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <ThumbsUp className={`h-4 w-4 ${post.upvotedByMe ? "fill-current" : ""}`} /> {post.upvoteCount}
        </button>
        <button
          type="button"
          onClick={loadComments}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors"
        >
          <MessageSquare className="h-4 w-4" /> {post.commentCount}
        </button>
      </div>

      {/* Comments section */}
      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-border/30 bg-muted/10">
          {loadingComments ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
          ) : (
            <>
              <ul className="space-y-2 mb-3">
                {comments.map((c) => (
                  <li key={c.id} className="flex gap-2 text-sm">
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-muted-foreground">
                      {(c.userEmail ?? "U")[0].toUpperCase()}
                    </div>
                    <div className="bg-muted/50 rounded-lg px-3 py-1.5 min-w-0">
                      <span className="font-medium text-xs">{c.userEmail ?? c.userId}</span>
                      <p className="text-sm text-foreground">{c.content}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a comment..."
                  value={commentInputs[post.id] ?? ""}
                  onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && handleSendComment()}
                  className="flex-1 h-9 text-sm"
                />
                <Button size="sm" onClick={handleSendComment} className="h-9">Send</Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
