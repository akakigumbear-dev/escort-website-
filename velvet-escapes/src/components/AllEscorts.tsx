import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Users, Search, SlidersHorizontal, X, RotateCcw, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [showFilters, setShowFilters] = useState(false);

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

  const isFiltered = useMemo(() => {
    return (
      !!cityFilter ||
      !!filters.search ||
      (filters.city !== "" && filters.city !== ALL_VALUE) ||
      filters.minHeight !== defaultFilters.minHeight ||
      filters.maxHeight !== defaultFilters.maxHeight ||
      filters.minWeight !== defaultFilters.minWeight ||
      filters.maxWeight !== defaultFilters.maxWeight ||
      filters.minAge !== defaultFilters.minAge ||
      filters.maxAge !== defaultFilters.maxAge ||
      filters.minPrice !== defaultFilters.minPrice ||
      filters.maxPrice !== defaultFilters.maxPrice ||
      (!!filters.gender && filters.gender !== ALL_VALUE) ||
      (!!filters.ethnicity && filters.ethnicity !== ALL_VALUE)
    );
  }, [filters, cityFilter]);

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
    setPage(1);
  }, []);

  const updateFilter = <K extends keyof typeof filters>(key: K, value: typeof filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl font-bold text-foreground">{t("allEscorts.title")}</h2>
          {cityFilter && (
            <span className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              <MapPin className="h-3 w-3" /> {cityFilter}
            </span>
          )}
          {meta && (
            <span className="text-xs text-muted-foreground">
              ({t("allEscorts.results", { count: meta.total })})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={filters.sortBy + "-" + filters.sortOrder}
            onValueChange={(v) => {
              const [sortBy, sortOrder] = v.split("-") as ["viewCount" | "createdAt" | "username", "ASC" | "DESC"];
              updateFilter("sortBy", sortBy);
              updateFilter("sortOrder", sortOrder);
            }}
          >
            <SelectTrigger className="w-[180px] h-9 text-xs border-border/50">
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(true)}
            className="border-border/50 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {t("allEscorts.filters")}
          </Button>
        </div>
      </div>

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("allEscorts.searchPlaceholder")}
          value={filters.search}
          onChange={(e) => updateFilter("search", e.target.value)}
          className="bg-card border-border/50 pl-10 h-11 text-sm placeholder:text-muted-foreground/60"
        />
        {filters.search && (
          <button
            onClick={() => updateFilter("search", "")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <Dialog open={showFilters} onOpenChange={setShowFilters}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{t("allEscorts.filterTitle")}</span>
              {isFiltered && (
                <Button variant="ghost" size="sm" onClick={resetFilters} className="text-xs text-muted-foreground hover:text-primary gap-1 -mr-2">
                  <RotateCcw className="h-3 w-3" /> {t("allEscorts.reset")}
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
            {!cityFilter && filterOptions?.cities?.length ? (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">{t("allEscorts.city")}</Label>
                <Select value={filters.city || ALL_VALUE} onValueChange={(v) => updateFilter("city", v === ALL_VALUE ? "" : v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder={t("allEscorts.allCities")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_VALUE}>{t("allEscorts.allCities")}</SelectItem>
                    {filterOptions.cities.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            {filterOptions?.genders?.length ? (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">{t("allEscorts.gender")}</Label>
                <Select value={filters.gender || ALL_VALUE} onValueChange={(v) => updateFilter("gender", v === ALL_VALUE ? "" : v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder={t("allEscorts.all")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_VALUE}>{t("allEscorts.all")}</SelectItem>
                    {filterOptions.genders.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            {filterOptions?.ethnicities?.length ? (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">{t("allEscorts.ethnicity")}</Label>
                <Select value={filters.ethnicity || ALL_VALUE} onValueChange={(v) => updateFilter("ethnicity", v === ALL_VALUE ? "" : v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder={t("allEscorts.all")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_VALUE}>{t("allEscorts.all")}</SelectItem>
                    {filterOptions.ethnicities.map((e) => (
                      <SelectItem key={e} value={e}>{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="space-y-2.5">
              <Label className="text-xs text-muted-foreground">{t("allEscorts.age")}</Label>
              <Slider
                min={18}
                max={60}
                step={1}
                value={[filters.minAge, filters.maxAge]}
                onValueChange={([min, max]) => { updateFilter("minAge", min); updateFilter("maxAge", max); }}
              />
              <div className="text-[10px] text-muted-foreground">{filters.minAge}–{filters.maxAge} yrs</div>
            </div>
            <div className="space-y-2.5">
              <Label className="text-xs text-muted-foreground">{t("allEscorts.height")}</Label>
              <Slider
                min={140}
                max={200}
                step={1}
                value={[filters.minHeight, filters.maxHeight]}
                onValueChange={([min, max]) => { updateFilter("minHeight", min); updateFilter("maxHeight", max); }}
              />
              <div className="text-[10px] text-muted-foreground">{filters.minHeight}–{filters.maxHeight} cm</div>
            </div>
            <div className="space-y-2.5">
              <Label className="text-xs text-muted-foreground">{t("allEscorts.weight")}</Label>
              <Slider
                min={40}
                max={120}
                step={1}
                value={[filters.minWeight, filters.maxWeight]}
                onValueChange={([min, max]) => { updateFilter("minWeight", min); updateFilter("maxWeight", max); }}
              />
              <div className="text-[10px] text-muted-foreground">{filters.minWeight}–{filters.maxWeight} kg</div>
            </div>
            <div className="space-y-2.5 sm:col-span-2">
              <Label className="text-xs text-muted-foreground">{t("allEscorts.price")}</Label>
              <Slider
                min={0}
                max={5000}
                step={50}
                value={[filters.minPrice, filters.maxPrice]}
                onValueChange={([min, max]) => { updateFilter("minPrice", min); updateFilter("maxPrice", max); }}
              />
              <div className="text-[10px] text-muted-foreground">{filters.minPrice}–{filters.maxPrice} GEL</div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {(isLoading || isFetching) && escorts.length === 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full rounded-lg" />
          ))}
        </div>
      ) : escorts.length > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {escorts.map((escort, i) => (
              <div key={escort.id} className="opacity-0 animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                <EscortCard escort={escort} compact />
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isFetching}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" /> {t("allEscorts.prev")}
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                {t("allEscorts.pageOf", { page, total: totalPages })}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isFetching}
                className="gap-1"
              >
                {t("allEscorts.next")} <ChevronRight className="h-4 w-4" />
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
