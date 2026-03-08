import { useState } from "react";
import Header from "@/components/Header";
import VIPCarousel from "@/components/VIPCarousel";
import AllEscorts from "@/components/AllEscorts";
import TopViewed from "@/components/TopViewed";
import Footer from "@/components/Footer";

const Index = () => {
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
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

      <Footer selectedCity={selectedCity} onCitySelect={setSelectedCity} />
    </div>
  );
};

export default Index;
