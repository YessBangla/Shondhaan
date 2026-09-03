import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  JOB_CATEGORIES,
  JOB_TYPES,
  useApprovedJobs,
  useJobCategories,
  useSaveJob,
  useSavedJobs,
} from "@/hooks/useJobData";
import JobCard from "@/components/jobs/JobCard";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";

const JobLatestSection = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user } = useAuth();
  const bn = language === "bn";
  const { data: jobs = [], isLoading } = useApprovedJobs();
  const { data: fetchedCategories = [] } = useJobCategories();
  const { data: savedJobs = [] } = useSavedJobs();
  const saveJob = useSaveJob();

  const categories = fetchedCategories.length > 0 ? fetchedCategories : JOB_CATEGORIES;
  const recentJobs = jobs.filter((job) => !job.is_featured).slice(0, 6);
  const savedJobIds = new Set(savedJobs.map((job: { job_id: string }) => job.job_id));
  const getTypeLabel = (value: string) => JOB_TYPES.find((type) => type.value === value)?.[bn ? "labelBn" : "labelEn"] || value;
  const getCatLabel = (value: string) => categories.find((category) => category.value === value)?.[bn ? "labelBn" : "labelEn"] || value;

  return (
    <section className="mb-1">
        <div className="flex items-center w-full gap-2 mb-2">
            <div className="flex items-center w-full gap-2 mb-2">
                <img src="images/modules_logo/job.png" alt="Shondhaan Mart" className="w-12 h-12 rounded-full mr-2" />
                <div>
                    <h2 className="text-xl md:text-2xl font-semibold">{bn ? "সন্ধান জবস" : "Shondhaan Jobs"}</h2>
                    <span className="text-[12px] font-semibold">{bn ? "নতুন চাকরির বিজ্ঞাপন" : "Latest Jobs"}</span>
                </div>
            </div>
            <Button variant="outline" className="rounded-xl bg-primary px-4 text-white hover:bg-emerald-600" onClick={() => navigate("/jobs")}>
                {bn ? "সকল চাকরি" : "See More"}<ChevronRight className="ml-1 h-4 w-4" />
            </Button>
        </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-44 rounded-xl" />)}
        </div>
      ) : recentJobs.length > 0 ? (
        <Carousel opts={{ align: "start", dragFree: true }} className="px-1" tabIndex={0}>
          <CarouselContent className="-ml-3">
            {recentJobs.map((job) => (
              <CarouselItem key={job.id} className="basis-full pl-3 md:basis-1/2 lg:basis-1/3 h-[160px]">
                <div className="h-full [&>a]:h-full">
                  <JobCard
                    job={job}
                    bn={bn}
                    getTypeLabel={getTypeLabel}
                    getCatLabel={getCatLabel}
                    isSaved={savedJobIds.has(job.id)}
                    onSave={saveJob}
                    user={user}
                    navigate={navigate}
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-0 sm:-left-4" />
          <CarouselNext className="right-0 sm:-right-4" />
        </Carousel>
      ) : null}
    </section>
  );
};

export default JobLatestSection;