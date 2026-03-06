import { useState } from "react";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import EscortCard from "@/components/EscortCard";
import { escorts } from "@/data/escorts";

const PAGE_SIZE = 8;

const AllEscorts = () => {
  const [visible, setVisible] = useState(PAGE_SIZE);
  const shown = escorts.slice(0, visible);
  const hasMore = visible < escorts.length;

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-bold text-foreground">All Escorts</h2>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {shown.map((escort, i) => (
          <div
            key={escort.id}
            className="opacity-0 animate-fade-in"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <EscortCard escort={escort} compact />
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="mt-6 flex justify-center">
          <Button
            variant="outline"
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="border-primary/30 text-primary hover:bg-primary/10"
          >
            Load More
          </Button>
        </div>
      )}
    </div>
  );
};

export default AllEscorts;
