import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import EscortCard from "@/components/EscortCard";
import { vipEscorts } from "@/data/escorts";

const VIPCarousel = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

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
    <section className="relative py-10">
      <div className="container">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="font-display text-2xl font-bold md:text-3xl">
              <span className="gold-text">VIP</span>{" "}
              <span className="text-foreground">Escorts</span>
            </h2>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              className="h-9 w-9 rounded-full border-border/50 bg-card hover:bg-surface-hover disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              className="h-9 w-9 rounded-full border-border/50 bg-card hover:bg-surface-hover disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="scrollbar-none flex gap-4 overflow-x-auto px-[max(1rem,calc((100vw-1400px)/2+2rem))] pb-2 snap-x"
      >
        {vipEscorts.map((escort, i) => (
          <div
            key={escort.id}
            className="w-[220px] flex-shrink-0 snap-start opacity-0 animate-fade-in md:w-[240px]"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <EscortCard escort={escort} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default VIPCarousel;
