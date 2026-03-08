import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import EscortCard from "@/components/EscortCard";
import { fetchVipEscorts } from "@/lib/escorts-api";

const VIPCarousel = () => {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const { data: vipEscorts = [], isLoading } = useQuery({
    queryKey: ["escorts", "vips"],
    queryFn: fetchVipEscorts,
  });

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.7;
    scrollRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
    setTimeout(checkScroll, 400);
  };

  return (
    <section className="relative py-10 overflow-hidden">
      <div className="container">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="font-display text-2xl font-bold md:text-3xl">
              <span className="gold-text">{t("vip.title")}</span>{" "}
              <span className="text-foreground">{t("vip.escorts")}</span>
            </h2>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => scroll("left")} disabled={!canScrollLeft} className="h-9 w-9 rounded-full border-border/50 bg-card hover:bg-surface-hover disabled:opacity-30">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => scroll("right")} disabled={!canScrollRight} className="h-9 w-9 rounded-full border-border/50 bg-card hover:bg-surface-hover disabled:opacity-30">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-4 overflow-x-auto overflow-y-hidden px-[max(1rem,calc((100vw-1400px)/2+2rem))] pb-2 snap-x [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="w-[220px] flex-shrink-0 md:w-[240px]">
                <Skeleton className="aspect-[3/4] w-full rounded-lg" />
              </div>
            ))
          : vipEscorts.map((escort, i) => (
              <div key={escort.id} className="w-[220px] flex-shrink-0 snap-start opacity-0 animate-fade-in md:w-[240px]" style={{ animationDelay: `${i * 80}ms` }}>
                <EscortCard escort={escort} />
              </div>
            ))}
      </div>

      {!isLoading && vipEscorts.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">{t("vip.noVip")}</p>
      )}
    </section>
  );
};

export default VIPCarousel;
