import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Crown, ShieldCheck, MapPin, Eye, DollarSign, Ruler, Weight, Globe, Briefcase, User, Star, Calendar } from "lucide-react";

const WHATSAPP_MSG = "I saw your profile at elit.ge @ velvet-escapes";

function getWhatsAppUrl(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const num = digits.startsWith("995") ? digits : `995${digits.slice(-9)}`;
  return `https://wa.me/${num}?text=${encodeURIComponent(WHATSAPP_MSG)}`;
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.717-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.865 9.865 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
import { fetchEscortById, type EscortPrices } from "@/lib/escorts-api";
import { buildImageUrl } from "@/lib/api";
import { useFavorites } from "@/contexts/FavoritesContext";

const PLACEHOLDER = "/placeholder.svg";

const PriceCard = ({ title, prices }: { title: string; prices: EscortPrices | null }) => (
  <div className="rounded-xl border border-border/50 bg-card p-5">
    <div className="flex items-center gap-2 mb-4">
      <DollarSign className="h-4 w-4 text-primary" />
      <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>
    </div>
    {prices ? (
      <div className="space-y-3">
        {([["30 Minutes", prices.price30min], ["1 Hour", prices.price1hour], ["Whole Night", prices.priceWholeNight]] as const).map(([label, price]) => (
          <div key={label} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className="font-display text-lg font-bold gold-text">${price}</span>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-sm text-muted-foreground">Not specified</p>
    )}
  </div>
);

const EscortProfile = () => {
  const { id } = useParams();
  const [showContact, setShowContact] = useState(false);
  const { isFavorite, toggleFavorite } = useFavorites();

  const { data: escort, isLoading, error } = useQuery({
    queryKey: ["escort", id],
    queryFn: () => fetchEscortById(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-8">
          <Skeleton className="h-5 w-32 mb-6" />
          <div className="flex flex-col gap-8 lg:flex-row">
            <Skeleton className="w-full lg:w-[420px] aspect-[3/4] rounded-xl" />
            <div className="flex-1 space-y-4">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-5 w-64" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
              </div>
              <Skeleton className="h-32 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !escort) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-20 text-center">
          <p className="text-muted-foreground">Profile not found.</p>
          <Link to="/" className="mt-4 inline-block text-primary hover:underline">Back to Home</Link>
        </div>
      </div>
    );
  }

  const mainImage = escort.profilePicture ? buildImageUrl(escort.profilePicture.picturePath) : PLACEHOLDER;
  const galleryImages = escort.pictures?.filter(p => !p.isProfilePicture) ?? [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-8">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to browse
        </Link>

        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Left: Images */}
          <div className="w-full lg:w-[420px] flex-shrink-0 space-y-3">
            <div className="overflow-hidden rounded-xl border border-border/50">
              <img src={mainImage} alt={escort.username} className="h-auto w-full object-cover aspect-[3/4]" />
            </div>
            {galleryImages.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {galleryImages.map((pic) => (
                   <div key={pic.id} className="overflow-hidden rounded-lg border border-border/50">
                     <img src={buildImageUrl(pic.picturePath)} alt="" className="h-full w-full object-cover aspect-square" loading="lazy" />
                   </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Info */}
          <div className="flex-1 space-y-6">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">{escort.username}</h1>
                {escort.isVip && (
                  <span className="flex items-center gap-1 rounded-full gold-gradient px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground">
                    <Crown className="h-3.5 w-3.5" /> VIP
                  </span>
                )}
                {escort.isVerified && (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-500/90 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground">
                    <ShieldCheck className="h-3.5 w-3.5" /> Verified
                  </span>
                )}
              </div>

              <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1"><MapPin className="h-4 w-4 text-primary" /> {escort.city}{escort.address && escort.address !== escort.city ? `, ${escort.address}` : ""}</span>
                <span className="flex items-center gap-1"><Eye className="h-4 w-4" /> {escort.viewCount.toLocaleString()} views</span>
                {escort.averageRating > 0 && (
                  <span className="flex items-center gap-1"><Star className="h-4 w-4 text-primary" /> {escort.averageRating.toFixed(1)} ({escort.reviewsCount})</span>
                )}
              </div>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { icon: <User className="h-4 w-4" />, label: "Gender", value: escort.gender },
                { icon: <Globe className="h-4 w-4" />, label: "Ethnicity", value: escort.ethnicity },
                { icon: <Ruler className="h-4 w-4" />, label: "Height", value: escort.height ? `${escort.height} cm` : "—" },
                { icon: <Weight className="h-4 w-4" />, label: "Weight", value: escort.weight ? `${escort.weight} kg` : "—" },
                ...(escort.age ? [{ icon: <Calendar className="h-4 w-4" />, label: "Age", value: `${escort.age}` }] : []),
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-border/50 bg-card p-3 text-center">
                  <div className="flex justify-center text-primary mb-1">{item.icon}</div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{item.label}</p>
                  <p className="text-sm font-medium text-foreground">{item.value}</p>
                </div>
              ))}
            </div>

            {/* Services */}
            {escort.services?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">Services</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {escort.services.map((s) => (
                    <Badge key={s} className="gold-gradient text-primary-foreground text-[10px] border-0">{s.replace("_", " ")}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Languages */}
            {escort.languages?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">Languages</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {escort.languages.map((l) => (
                    <Badge key={l} variant="secondary" className="bg-secondary border-0 text-[10px]">{l}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews summary */}
            <div className="rounded-lg border border-border/50 bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Star className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Reviews</span>
              </div>
              {escort.reviewsCount > 0 ? (
                <p className="text-sm text-muted-foreground">{escort.averageRating.toFixed(1)} average from {escort.reviewsCount} reviews</p>
              ) : (
                <p className="text-sm text-muted-foreground">No reviews yet</p>
              )}
            </div>

            <div className="flex flex-wrap gap-3 items-center relative z-10" id="escort-actions">
              {escort.phoneNumber ? (
                showContact ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg border border-border/50 bg-card px-4 py-2.5 font-medium text-foreground">
                      {escort.phoneNumber}
                    </span>
                    <a
                      href={getWhatsAppUrl(escort.phoneNumber)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 font-semibold text-white transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#25D366]/50"
                    >
                      <WhatsAppIcon className="h-5 w-5" />
                      WhatsApp
                    </a>
                  </div>
                ) : (
                  <a
                    href="#show-contact"
                    className="gold-gradient inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-primary-foreground shadow transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowContact(true);
                    }}
                  >
                    Contact
                  </a>
                )
              ) : (
                <span className="text-sm text-muted-foreground">Contact not available</span>
              )}
              <a
                href="#save-profile"
                className={`inline-flex items-center justify-center gap-1.5 rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent cursor-pointer ${isFavorite(escort.id) ? "border-primary text-primary" : "border-border bg-background"}`}
                onClick={(e) => {
                  e.preventDefault();
                  toggleFavorite({
                    id: escort.id,
                    username: escort.username,
                    city: escort.city,
                    profilePicturePath: escort.profilePicture?.picturePath ?? null,
                  });
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill={isFavorite(escort.id) ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="h-4 w-4"
                >
                  <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                </svg>
                {isFavorite(escort.id) ? "Saved" : "Save Profile"}
              </a>
            </div>

            {/* Pricing */}
            <div className="grid gap-4 sm:grid-cols-2">
              <PriceCard title="In Call" prices={escort.prices.inCall} />
              <PriceCard title="Out Call" prices={escort.prices.outCall} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EscortProfile;
