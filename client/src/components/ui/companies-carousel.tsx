import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

export interface CompanyCard {
  id: string;
  name: string;
  logoUrl: string | null;
  slug: string;
}

interface CompaniesCarouselProps {
  companies: CompanyCard[];
  title?: string;
  className?: string;
}

export const CompaniesCarousel = React.forwardRef<
  HTMLDivElement,
  CompaniesCarouselProps
>(({ companies, title = "Empresas que confiam na Omni.AI", className, ...props }, ref) => {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(true);

  const checkScrollability = React.useCallback(() => {
    const container = scrollContainerRef.current;
    if (container) {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  }, []);

  React.useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      checkScrollability();
      container.addEventListener("scroll", checkScrollability);
    }
    return () => {
      if (container) {
        container.removeEventListener("scroll", checkScrollability);
      }
    };
  }, [companies, checkScrollability]);

  const scroll = (direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (container) {
      const scrollAmount = container.clientWidth * 0.8;
      container.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (!companies || companies.length === 0) {
    return null;
  }

  return (
    <section
      ref={ref}
      className={cn("w-full max-w-7xl mx-auto py-8", className)}
      aria-labelledby="companies-heading"
      {...props}
    >
      <div className="flex items-center justify-between px-4 sm:px-6 mb-6">
        <h2 id="companies-heading" className="text-lg sm:text-xl font-semibold tracking-tight text-slate-700">
          {title}
        </h2>
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            aria-label="Rolar para esquerda"
            data-testid="button-scroll-left"
            className={cn(
              "p-2 rounded-full border border-slate-300 bg-white text-slate-700 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed hover-elevate active-elevate-2"
            )}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            aria-label="Rolar para direita"
            data-testid="button-scroll-right"
            className={cn(
              "p-2 rounded-full border border-slate-300 bg-white text-slate-700 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed hover-elevate active-elevate-2"
            )}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="flex overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-hide space-x-4 md:space-x-6 px-4 sm:px-6"
      >
        {companies.map((company) => (
          <Link
            key={company.id}
            href={`/chat/${company.id}`}
            data-testid={`link-company-${company.id}`}
          >
            <div className="flex-shrink-0 w-[180px] sm:w-[200px] snap-start cursor-pointer group">
              <div className="relative overflow-hidden rounded-xl bg-white border border-slate-200 p-6 transition-all duration-300 ease-in-out hover-elevate active-elevate-2 h-[140px] flex items-center justify-center">
                {company.logoUrl ? (
                  <img
                    src={company.logoUrl}
                    alt={`Logo ${company.name}`}
                    className="max-w-full max-h-full object-contain"
                    data-testid={`img-logo-${company.id}`}
                  />
                ) : (
                  <div className="text-center">
                    <div className="text-2xl font-bold bg-gradient-to-r from-[#2F6BFF] to-[#A3FF90] bg-clip-text text-transparent">
                      {company.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="text-xs text-slate-500 mt-2 font-medium">
                      {company.name}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
});

CompaniesCarousel.displayName = "CompaniesCarousel";
