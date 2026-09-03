// src/components/mart/TopSellingSection.tsx
import { useLanguage } from "@/contexts/LanguageContext";
import { useMartProducts } from "@/hooks/useMartData";
import MartProductCard from "@/components/mart/MartProductCard";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
const TopSellingSection = () => {
const { language } = useLanguage();
const bn = language === "bn";
  const { data: products = [] } = useMartProducts(undefined, undefined, 40);

  const topSelling = [...products]
    .sort((a: any, b: any) => Number(b.total_sold || 0) - Number(a.total_sold || 0))
    .slice(0, 6);

  if (topSelling.length === 0) return null;

  return (
    <section className="mb-1">
         <div className="flex w-full my-8">
            <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                    <img src="images/modules_logo/mart.png" alt="Shondhaan Mart" className="w-12 h-12 rounded-full mr-2" />
                    <div>
                        <h1 className="text-2xl font-semibold">{bn ? "সন্ধান মার্ট" : "Shondhaan Mart"}</h1>
                        <span className="text-[12px] font-semibold mb-3">{bn ? "সর্বাধিক বিক্রি হওয়া পণ্য" : "Top Selling Products"}</span>
                    </div>
                </div>
            </div>
            <Link to="/mart/category/all">
                <Button variant="outline" className="rounded-xl bg-primary text-white hover:bg-emerald-600 px-8">
                {bn ? "সকল পন্য" : "See More"}
                </Button>
            </Link>
        </div>
      <Carousel opts={{ align: "start", dragFree: true }} className="px-1" tabIndex={0}>
        <CarouselContent className="-ml-3">
          {topSelling.map((p: any) => (
            <CarouselItem key={p.id} className="pl-3 basis-[calc(50%-0.375rem)] sm:basis-[calc(33.333%-0.5rem)] md:basis-[calc(25%-0.5625rem)] lg:basis-[calc(16.667%-0.625rem)]">
              <MartProductCard product={p} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-0 sm:-left-4" />
        <CarouselNext className="right-0 sm:-right-4" />
      </Carousel>
    </section>
  );
};

export default TopSellingSection;