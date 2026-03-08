import { useState, useMemo, useCallback, useEffect } from "react";
import { Users, Search, SlidersHorizontal, X, RotateCcw, MapPin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import EscortCard from "@/components/EscortCard";
import { fetchAllEscorts } from "@/lib/escorts-api";

const PAGE_SIZE = 8;

interface Filters {
  search: string;
  minHeight: number;
  maxHeight: number;
  minWeight: number;
  maxWeight: number;
  minAge: number;
  maxAge: number;
  minPrice: number;
  maxPrice: number;
}

const defaultFilters: Filters = {
  search: "",
  minHeight: 140,
  maxHeight: 200,
  minWeight: 40,
  maxWeight: 120,
  minAge: 18,
  maxAge: 60,
  minPrice: 0,
  maxPrice: 5000,
};

interface AllEscortsProps {
  cityFilter?: string | null;
}

const AllEscorts = ({ cityFilter }: AllEscortsProps) => {
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [showFilters, setShowFilters] = useState(false);

  const apiFilters = useMemo(() => {
    const f: Record<string, string | number | undefined> = {};
    if (filters.search) f.search = filters.search;
    if (cityFilter) f.city = cityFilter;
    if (filters.minAge !== defaultFilters.minAge) f.minAge = filters.minAge;
    if (filters.maxAge !== defaultFilters.maxAge) f.maxAge = filters.maxAge;
    if (filters.minHeight !== defaultFilters.minHeight) f.minHeight = filters.minHeight;
    if (filters.maxHeight !== defaultFilters.maxHeight) f.maxHeight = filters.maxHeight;
    if (filters.minWeight !== defaultFilters.minWeight) f.minWeight = filters.minWeight;
    if (filters.maxWeight !== defaultFilters.maxWeight) f.maxWeight = filters.maxWeight;
    if (filters.minPrice !== defaultFilters.minPrice) f.minPrice = filters.minPrice;
    if (filters.maxPrice !== defaultFilters.maxPrice) f.maxPrice = filters.maxPrice;
    return f;
  }, [filters, cityFilter]);

  const { data, isLoading } = useQuery({
    queryKey: ["escorts", "all", apiFilters],
    queryFn: () => fetchAllEscorts(apiFilters),
  });

  const escorts = data?.items ?? [];

  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [cityFilter, apiFilters]);

  const isFiltered = useMemo(() => {
    return (
      !!cityFilter ||
      filters.search !== "" ||
      filters.minHeight !== defaultFilters.minHeight ||
      filters.maxHeight !== defaultFilters.maxHeight ||
      filters.minWeight !== defaultFilters.minWeight ||
      filters.maxWeight !== defaultFilters.maxWeight ||
      filters.minAge !== defaultFilters.minAge ||
      filters.maxAge !== defaultFilters.maxAge ||
      filters.minPrice !== defaultFilters.minPrice ||
      filters.maxPrice !== defaultFilters.maxPrice
    );
  }, [filters, cityFilter]);

  const shown = escorts.slice(0, visible);
  const hasMore = visible < escorts.length;

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
    setVisible(PAGE_SIZE);
  }, []);

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setVisible(PAGE_SIZE);
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl font-bold text-foreground">All Escorts</h2>
          {cityFilter && (
            <span className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              <MapPin className="h-3 w-3" /> {cityFilter}
            </span>
          )}
          {data?.meta && (
            <span className="text-xs text-muted-foreground">({data.meta.total} results)</span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className={`border-border/50 gap-1.5 text-xs ${showFilters ? "text-primary border-primary/30" : "text-muted-foreground"}`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
        </Button>
      </div>

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by username or phone number..."
          value={filters.search}
          onChange={(e) => updateFilter("search", e.target.value)}
          className="bg-card border-border/50 pl-10 h-11 text-sm placeholder:text-muted-foreground/60"
        />
        {filters.search && (
          <button onClick={() => updateFilter("search", "")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {showFilters && (
        <div className="mb-6 rounded-lg border border-border/50 bg-card p-4 space-y-5 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Filter Escorts</h3>
            {isFiltered && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="text-xs text-muted-foreground hover:text-primary gap-1">
                <RotateCcw className="h-3 w-3" /> Reset
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2.5">
              <Label className="text-xs text-muted-foreground">Age Range</Label>
              <Slider min={18} max={60} step={1} value={[filters.minAge, filters.maxAge]} onValueChange={([min, max]) => setFilters((f) => ({ ...f, minAge: min, maxAge: max }))} />
              <div className="flex justify-between text-[10px] text-muted-foreground"><span>{filters.minAge} yrs</span><span>{filters.maxAge} yrs</span></div>
            </div>
            <div className="space-y-2.5">
              <Label className="text-xs text-muted-foreground">Height (cm)</Label>
              <Slider min={140} max={200} step={1} value={[filters.minHeight, filters.maxHeight]} onValueChange={([min, max]) => setFilters((f) => ({ ...f, minHeight: min, maxHeight: max }))} />
              <div className="flex justify-between text-[10px] text-muted-foreground"><span>{filters.minHeight} cm</span><span>{filters.maxHeight} cm</span></div>
            </div>
            <div className="space-y-2.5">
              <Label className="text-xs text-muted-foreground">Weight (kg)</Label>
              <Slider min={40} max={120} step={1} value={[filters.minWeight, filters.maxWeight]} onValueChange={([min, max]) => setFilters((f) => ({ ...f, minWeight: min, maxWeight: max }))} />
              <div className="flex justify-between text-[10px] text-muted-foreground"><span>{filters.minWeight} kg</span><span>{filters.maxWeight} kg</span></div>
            </div>
            <div className="space-y-2.5">
              <Label className="text-xs text-muted-foreground">Price Range ($)</Label>
              <Slider min={0} max={5000} step={50} value={[filters.minPrice, filters.maxPrice]} onValueChange={([min, max]) => setFilters((f) => ({ ...f, minPrice: min, maxPrice: max }))} />
              <div className="flex justify-between text-[10px] text-muted-foreground"><span>${filters.minPrice}</span><span>${filters.maxPrice}</span></div>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full rounded-lg" />
          ))}
        </div>
      ) : shown.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shown.map((escort, i) => (
            <div key={escort.id} className="opacity-0 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
              <EscortCard escort={escort} compact />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground font-medium">No escorts found</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Try adjusting your search or filters</p>
          {isFiltered && (
            <Button variant="outline" size="sm" onClick={resetFilters} className="mt-4 border-border/50 text-xs gap-1">
              <RotateCcw className="h-3 w-3" /> Reset Filters
            </Button>
          )}
        </div>
      )}

      {hasMore && (
        <div className="mt-6 flex justify-center">
          <Button variant="outline" onClick={() => setVisible((v) => v + PAGE_SIZE)} className="border-primary/30 text-primary hover:bg-primary/10">
            Load More
          </Button>
        </div>
      )}
    </div>
  );
};

export default AllEscorts;
