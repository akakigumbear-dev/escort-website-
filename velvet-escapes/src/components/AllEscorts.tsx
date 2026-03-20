import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Users, Search, SlidersHorizontal, X, RotateCcw, MapPin, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import EscortCard from "@/components/EscortCard";
import { fetchAllEscorts, fetchFilterOptions, type EscortFilters } from "@/lib/escorts-api";

const PAGE_SIZE = 12;
const ALL_VALUE = "__all__";

const defaultFilters = {
  search: "",
  city: "",
  minHeight: 140,
  maxHeight: 200,
  minWeight: 40,
  maxWeight: 120,
  minAge: 18,
  maxAge: 60,
  minPrice: 0,
  maxPrice: 5000,
  gender: "",
  ethnicity: "",
  sortBy: "viewCount" as const,
  sortOrder: "DESC" as const,
};

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debouncedValue;
}

interface AllEscortsProps {
  cityFilter?: string | null;
}

const AllEscorts = ({ cityFilter }: AllEscortsProps) => {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(defaultFilters);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const debouncedSearch = useDebounce(filters.search, 350);

  const apiFilters: EscortFilters = useMemo(() => {
    const f: EscortFilters = {
      page,
      limit: PAGE_SIZE,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    };
    if (debouncedSearch.trim()) f.search = debouncedSearch.trim();
    if (cityFilter) f.city = cityFilter;
    else if (filters.city && filters.city !== ALL_VALUE) f.city = filters.city;
    if (filters.minAge !== defaultFilters.minAge) f.minAge = filters.minAge;
    if (filters.maxAge !== defaultFilters.maxAge) f.maxAge = filters.maxAge;
    if (filters.minHeight !== defaultFilters.minHeight) f.minHeight = filters.minHeight;
    if (filters.maxHeight !== defaultFilters.maxHeight) f.maxHeight = filters.maxHeight;
    if (filters.minWeight !== defaultFilters.minWeight) f.minWeight = filters.minWeight;
    if (filters.maxWeight !== defaultFilters.maxWeight) f.maxWeight = filters.maxWeight;
    if (filters.minPrice !== defaultFilters.minPrice) f.minPrice = filters.minPrice;
    if (filters.maxPrice !== defaultFilters.maxPrice) f.maxPrice = filters.maxPrice;
    if (filters.gender && filters.gender !== ALL_VALUE) f.gender = filters.gender;
    if (filters.ethnicity && filters.ethnicity !== ALL_VALUE) f.ethnicity = filters.ethnicity;
    return f;
  }, [page, debouncedSearch, cityFilter, filters]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["escorts", "all", apiFilters],
    queryFn: () => fetchAllEscorts(apiFilters),
    placeholderData: keepPreviousData,
  });

  const { data: filterOptions } = useQuery({
    queryKey: ["escort", "filter-options"],
    queryFn: fetchFilterOptions,
  });

  const escorts = data?.items ?? [];
  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  useEffect(() => {
    setPage(1);
  }, [cityFilter, debouncedSearch, filters.city, filters.gender, filters.ethnicity, filters.sortBy, filters.sortOrder]);

  const advancedFilterCount = useMemo(() => {
    let count = 0;
    if (filters.minAge !== defaultFilters.minAge || filters.maxAge !== defaultFilters.maxAge) count++;
    if (filters.minHeight !== defaultFilters.minHeight || filters.maxHeight !== defaultFilters.maxHeight) count++;
    if (filters.minWeight !== defaultFilters.minWeight || filters.maxWeight !== defaultFilters.maxWeight) count++;
    if (filters.minPrice !== defaultFilters.minPrice || filters.maxPrice !== defaultFilters.maxPrice) count++;
    if (filters.ethnicity && filters.ethnicity !== ALL_VALUE) count++;
    return count;
  }, [filters]);

  const isFiltered = useMemo(() => {
    return (
      !!cityFilter ||
      !!filters.search ||
      (filters.city !== "" && filters.city !== ALL_VALUE) ||
      (filters.gender !== "" && filters.gender !== ALL_VALUE) ||
      advancedFilterCount > 0
    );
  }, [filters, cityFilter, advancedFilterCount]);

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
    setPage(1);
  }, []);

  const updateFilter = <K extends keyof typeof filters>(key: K, value: typeof filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const goToPage = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div>
      {/* Title row */}
      <div className="mb-3 flex items-center gap-2 flex-wrap">
        <Users className="h-5 w-5 text-primary flex-shrink-0" />
        <h2 className="font-display text-xl font-bold text-foreground">{t("allEscorts.title")}</h2>
        {cityFilter && (
          <span className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            <MapPin className="h-3 w-3" /> {cityFilter}
          </span>
        )}
        {meta && (
          <span className="text-xs text-muted-foreground ml-auto">
            {t("allEscorts.results", { count: meta.total })}
          </span>
        )}
      </div>

      {/* Search + Sort row */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={t("allEscorts.searchPlaceholder")}
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="bg-card border-border/50 pl-9 h-10 text-sm placeholder:text-muted-foreground/60"
          />
          {filters.search && (
            <button onClick={() => updateFilter("search", "")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Select
          value={filters.sortBy + "-" + filters.sortOrder}
          onValueChange={(v) => {
            const [sortBy, sortOrder] = v.split("-") as ["viewCount" | "createdAt" | "username", "ASC" | "DESC"];
            updateFilter("sortBy", sortBy);
            updateFilter("sortOrder", sortOrder);
          }}
        >
          <SelectTrigger className="w-10 sm:w-[160px] h-10 text-xs border-border/50 shrink-0 [&>span]:hidden sm:[&>span]:block [&>svg.lucide-chevron-down]:block">
            <ChevronDown className="h-4 w-4 sm:hidden" />
            <SelectValue placeholder={t("allEscorts.sortBy")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="viewCount-DESC">{t("allEscorts.mostViewed")}</SelectItem>
            <SelectItem value="viewCount-ASC">{t("allEscorts.leastViewed")}</SelectItem>
            <SelectItem value="createdAt-DESC">{t("allEscorts.newest")}</SelectItem>
            <SelectItem value="createdAt-ASC">{t("allEscorts.oldest")}</SelectItem>
            <SelectItem value="username-ASC">{t("allEscorts.nameAZ")}</SelectItem>
            <SelectItem value="username-DESC">{t("allEscorts.nameZA")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Quick filter chips */}
      <div className="flex gap-1.5 mb-3 flex-wrap items-center">
        {/* City chips */}
        {!cityFilter && (filterOptions?.cities ?? []).slice(0, 8).map((city) => (
          <button
            key={city}
            type="button"
            onClick={() => updateFilter("city", filters.city === city ? "" : city)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
              filters.city === city
                ? "gold-gradient text-primary-foreground border-transparent shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:text-foreground border-border/40 hover:bg-muted"
            }`}
          >
            {city}
          </button>
        ))}

        {/* Gender chips */}
        {(filterOptions?.genders ?? []).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => updateFilter("gender", filters.gender === g ? "" : g)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
              filters.gender === g
                ? "bg-primary text-primary-foreground border-transparent shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:text-foreground border-border/40 hover:bg-muted"
            }`}
          >
            {g}
          </button>
        ))}

        {/* Advanced filters sheet trigger */}
        <Sheet open={showAdvanced} onOpenChange={setShowAdvanced}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="relative flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border border-border/50 bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("allEscorts.filters")}</span>
              {advancedFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {advancedFilterCount}
                </span>
              )}
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-sm overflow-y-auto">
            <SheetHeader className="mb-4">
              <SheetTitle className="flex items-center justify-between pr-8">
                <span>{t("allEscorts.filterTitle")}</span>
                {advancedFilterCount > 0 && (
                  <button type="button" onClick={resetFilters} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                    <RotateCcw className="h-3 w-3" /> {t("allEscorts.reset")}
                  </button>
                )}
              </SheetTitle>
            </SheetHeader>
            <div className="space-y-6 px-1 pb-8">
              {(filterOptions?.ethnicities ?? []).length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">{t("allEscorts.ethnicity")}</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {filterOptions!.ethnicities.map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => updateFilter("ethnicity", filters.ethnicity === e ? "" : e)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                          filters.ethnicity === e
                            ? "bg-primary text-primary-foreground border-transparent"
                            : "bg-muted text-muted-foreground hover:bg-muted/80 border-border/40"
                        }`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground flex justify-between">
                  {t("allEscorts.age")} <span className="text-foreground font-semibold">{filters.minAge}–{filters.maxAge} yrs</span>
                </Label>
                <Slider min={18} max={60} step={1} value={[filters.minAge, filters.maxAge]} onValueChange={([min, max]) => { updateFilter("minAge", min); updateFilter("maxAge", max); }} />
              </div>
              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground flex justify-between">
                  {t("allEscorts.height")} <span className="text-foreground font-semibold">{filters.minHeight}–{filters.maxHeight} cm</span>
                </Label>
                <Slider min={140} max={200} step={1} value={[filters.minHeight, filters.maxHeight]} onValueChange={([min, max]) => { updateFilter("minHeight", min); updateFilter("maxHeight", max); }} />
              </div>
              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground flex justify-between">
                  {t("allEscorts.weight")} <span className="text-foreground font-semibold">{filters.minWeight}–{filters.maxWeight} kg</span>
                </Label>
                <Slider min={40} max={120} step={1} value={[filters.minWeight, filters.maxWeight]} onValueChange={([min, max]) => { updateFilter("minWeight", min); updateFilter("maxWeight", max); }} />
              </div>
              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground flex justify-between">
                  {t("allEscorts.price")} <span className="text-foreground font-semibold">{filters.minPrice}–{filters.maxPrice} ₾</span>
                </Label>
                <Slider min={0} max={5000} step={50} value={[filters.minPrice, filters.maxPrice]} onValueChange={([min, max]) => { updateFilter("minPrice", min); updateFilter("maxPrice", max); }} />
              </div>
              <Button className="w-full gold-gradient" onClick={() => setShowAdvanced(false)}>
                {t("allEscorts.results", { count: meta?.total ?? 0 })}
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Active filter tags */}
        {filters.city && filters.city !== ALL_VALUE && !cityFilter && (
          <button type="button" onClick={() => updateFilter("city", "")} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 transition-colors">
            <MapPin className="h-3 w-3" /> {filters.city} <X className="h-3 w-3" />
          </button>
        )}
        {filters.gender && filters.gender !== ALL_VALUE && (
          <button type="button" onClick={() => updateFilter("gender", "")} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 transition-colors">
            {filters.gender} <X className="h-3 w-3" />
          </button>
        )}
        {isFiltered && (
          <button type="button" onClick={resetFilters} className="flex items-center gap-1 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <RotateCcw className="h-3 w-3" /> {t("allEscorts.reset")}
          </button>
        )}
      </div>

      {/* Results */}
      {(isLoading || isFetching) && escorts.length === 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full rounded-lg" />
          ))}
        </div>
      ) : escorts.length > 0 ? (
        <>
          <div className={`grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 transition-opacity duration-150 ${isFetching ? "opacity-60 pointer-events-none" : "opacity-100"}`}>
            {escorts.map((escort, i) => (
              <div key={escort.id} className="opacity-0 animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                <EscortCard escort={escort} compact />
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-1.5 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => goToPage(Math.max(1, page - 1))} disabled={page <= 1 || isFetching} className="gap-1 h-9">
                <ChevronLeft className="h-4 w-4" /> <span className="hidden sm:inline">{t("allEscorts.prev")}</span>
              </Button>

              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let p: number;
                if (totalPages <= 5) p = i + 1;
                else if (page <= 3) p = i + 1;
                else if (page >= totalPages - 2) p = totalPages - 4 + i;
                else p = page - 2 + i;
                return (
                  <Button
                    key={p}
                    size="sm"
                    onClick={() => goToPage(p)}
                    disabled={isFetching}
                    className={`h-9 w-9 p-0 text-xs ${p === page ? "gold-gradient text-primary-foreground" : "variant-outline border border-border/50 bg-card text-foreground hover:bg-muted"}`}
                  >
                    {p}
                  </Button>
                );
              })}

              <Button variant="outline" size="sm" onClick={() => goToPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages || isFetching} className="gap-1 h-9">
                <span className="hidden sm:inline">{t("allEscorts.next")}</span> <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground font-medium">{t("allEscorts.noResults")}</p>
          <p className="text-xs text-muted-foreground/60 mt-1">{t("allEscorts.tryFilters")}</p>
          {isFiltered && (
            <Button variant="outline" size="sm" onClick={resetFilters} className="mt-4 border-border/50 text-xs gap-1">
              <RotateCcw className="h-3 w-3" /> {t("allEscorts.resetFilters")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default AllEscorts;
