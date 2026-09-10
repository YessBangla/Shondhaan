import { useState, useRef } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Send, X, Camera, UserRound, Briefcase, IdCard, Sparkles, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useSEO } from "@/hooks/useSEO";
import { getMySqlAuth } from "@/lib/mysqlAuth";
import { useCmsCategories } from "@/hooks/useCmsData";
import { INDIVIDUAL_API_BASE_URL } from "@/lib/api";

const API_BASE_URL = INDIVIDUAL_API_BASE_URL.replace(/\/+$/, "");

const joinSchema = z.object({
  full_name: z.string().trim().min(1, "Name is required").max(100),
  phone: z.string().trim().min(1, "Phone is required").max(20),
  email: z.string().trim().email("Invalid email").max(255).optional().or(z.literal("")),
  address: z.string().trim().min(1, "Address is required").max(500),
  service_category: z.string().min(1, "Category is required"),
  experience_years: z.coerce.number().min(0).max(50).optional(),
});

type JoinForm = z.infer<typeof joinSchema>;

const SectionHeading = ({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) => (
  <div className="flex items-center gap-2 mb-4">
    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
      <Icon className="h-3.5 w-3.5" />
    </div>
    <h2 className="text-sm font-semibold text-foreground tracking-wide">{children}</h2>
  </div>
);

const NidUpload = ({
  label,
  file,
  onFileChange,
  preview,
}: {
  label: string;
  file: File | null;
  onFileChange: (f: File | null) => void;
  preview: string | null;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`relative flex h-32 w-full items-center justify-center rounded-xl border-2 border-dashed overflow-hidden transition-all duration-300 ${
          preview
            ? "border-primary/40 "
            : "border-border bg-muted/30 hover:border-primary/40 "
        }`}
      >
        {preview ? (
          <>
            <img src={preview} alt={label} className="h-full w-full object-contain" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onFileChange(null);
              }}
              className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full text-destructive-foreground shadow-sm transition-transform hover:scale-110"
            >
              <X className="h-3 w-3" />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-background border border-border">
              <Camera className="h-4 w-4" />
            </div>
            <span className="text-xs">ছবি আপলোড করুন</span>
          </div>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          if (f && f.size > 5 * 1024 * 1024) {
            toast.error("ফাইল সাইজ ৫MB এর বেশি হতে পারবে না");
            return;
          }
          onFileChange(f);
        }}
      />
    </div>
  );
};

