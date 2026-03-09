import { useState } from "react";
import Header from "@/components/Header";
import VIPCarousel from "@/components/VIPCarousel";
import AllEscorts from "@/components/AllEscorts";
import TopViewed from "@/components/TopViewed";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

const WEBSITE_JSONLD = {
  "@type": "WebSite",
  name: "ELITEFUN",
  url: "https://elitescort.fun",
  potentialAction: {
    "@type": "SearchAction",
    target: "https://elitescort.fun/?search={search_term_string}",
    "query-input": "required name=search_term_string",
  },
};

const Index = () => {
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        canonical="/"
        description="Browse verified escort profiles in Tbilisi, Batumi, Kutaisi and more. Premium companion directory in Georgia."
        jsonLd={WEBSITE_JSONLD}
      />
      <Header />
      <main>
        <VIPCarousel />
        <section className="container pb-16 flex-1">
          <div className="flex flex-col gap-8 lg:flex-row">
            <div className="flex-1 min-w-0">
              <AllEscorts cityFilter={selectedCity} />
            </div>
            <aside className="w-full lg:w-80 flex-shrink-0">
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
