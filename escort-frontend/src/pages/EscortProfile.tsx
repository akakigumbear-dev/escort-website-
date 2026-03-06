import { useParams, Link } from "react-router-dom";
import { escorts } from "@/data/escorts";
import Header from "@/components/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Crown, ShieldCheck, MapPin, Eye, Heart, DollarSign, Ruler, Weight, Globe, Briefcase, User } from "lucide-react";

const mockProfileData = {
  services: ["DINNER", "EVENT", "TRAVEL"],
  height: 170,
  weight: 55,
  languages: ["EN", "KA", "RU"],
  address: "Vake",
  prices: {
    inCall: { price30min: 100, price1hour: 180, priceWholeNight: 600 },
    outCall: { price30min: 200, price1hour: 300, priceWholeNight: 1200 },
  },
};

const PriceCard = ({ title, prices }: { title: string; prices: { price30min: number; price1hour: number; priceWholeNight: number } }) => (
  <div className="rounded-xl border border-border/50 bg-card p-5">
    <div className="flex items-center gap-2 mb-4">
      <DollarSign className="h-4 w-4 text-primary" />
      <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>
    </div>
    <div className="space-y-3">
      {([["30 Minutes", prices.price30min], ["1 Hour", prices.price1hour], ["Whole Night", prices.priceWholeNight]] as const).map(([label, price]) => (
        <div key={label} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className="font-display text-lg font-bold gold-text">${price}</span>
        </div>
      ))}
    </div>
  </div>
);

const EscortProfile = () => {
  const { id } = useParams();
  const escort = escorts.find((e) => e.id === id);

  if (!escort) {
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

  const data = mockProfileData;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-8">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to browse
        </Link>

        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Left: Image */}
          <div className="w-full lg:w-[420px] flex-shrink-0">
            <div className="overflow-hidden rounded-xl border border-border/50">
              <img src={escort.image} alt={escort.username} className="h-auto w-full object-cover aspect-[3/4]" />
            </div>
          </div>

          {/* Right: Info */}
          <div className="flex-1 space-y-6">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">{escort.username}</h1>
                {escort.vip && (
                  <span className="flex items-center gap-1 rounded-full gold-gradient px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground">
                    <Crown className="h-3.5 w-3.5" /> VIP
                  </span>
                )}
                {escort.verified && (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-500/90 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground">
                    <ShieldCheck className="h-3.5 w-3.5" /> Verified
                  </span>
                )}
              </div>

              <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1"><MapPin className="h-4 w-4 text-primary" /> {escort.city}, {data.address}</span>
                <span className="flex items-center gap-1"><Eye className="h-4 w-4" /> {escort.views.toLocaleString()} views</span>
              </div>
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { icon: <User className="h-4 w-4" />, label: "Gender", value: escort.gender },
                { icon: <Globe className="h-4 w-4" />, label: "Ethnicity", value: escort.ethnicity },
                { icon: <Ruler className="h-4 w-4" />, label: "Height", value: `${data.height} cm` },
                { icon: <Weight className="h-4 w-4" />, label: "Weight", value: `${data.weight} kg` },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-border/50 bg-card p-3 text-center">
                  <div className="flex justify-center text-primary mb-1">{item.icon}</div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{item.label}</p>
                  <p className="text-sm font-medium text-foreground">{item.value}</p>
                </div>
              ))}
            </div>

            {/* Services */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Services</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {data.services.map((s) => (
                  <Badge key={s} className="gold-gradient text-primary-foreground text-[10px] border-0">{s.replace("_", " ")}</Badge>
                ))}
              </div>
            </div>

            {/* Languages */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Globe className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Languages</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {data.languages.map((l) => (
                  <Badge key={l} variant="secondary" className="bg-secondary border-0 text-[10px]">{l}</Badge>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button className="gold-gradient font-semibold"><Heart className="h-4 w-4 mr-1" /> Contact</Button>
              <Button variant="outline" className="border-border/50">Save Profile</Button>
            </div>

            {/* Pricing */}
            <div className="grid gap-4 sm:grid-cols-2">
              <PriceCard title="In Call" prices={data.prices.inCall} />
              <PriceCard title="Out Call" prices={data.prices.outCall} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EscortProfile;
