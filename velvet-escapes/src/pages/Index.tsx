import { useState } from "react";
import Header from "@/components/Header";
import VIPCarousel from "@/components/VIPCarousel";
import AllEscorts from "@/components/AllEscorts";
import OnlineNow from "@/components/OnlineNow";
import TopViewed from "@/components/TopViewed";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

const HOMEPAGE_JSONLD = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "ELITEFUN",
    alternateName: ["Elite Fun", "EliteScort", "ელიტფან"],
    url: "https://elitescort.fun",
    description: "Premium escort directory in Georgia — browse verified profiles in Tbilisi, Batumi, Kutaisi and more.",
    inLanguage: ["ka", "en", "ru"],
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://elitescort.fun/?search={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Escort Profiles in Georgia",
    description: "Browse verified escort profiles across Georgia including Tbilisi, Batumi, Kutaisi and more.",
    url: "https://elitescort.fun/",
    numberOfItems: 100,
    itemListOrder: "https://schema.org/ItemListUnordered",
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://elitescort.fun/",
      },
    ],
  },
];

const Index = () => {
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        canonical="/"
        description="Escort girls in Georgia — Tbilisi, Batumi, Kutaisi and more. ესკორტ გოგოები საქართველოში — თბილისი, ბათუმი, ქუთაისი. Browse verified VIP escort profiles. Premium companion directory."
        keywords="escort girls Georgia, escort gogoebi, escort Tbilisi, escort Batumi, escort Kutaisi, ესკორტ გოგოები, ესკორტ გოგო, ესკორტი თბილისი, ესკორტი ბათუმი, ესკორტი ქუთაისი, VIP escort Georgia, premium escort service"
        jsonLd={HOMEPAGE_JSONLD}
      />
      <Header />
      <main>
        <VIPCarousel />
        <section className="container pb-16 flex-1">
          <div className="flex flex-col gap-8 lg:flex-row">
            <div className="flex-1 min-w-0">
              <AllEscorts cityFilter={selectedCity} />
            </div>
            <aside className="w-full lg:w-80 flex-shrink-0 space-y-8">
              <OnlineNow />
              <TopViewed />
            </aside>
          </div>
        </section>
      </main>
      <Footer selectedCity={selectedCity} onCitySelect={setSelectedCity} />
    </div>
  );
};

export default Index;
