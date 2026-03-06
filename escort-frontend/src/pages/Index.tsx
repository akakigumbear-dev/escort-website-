import Header from "@/components/Header";
import VIPCarousel from "@/components/VIPCarousel";
import AllEscorts from "@/components/AllEscorts";
import TopViewed from "@/components/TopViewed";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <VIPCarousel />

      <section className="container pb-16">
        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="flex-1 min-w-0">
            <AllEscorts />
          </div>
          <aside className="w-full lg:w-80 flex-shrink-0">
            <TopViewed />
          </aside>
        </div>
      </section>
    </div>
  );
};

export default Index;
