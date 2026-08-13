import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin, Phone, Mail, Send } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useSEO } from "@/hooks/useSEO";
import contactUs from "/images/contact-us.png";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  message: z.string().trim().min(1, "Message is required").max(2000),
});

type ContactForm = z.infer<typeof contactSchema>;

const ContactUs = () => {
  const { language } = useLanguage();
  const { settings } = useSiteSettings();
  const bn = language === "bn";
  const [submitting, setSubmitting] = useState(false);

  useSEO({
    title: bn ? "যোগাযোগ" : "Contact Us",
    description: bn
      ? "Shondhaan-এর সাথে যোগাযোগ করুন — ফোন, ইমেইল বা মেসেজে আপনার প্রশ্ন ও মতামত জানান।"
      : "Get in touch with Shondhaan — reach us via phone, email or message for any query or feedback.",
    canonical: "/contact",
    locale: bn ? "bn_BD" : "en_US",
  });

  const form = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", phone: "", message: "" },
  });

  const onSubmit = async (data: ContactForm) => {
    setSubmitting(true);
    const { error } = await supabase.from("contact_messages" as any).insert({
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      message: data.message,
    } as any);
    setSubmitting(false);

    if (error) {
      toast.error(bn ? "মেসেজ পাঠাতে সমস্যা হয়েছে" : "Failed to send message");
      return;
    }
    toast.success(bn ? "আপনার মেসেজ পাঠানো হয়েছে!" : "Your message has been sent!");
    form.reset();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[30px]" />

{/* ══════════════════════ Hero band — text left, image right ══════════════════════ */}
      <div className="">
        <div className="app-container py-8 md:py-12">
          <div
            className="relative grid gap-6 md:grid-cols-2 rounded-lg overflow-hidden items-center"
            style={{
              backgroundImage: `url(${contactUs})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {/* Dark + Blur Overlay */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[3px]" />

            {/* Content */}
            <div className="relative z-10 text-center md:text-left pl-6 pr-6">
              <h1 className="font-heading text-2xl md:text-4xl font-bold text-white">
                {bn ? "যোগাযোগ করুন" : "Contact Us"}
              </h1>

              <p className="mt-2 text-sm md:text-base text-white max-w-md mx-auto md:mx-0">
                {bn
                  ? "আমাদের সাথে যোগাযোগ করুন, আমরা সাহায্য করতে প্রস্তুত"
                  : "Get in touch with us, we're ready to help"}
              </p>
            </div>

            <div className="overflow-hidden">
              <img
                src={contactUs}
                alt={bn ? "যোগাযোগ করুন" : "Contact us"}
                className="w-full h-48 md:h-auto object-cover"
              />
            </div>

            {/* Optional image visibility layer */}
            <div className="relative z-10 hidden md:block" />
          </div>
        </div>
      </div>

      <div className="app-container py-8 md:py-14">
        <div className="grid gap-6 md:grid-cols-5">

          {/* ── Contact info ─────────────────────────────────── */}
          <div className="md:col-span-2 space-y-4">
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Phone className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{bn ? "ফোন" : "Phone"}</p>
                  <a
                    href={`tel:${settings.footer_phone.replace(/[^\d+]/g, "")}`}
                    className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                  >
                    {settings.footer_phone}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Mail className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{bn ? "ইমেইল" : "Email"}</p>
                  <a
                    href={`mailto:${settings.footer_email}`}
                    className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                  >
                    {settings.footer_email}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{bn ? "ঠিকানা" : "Address"}</p>
                  <p className="text-sm font-medium text-foreground">
                    {bn ? "ঢাকা, বাংলাদেশ" : "Dhaka, Bangladesh"}
                  </p>
                </div>
              </div>
            </div>

            {/* Supporting image — swap the src for a real office/support photo */}
            <div className="rounded-xl overflow-hidden border border-border">
              <img
                src="https://images.unsplash.com/photo-1573497491208-6b1acb260507?auto=format&fit=crop&w=800&q=80"
                alt={bn ? "আমাদের সাপোর্ট টিম" : "Our support team"}
                className="w-full h-40 md:h-48 object-cover"
              />
            </div>
          </div>

          {/* ── Form ─────────────────────────────────────────── */}
          <div className="md:col-span-3">
            <div className="rounded-xl border border-border bg-card p-5">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{bn ? "নাম" : "Name"} *</FormLabel>
                        <FormControl>
                          <Input placeholder={bn ? "আপনার নাম" : "Your name"} {...field} />
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
                        <FormLabel>{bn ? "ইমেইল" : "Email"} *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder={bn ? "আপনার ইমেইল" : "Your email"} {...field} />
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
                        <FormLabel>{bn ? "ফোন (ঐচ্ছিক)" : "Phone (optional)"}</FormLabel>
                        <FormControl>
                          <Input placeholder={bn ? "আপনার ফোন নম্বর" : "Your phone number"} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{bn ? "মেসেজ" : "Message"} *</FormLabel>
                        <FormControl>
                          <Textarea rows={4} placeholder={bn ? "আপনার মেসেজ লিখুন..." : "Write your message..."} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={submitting} className="w-full gap-2">
                    <Send className="h-4 w-4" />
                    {submitting ? (bn ? "পাঠানো হচ্ছে..." : "Sending...") : (bn ? "মেসেজ পাঠান" : "Send Message")}
                  </Button>
                </form>
              </Form>
            </div>
          </div>
        </div>

        {/* ── Google Map ───────────────────────────────────────── */}
        <div className="mt-6 rounded-xl overflow-hidden border border-border">
          <iframe
            title={bn ? "আমাদের অবস্থান" : "Our location"}
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d117014.7!2d90.3563!3d23.8103!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3755b8aa427f8a91%3A0x8600cf4a5f3e4b0!2sDhaka!5e0!3m2!1sen!2sbd!4v0000000000000"
            width="100%"
            height="360"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="w-full h-64 md:h-[360px]"
          />
        </div>
      </div>

      <Footer />
      <div className="h-16 md:hidden" />
    </div>
  );
};

export default ContactUs;