const JoinUs = () => {
  const { language } = useLanguage();
  const bn = language === "bn";
  const { data: serviceCategories = [], isLoading: categoriesLoading, isError: categoriesError } = useCmsCategories();
  const [submitting, setSubmitting] = useState(false);
  const [nidFront, setNidFront] = useState<File | null>(null);
  const [nidBack, setNidBack] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);

  useSEO({
    title: bn ? "আমাদের সাথে যোগ দিন" : "Join Us — Become a Provider",
    description: bn
      ? "Shondhaan টিমে যোগ দিন — সার্ভিস প্রোভাইডার হিসেবে আবেদন করুন এবং আপনার আয় বাড়ান।"
      : "Join the Shondhaan team — apply as a service provider and grow your income.",
    canonical: "/join",
    locale: bn ? "bn_BD" : "en_US",
  });

  const form = useForm<JoinForm>({
    resolver: zodResolver(joinSchema),
    defaultValues: {
      full_name: "",
      phone: "",
      email: "",
      address: "",
      service_category: "",
      experience_years: 0,
    },
  });

  const handleFileChange = (side: "front" | "back") => (file: File | null) => {
    if (side === "front") {
      setNidFront(file);
      setFrontPreview(file ? URL.createObjectURL(file) : null);
    } else {
      setNidBack(file);
      setBackPreview(file ? URL.createObjectURL(file) : null);
    }
  };

  const onSubmit = async (data: JoinForm) => {
    if (!nidFront || !nidBack) {
      toast.error(bn ? "এনআইডির দুই পাশের ছবি আপলোড করুন" : "Please upload both sides of NID");
      return;
    }

    setSubmitting(true);
    try {
      const auth = getMySqlAuth();
      if (!auth?.token) {
        throw new Error(bn ? "আবেদন করতে আগে লগইন করুন" : "Please log in before submitting an application");
      }

      const formData = new FormData();
      formData.append("full_name", data.full_name);
      formData.append("phone", data.phone);
      formData.append("email", data.email || "");
      formData.append("address", data.address);
      formData.append("service_category", data.service_category);
      formData.append("experience_years", String(data.experience_years ?? 0));
      formData.append("nid_front", nidFront);
      formData.append("nid_back", nidBack);

      const response = await fetch(`${API_BASE_URL}/api/providers/applications`, {
        method: "POST",
        headers: { Authorization: `Bearer ${auth.token}` },
        body: formData,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "Failed to submit application");

      toast.success(bn ? "আপনার আবেদন সফলভাবে জমা হয়েছে!" : "Your application has been submitted!");
      form.reset();
      setNidFront(null);
      setNidBack(null);
      setFrontPreview(null);
      setBackPreview(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "";
      toast.error(message || (bn ? "আবেদন জমা দিতে সমস্যা হয়েছে" : "Failed to submit application"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[60px] md:pt-[50px]" />

      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-primary/[0.06] to-transparent">
        <div className="absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="app-container relative pt-2 pb-2 text-center"
        >
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-4">
            <Sparkles className="h-3 w-3" />
            {bn ? "প্রোভাইডার নিয়োগ চলছে" : "We're hiring providers"}
          </div>
          <h1 className="font-heading text-2xl md:text-4xl font-bold text-foreground">
            {bn ? "আমাদের সাথে যোগ দিন" : "Join Our Team"}
          </h1>
          <p className="mt-3 text-sm md:text-base text-muted-foreground max-w-md mx-auto">
            {bn
              ? "দক্ষ সার্ভিস প্রোভাইডার হিসেবে Shondhaan-এ যোগ দিন। নিচের ফর্মটি পূরণ করুন।"
              : "Join Shondhaan as a skilled service provider. Fill out the form below."}
          </p>
        </motion.div>
      </div>

      <div className="app-container py-8 md:py-2 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-2xl border border-border/60 bg-card shadow-sm p-5 md:p-8"
        >
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
                {/* Left column: personal + work info */}
                <div className="space-y-8">
                  <div>
                    <SectionHeading icon={UserRound}>
                      {bn ? "ব্যক্তিগত তথ্য" : "Personal Information"}
                    </SectionHeading>

                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="full_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{bn ? "পুরো নাম" : "Full Name"} *</FormLabel>
                            <FormControl>
                              <Input placeholder={bn ? "আপনার পুরো নাম" : "Your full name"} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{bn ? "ফোন নম্বর" : "Phone"} *</FormLabel>
                            <FormControl>
                              <Input placeholder="01XXXXXXXXX" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{bn ? "ইমেইল (অপশনাল)" : "Email (optional)"}</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder={bn ? "আপনার ইমেইল" : "Your email"} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{bn ? "ঠিকানা" : "Address"} *</FormLabel>
                            <FormControl>
                              <Textarea rows={2} placeholder={bn ? "আপনার বর্তমান ঠিকানা" : "Your current address"} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="pt-6 border-t border-border/60">
                    <SectionHeading icon={Briefcase}>
                      {bn ? "কাজের তথ্য" : "Work Information"}
                    </SectionHeading>

                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="service_category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{bn ? "সার্ভিসর ক্যাটেগরি" : "Service Category"} *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={bn ? "ক্যাটেগরি নির্বাচন করুন" : "Select category"} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {serviceCategories.filter((category) => category.is_active).map((category) => (
                                  <SelectItem key={category.id} value={category.id}>
                                    {bn ? category.name : category.name_en || category.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {categoriesError && <p className="text-sm font-medium text-destructive">{bn ? "ক্যাটেগরি লোড করা যায়নি" : "Could not load service categories"}</p>}
                            {categoriesLoading && <p className="text-sm text-muted-foreground">{bn ? "ক্যাটেগরি লোড হচ্ছে..." : "Loading categories..."}</p>}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="experience_years"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{bn ? "অভিজ্ঞতা (বছর)" : "Experience (years)"}</FormLabel>
                            <FormControl>
                              <Input type="number" min={0} max={50} placeholder="0" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Right column: NID upload + submit, sticky on desktop */}
                <div className="md:sticky md:top-24 md:self-start">
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-4 md:p-5">
                    <SectionHeading icon={IdCard}>
                      {bn ? "জাতীয় পরিচয়পত্র (NID)" : "National ID (NID)"} *
                    </SectionHeading>
                    <div className="grid grid-cols-2 gap-3">
                      <NidUpload
                        label={bn ? "সামনের পাশ" : "Front Side"}
                        file={nidFront}
                        onFileChange={handleFileChange("front")}
                        preview={frontPreview}
                      />
                      <NidUpload
                        label={bn ? "পেছনের পাশ" : "Back Side"}
                        file={nidBack}
                        onFileChange={handleFileChange("back")}
                        preview={backPreview}
                      />
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground text-center">
                      {bn ? "সর্বোচ্চ ৫MB, JPG/PNG ফরম্যাট" : "Max 5MB, JPG/PNG format"}
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full gap-2 h-12 text-base font-semibold shadow-md shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99] mt-6 bg-primary text-white "
                  >
                    <Send className="h-4 w-4" />
                    {submitting
                      ? (bn ? "জমা দেওয়া হচ্ছে..." : "Submitting...")
                      : (bn ? "আবেদন জমা দিন" : "Submit Application")}
                  </Button>

                  <p className="mt-3 text-[11px] text-muted-foreground text-center leading-relaxed">
                    {bn
                      ? "জমা দেওয়ার মাধ্যমে আপনি আমাদের শর্তাবলীতে সম্মত হচ্ছেন।"
                      : "By submitting, you agree to our terms and application review process."}
                  </p>
                </div>
              </div>
            </form>
          </Form>
        </motion.div>
      </div>

      <Footer />
      <div className="h-16 md:hidden" />
    </div>
  );
};

export default JoinUs;