import servicePlumbing from "@/assets/service-plumbing.jpg";
import serviceCleaning from "@/assets/service-cleaning.jpg";
import serviceAc from "@/assets/service-ac.jpg";
import serviceElectrical from "@/assets/service-electrical.jpg";
import serviceSalon from "@/assets/service-salon.jpg";
import serviceShifting from "@/assets/service-shifting.jpg";
import servicePainting from "@/assets/service-painting.jpg";
import serviceGas from "@/assets/service-gas.jpg";
import serviceSpa from "@/assets/service-spa.jpg";
import serviceDriver from "@/assets/service-driver.jpg";
import servicePestControl from "@/assets/service-pest-control.jpg";
import serviceAppliance from "@/assets/service-appliance.jpg";
import serviceMensSalon from "@/assets/service-mens-salon.jpg";
import serviceNursing from "@/assets/service-nursing.jpg";
import serviceCarWash from "@/assets/service-car-wash.jpg";
import serviceLaptop from "@/assets/service-laptop.jpg";
import serviceCarpentry from "@/assets/service-carpentry.jpg";
import serviceInterior from "@/assets/service-interior.jpg";
import serviceGrocery from "@/assets/service-grocery.jpg";
import serviceFishMeat from "@/assets/service-fish-meat.jpg";
import serviceVegetables from "@/assets/service-vegetables.jpg";
import serviceBuySellElectronics from "@/assets/service-buy-sell-electronics.jpg";
import serviceBuySellFurniture from "@/assets/service-buy-sell-furniture.jpg";
import serviceBuySellVehicles from "@/assets/service-buy-sell-vehicles.jpg";

export interface ServicePackage {
  name: string;
  price: number;
  originalPrice?: number;
  features: string[];
}

export interface ServiceReview {
  name: string;
  rating: number;
  date: string;
  comment: string;
}

export interface ServiceData {
  slug: string;
  title: string;
  titleEn?: string;
  image: string;
  description: string;
  rating: number;
  totalReviews: number;
  totalOrders: number;
  packages: ServicePackage[];
  reviews: ServiceReview[];
  features: string[];
  featuresEn?: string[];
  availableCities: string[];
}

export const allServices: ServiceData[] = [
  {
    slug: "plumbing",
    title: "প্লাম্বিং ও স্যানিটারি",
    titleEn: "Plumbing & Sanitary",
    image: servicePlumbing,
    description: "দক্ষ প্লাম্বারদের মাধ্যমে আপনার বাড়ির পানির লাইন, বাথরুম ফিটিংস, লিক মেরামত ও সকল প্লাম্বিং সমস্যার সমাধান পান।",
    rating: 4.7,
    totalReviews: 2340,
    totalOrders: 8500,
    packages: [
      { name: "বেসিক চেকআপ", price: 299, features: ["১ পয়েন্ট চেকআপ", "ছোট লিক মেরামত", "৩০ মিনিট সার্ভিস"] },
      { name: "স্ট্যান্ডার্ড", price: 599, originalPrice: 799, features: ["৩ পয়েন্ট চেকআপ", "পাইপ ফিটিং", "ট্যাপ রিপ্লেসমেন্ট", "১ ঘণ্টা সার্ভিস"] },
      { name: "প্রিমিয়াম", price: 999, originalPrice: 1299, features: ["ফুল বাথরুম চেকআপ", "সকল ফিটিংস", "পাইপলাইন মেরামত", "৩০ দিনের ওয়ারেন্টি"] },
    ],
    reviews: [
      { name: "রাকিব হাসান", rating: 5, date: "১৫ ফেব্রুয়ারি ২০২৬", comment: "খুবই সন্তুষ্ট! সময়মতো এসেছে এবং কাজের মান চমৎকার।" },
      { name: "ফারিয়া আক্তার", rating: 4, date: "১০ ফেব্রুয়ারি ২০২৬", comment: "ভালো সার্ভিস, তবে একটু দেরি হয়েছিল।" },
      { name: "আমিনুল ইসলাম", rating: 5, date: "৫ ফেব্রুয়ারি ২০২৬", comment: "প্রফেশনাল কাজ। দাম যথাযথ।" },
    ],
    features: ["ভেরিফাইড প্লাম্বার", "৩০ দিনের সার্ভিস ওয়ারেন্টি", "ফিক্সড প্রাইসিং", "অন-টাইম সার্ভিস গ্যারান্টি"],
    availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "রংপুর", "বরিশাল", "ময়মনসিংহ", "কুমিল্লা", "টাঙ্গাইল"],
  },
  {
    slug: "cleaning",
    title: "হোম ক্লিনিং",
    titleEn: "Home Cleaning",
    image: serviceCleaning,
    description: "প্রফেশনাল ক্লিনিং সার্ভিস দিয়ে আপনার ঘরকে ঝকঝকে পরিষ্কার রাখুন। ডিপ ক্লিনিং থেকে রেগুলার ক্লিনিং সব পাবেন।",
    rating: 4.8,
    totalReviews: 3120,
    totalOrders: 12000,
    packages: [
      { name: "১ রুম ক্লিনিং", price: 499, features: ["১টি রুম", "ডাস্টিং ও মোপিং", "১ ঘণ্টা সার্ভিস"] },
      { name: "ফুল হোম", price: 1499, originalPrice: 1999, features: ["সকল রুম", "বাথরুম ক্লিনিং", "কিচেন ক্লিনিং", "৩-৪ ঘণ্টা সার্ভিস"] },
      { name: "ডিপ ক্লিনিং", price: 2999, originalPrice: 3999, features: ["সম্পূর্ণ ডিপ ক্লিনিং", "সোফা ক্লিনিং", "কার্পেট ওয়াশ", "৫-৬ ঘণ্টা সার্ভিস"] },
    ],
    reviews: [
      { name: "নাজমুল হক", rating: 5, date: "১২ মার্চ ২০২৬", comment: "অসাধারণ! ঘর একদম নতুনের মতো হয়ে গেছে।" },
      { name: "সাবরিনা চৌধুরী", rating: 5, date: "৮ মার্চ ২০২৬", comment: "টিম খুব প্রফেশনাল ছিল। সময়মতো কাজ শেষ করেছে।" },
    ],
    features: ["প্রশিক্ষিত ক্লিনার", "ইকো-ফ্রেন্ডলি প্রোডাক্ট", "স্যানিটাইজড ইকুইপমেন্ট", "সন্তুষ্টি গ্যারান্টি"],
    availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "কুমিল্লা"],
  },
  {
    slug: "ac-service",
    title: "এসি সার্ভিসিং",
    titleEn: "AC Servicing",
    image: serviceAc,
    description: "এসি সার্ভিসিং, গ্যাস রিফিল, ইনস্টলেশন ও রিপেয়ার — সব ধরনের এসি সমস্যার সমাধান এক জায়গায়।",
    rating: 4.6,
    totalReviews: 4500,
    totalOrders: 15000,
    packages: [
      { name: "বেসিক সার্ভিসিং", price: 699, features: ["ফিল্টার ক্লিনিং", "গ্যাস চেক", "বেসিক চেকআপ"] },
      { name: "ফুল সার্ভিসিং", price: 1299, originalPrice: 1599, features: ["ডিপ ক্লিনিং", "গ্যাস রিফিল", "কম্প্রেসর চেক", "৬০ দিনের ওয়ারেন্টি"] },
      { name: "ইনস্টলেশন", price: 1999, features: ["নতুন এসি সেটআপ", "পাইপিং", "ইলেকট্রিক্যাল ওয়ার্ক", "ফ্রি ফার্স্ট সার্ভিসিং"] },
    ],
    reviews: [
      { name: "তানভীর আহমেদ", rating: 5, date: "১ মার্চ ২০২৬", comment: "এসি এখন আগের মতো ঠাণ্ডা দিচ্ছে। খুব ভালো সার্ভিস!" },
      { name: "মিতু রহমান", rating: 4, date: "২৫ ফেব্রুয়ারি ২০২৬", comment: "কাজ ভালো হয়েছে, দাম একটু বেশি মনে হলো।" },
    ],
    features: ["সার্টিফাইড টেকনিশিয়ান", "৬০ দিনের ওয়ারেন্টি", "সকল ব্র্যান্ড সাপোর্ট", "ইমার্জেন্সি সার্ভিস"],
    availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "রংপুর", "বরিশাল", "ময়মনসিংহ", "কুমিল্লা", "বগুড়া", "যশোর"],
  },
  {
    slug: "electrical",
    title: "ইলেকট্রিক্যাল সার্ভিস",
    titleEn: "Electrical Service",
    image: serviceElectrical,
    description: "ইলেকট্রিক্যাল ওয়্যারিং, সুইচ-সকেট ফিটিং, ফ্যান-লাইট ইনস্টলেশন সহ সকল ইলেকট্রিক্যাল কাজ।",
    rating: 4.5,
    totalReviews: 1890,
    totalOrders: 6200,
    packages: [
      { name: "ছোট মেরামত", price: 249, features: ["সুইচ/সকেট ফিক্স", "বাল্ব চেঞ্জ", "৩০ মিনিট সার্ভিস"] },
      { name: "স্ট্যান্ডার্ড", price: 699, originalPrice: 899, features: ["ফ্যান ইনস্টলেশন", "ওয়্যারিং ফিক্স", "MCB/ফিউজ চেক", "১ ঘণ্টা সার্ভিস"] },
      { name: "ফুল ওয়্যারিং", price: 2499, originalPrice: 2999, features: ["কমপ্লিট রিওয়্যারিং", "DB বোর্ড সেটআপ", "আর্থিং", "১ বছরের ওয়ারেন্টি"] },
    ],
    reviews: [
      { name: "শাহরিয়ার কবির", rating: 5, date: "২০ ফেব্রুয়ারি ২০২৬", comment: "ইলেকট্রিশিয়ান খুব দক্ষ ছিলেন। দ্রুত কাজ করেছেন।" },
    ],
    features: ["লাইসেন্সড ইলেকট্রিশিয়ান", "সেফটি স্ট্যান্ডার্ড", "ওয়ারেন্টি সার্ভিস", "জরুরি সার্ভিস"],
    availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "রংপুর", "কুমিল্লা", "টাঙ্গাইল"],
  },
  {
    slug: "salon",
    title: "সেলুন কেয়ার",
    titleEn: "Salon Care",
    image: serviceSalon,
    description: "ঘরে বসে পেশাদার সেলুন সার্ভিস। হেয়ারকাট, ফেসিয়াল, মেকআপ, ব্রাইডাল প্যাকেজ সব পাবেন।",
    rating: 4.9,
    totalReviews: 5600,
    totalOrders: 20000,
    packages: [
      { name: "বেসিক গ্রুমিং", price: 399, features: ["হেয়ারকাট", "শেভ/ট্রিম", "ফেস ওয়াশ"] },
      { name: "ফেসিয়াল প্যাকেজ", price: 999, originalPrice: 1299, features: ["ফেসিয়াল", "ক্লিনআপ", "হেয়ার স্পা", "১.৫ ঘণ্টা সেশন"] },
      { name: "ব্রাইডাল", price: 4999, originalPrice: 6999, features: ["ফুল মেকআপ", "হেয়ার স্টাইলিং", "স্কিন প্রেপ", "ট্রায়াল সেশন ইনক্লুডেড"] },
    ],
    reviews: [
      { name: "তাসনিয়া জামান", rating: 5, date: "১০ মার্চ ২০২৬", comment: "বাসায় বসে সেলুন সার্ভিস নেওয়া সত্যিই কমফোর্টেবল!" },
      { name: "রুমানা আক্তার", rating: 5, date: "৫ মার্চ ২০২৬", comment: "ফেসিয়ালটা চমৎকার হয়েছে। আবার নেব।" },
    ],
    features: ["ফিমেল প্রফেশনাল", "হাইজিন মেইনটেইনড", "প্রিমিয়াম প্রোডাক্ট", "ফ্লেক্সিবল টাইম"],
    availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম"],
  },
  {
    slug: "shifting",
    title: "হাউজ শিফটিং",
    titleEn: "House Shifting",
    image: serviceShifting,
    description: "ঝামেলামুক্ত হাউজ শিফটিং সার্ভিস। প্যাকিং, লোডিং, ট্রান্সপোর্ট, আনলোডিং — সব একসাথে।",
    rating: 4.4,
    totalReviews: 980,
    totalOrders: 3500,
    packages: [
      { name: "ছোট শিফটিং", price: 2999, features: ["১ বেডরুম", "প্যাকিং ম্যাটেরিয়াল", "৫ কি.মি. পর্যন্ত"] },
      { name: "মিডিয়াম", price: 5999, originalPrice: 7499, features: ["২ বেডরুম", "প্যাকিং + আনপ্যাকিং", "১০ কি.মি. পর্যন্ত", "ইন্স্যুরেন্স কভার"] },
      { name: "লার্জ শিফটিং", price: 9999, originalPrice: 12999, features: ["৩+ বেডরুম", "ফুল প্যাকিং সার্ভিস", "ঢাকার মধ্যে যেকোনো জায়গা", "ফার্নিচার ডিসঅ্যাসেম্বলি"] },
    ],
    reviews: [
      { name: "জাহিদুল ইসলাম", rating: 4, date: "১ মার্চ ২০২৬", comment: "শিফটিং স্মুথ হয়েছে। কিছু জিনিস আরও সাবধানে হ্যান্ডেল করলে ভালো হতো।" },
    ],
    features: ["ট্রেইনড কর্মী", "ইন্স্যুরেন্স কভারেজ", "GPS ট্র্যাকিং", "ফিক্সড প্রাইস"],
    availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট"],
  },
  {
    slug: "painting",
    title: "পেইন্টিং সার্ভিস",
    titleEn: "Painting Service",
    image: servicePainting,
    description: "প্রফেশনাল পেইন্টিং সার্ভিস — ইন্টেরিয়র, এক্সটেরিয়র, ওয়াটারপ্রুফিং সব ধরনের পেইন্টিং কাজ।",
    rating: 4.6,
    totalReviews: 1200,
    totalOrders: 4000,
    packages: [
      { name: "১ রুম", price: 2499, features: ["১ রুম পেইন্টিং", "বেসিক পেইন্ট", "দেয়াল প্রস্তুতি"] },
      { name: "ফুল হোম", price: 8999, originalPrice: 11999, features: ["সকল রুম", "প্রিমিয়াম পেইন্ট", "সিলিং ইনক্লুডেড", "ফার্নিচার কভারিং"] },
      { name: "ওয়াটারপ্রুফিং", price: 4999, features: ["ওয়াটারপ্রুফ কোটিং", "ড্যাম্প ট্রিটমেন্ট", "৫ বছরের ওয়ারেন্টি"] },
    ],
    reviews: [
      { name: "আরিফুল হক", rating: 5, date: "২৮ ফেব্রুয়ারি ২০২৬", comment: "পেইন্টিং ফিনিশ অসাধারণ! রং নির্বাচনেও সাহায্য করেছে।" },
    ],
    features: ["ব্র্যান্ডেড পেইন্ট", "কালার কন্সালটেশন", "ক্লিনআপ ইনক্লুডেড", "ওয়ারেন্টি"],
    availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা"],
  },
  {
    slug: "gas-stove",
    title: "গ্যাস স্টোভ সার্ভিস",
    titleEn: "Gas Stove Service",
    image: serviceGas,
    description: "গ্যাস স্টোভ রিপেয়ার, সার্ভিসিং ও ইনস্টলেশন। সকল ব্র্যান্ডের গ্যাস স্টোভের সার্ভিস পাবেন।",
    rating: 4.5,
    totalReviews: 870,
    totalOrders: 3000,
    packages: [
      { name: "বেসিক সার্ভিসিং", price: 349, features: ["বার্নার ক্লিনিং", "গ্যাস চেক", "নব চেক"] },
      { name: "ফুল সার্ভিসিং", price: 699, originalPrice: 899, features: ["সম্পূর্ণ ক্লিনিং", "পার্টস রিপ্লেসমেন্ট", "গ্যাস লিক চেক", "৩০ দিনের ওয়ারেন্টি"] },
    ],
    reviews: [
      { name: "শামীমা বেগম", rating: 5, date: "১৫ ফেব্রুয়ারি ২০২৬", comment: "স্টোভ এখন নতুনের মতো কাজ করছে!" },
    ],
    features: ["দক্ষ টেকনিশিয়ান", "অরিজিনাল পার্টস", "সেফটি চেক", "ওয়ারেন্টি সার্ভিস"],
    availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "রংপুর", "বরিশাল", "ময়মনসিংহ", "কুমিল্লা", "কক্সবাজার", "বগুড়া"],
  },
  {
    slug: "spa",
    title: "স্পা ও ওয়েলনেস",
    titleEn: "Spa & Wellness",
    image: serviceSpa,
    description: "ঘরে বসে রিল্যাক্সিং স্পা সার্ভিস। বডি ম্যাসাজ, আরোমাথেরাপি, স্ট্রেস রিলিফ — সব পেশাদার থেরাপিস্টের মাধ্যমে।",
    rating: 4.8,
    totalReviews: 2100,
    totalOrders: 7500,
    packages: [
      { name: "বেসিক ম্যাসাজ", price: 799, features: ["৪৫ মিনিট সেশন", "বডি ম্যাসাজ", "অয়েল থেরাপি"] },
      { name: "রিল্যাক্সেশন", price: 1499, originalPrice: 1899, features: ["৯০ মিনিট সেশন", "ফুল বডি ম্যাসাজ", "আরোমাথেরাপি", "হট স্টোন"] },
      { name: "প্রিমিয়াম স্পা", price: 2499, originalPrice: 3299, features: ["২ ঘণ্টা সেশন", "ফুল বডি ট্রিটমেন্ট", "ফেসিয়াল", "হেড ম্যাসাজ"] },
    ],
    reviews: [
      { name: "নুসরাত জাহান", rating: 5, date: "৮ মার্চ ২০২৬", comment: "অসাধারণ অভিজ্ঞতা! থেরাপিস্ট অনেক প্রফেশনাল ছিলেন।" },
    ],
    features: ["সার্টিফাইড থেরাপিস্ট", "প্রিমিয়াম অয়েল", "হাইজিনিক সেটআপ", "ফ্লেক্সিবল শিডিউল"],
    availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম"],
  },
  {
    slug: "driver",
    title: "অন ডিমান্ড ড্রাইভার",
    titleEn: "On Demand Driver",
    image: serviceDriver,
    description: "যেকোনো সময় প্রফেশনাল ড্রাইভার সার্ভিস। পার্সোনাল ট্রিপ, অফিস কমিউট, লং ড্রাইভ — সব জায়গায়।",
    rating: 4.3,
    totalReviews: 1560,
    totalOrders: 5000,
    packages: [
      { name: "আওয়ারলি", price: 199, features: ["প্রতি ঘণ্টা", "শহরের মধ্যে", "ফুয়েল আলাদা"] },
      { name: "হাফ ডে", price: 999, originalPrice: 1199, features: ["৬ ঘণ্টা সার্ভিস", "শহরের মধ্যে", "অভিজ্ঞ ড্রাইভার"] },
      { name: "ফুল ডে", price: 1799, originalPrice: 2199, features: ["১২ ঘণ্টা সার্ভিস", "শহর + শহরের বাইরে", "AC গাড়ি সাপোর্ট"] },
    ],
    reviews: [
      { name: "মাসুদ রানা", rating: 4, date: "৩ মার্চ ২০২৬", comment: "ড্রাইভার সময়মতো এসেছে। ড্রাইভিং স্কিল ভালো।" },
    ],
    features: ["ভেরিফাইড ড্রাইভার", "GPS ট্র্যাকিং", "ইন্স্যুরেন্স কভার", "২৪/৭ অ্যাভেইলেবল"],
    availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "রংপুর"],
  },
  // --- New Services ---
  {
    slug: "pest-control",
    title: "পেস্ট কন্ট্রোল",
    titleEn: "Pest Control",
    image: servicePestControl,
    description: "তেলাপোকা, ইঁদুর, উইপোকা, মশা — সকল ধরনের পোকামাকড় দূর করুন প্রফেশনাল পেস্ট কন্ট্রোল সার্ভিসে।",
    rating: 4.6,
    totalReviews: 1450,
    totalOrders: 5200,
    packages: [
      { name: "রেগুলার স্প্রে", price: 999, features: ["১ বেডরুম ফ্ল্যাট", "তেলাপোকা ও পিঁপড়া", "১ মাসের প্রটেকশন"] },
      { name: "প্রিমিয়াম", price: 1999, originalPrice: 2499, features: ["২-৩ বেডরুম", "সকল পোকামাকড়", "৩ মাসের প্রটেকশন", "২ বার সার্ভিস"] },
      { name: "কমার্শিয়াল", price: 3999, originalPrice: 4999, features: ["অফিস/দোকান", "ফুল ফ্লোর ট্রিটমেন্ট", "৬ মাসের কন্ট্রাক্ট", "মাসিক ফলোআপ"] },
    ],
    reviews: [
      { name: "কামরুল হাসান", rating: 5, date: "৫ মার্চ ২০২৬", comment: "তেলাপোকার সমস্যা সম্পূর্ণ দূর হয়েছে!" },
      { name: "সেলিনা আক্তার", rating: 4, date: "১ মার্চ ২০২৬", comment: "ভালো সার্ভিস, গন্ধটা একটু বেশি ছিল।" },
    ],
    features: ["ইকো-ফ্রেন্ডলি কেমিক্যাল", "সার্টিফাইড টেকনিশিয়ান", "গ্যারান্টিড রেজাল্ট", "পেট ও শিশু সেফ"],
    availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "রংপুর", "কুমিল্লা"],
  },
  {
    slug: "appliance-repair",
    title: "অ্যাপ্লায়েন্স রিপেয়ার",
    titleEn: "Appliance Repair",
    image: serviceAppliance,
    description: "রেফ্রিজারেটর, ওয়াশিং মেশিন, ওভেন, টিভি সহ সকল হোম অ্যাপ্লায়েন্সের রিপেয়ার ও সার্ভিসিং।",
    rating: 4.5,
    totalReviews: 2800,
    totalOrders: 9500,
    packages: [
      { name: "চেকআপ ও ডায়াগনসিস", price: 299, features: ["সমস্যা চিহ্নিতকরণ", "রিপেয়ার এস্টিমেট", "৩০ মিনিট ভিজিট"] },
      { name: "বেসিক রিপেয়ার", price: 799, originalPrice: 999, features: ["ছোট মেরামত", "পার্টস ফিটিং", "৩০ দিনের ওয়ারেন্টি"] },
      { name: "মেজর রিপেয়ার", price: 1999, originalPrice: 2499, features: ["কম্প্রেসর/মোটর ফিক্স", "পার্টস রিপ্লেসমেন্ট", "৯০ দিনের ওয়ারেন্টি", "ফলোআপ ভিজিট"] },
    ],
    reviews: [
      { name: "আনোয়ারুল হক", rating: 5, date: "৭ মার্চ ২০২৬", comment: "ফ্রিজ ঠিক করেছে দ্রুত। টেকনিশিয়ান অনেক ভদ্র ছিলেন।" },
      { name: "রিনা বেগম", rating: 4, date: "২ মার্চ ২০২৬", comment: "ওয়াশিং মেশিন ঠিক হয়ে গেছে, ভালো সার্ভিস।" },
    ],
    features: ["সকল ব্র্যান্ড সাপোর্ট", "অরিজিনাল পার্টস", "হোম ভিজিট", "ওয়ারেন্টি সার্ভিস"],
    availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "রংপুর", "কুমিল্লা", "বগুড়া"],
  },
  {
    slug: "mens-salon",
    title: "মেনস সেলুন ও গ্রুমিং",
    titleEn: "Men's Salon & Grooming",
    image: serviceMensSalon,
    description: "পুরুষদের জন্য ঘরে বসে সেলুন সার্ভিস। হেয়ারকাট, বিয়ার্ড ট্রিম, ফেসিয়াল, বডি স্ক্রাব সব পাবেন।",
    rating: 4.7,
    totalReviews: 3200,
    totalOrders: 11000,
    packages: [
      { name: "বেসিক কাট ও ট্রিম", price: 299, features: ["হেয়ারকাট", "বিয়ার্ড ট্রিম", "ফেস ওয়াশ"] },
      { name: "গ্রুমিং প্যাকেজ", price: 799, originalPrice: 999, features: ["হেয়ারকাট", "ফেসিয়াল", "হেয়ার স্পা", "বিয়ার্ড শেপিং"] },
      { name: "প্রিমিয়াম", price: 1499, originalPrice: 1999, features: ["ফুল গ্রুমিং", "বডি স্ক্রাব", "হেড ম্যাসাজ", "ম্যানিকিউর ও পেডিকিউর"] },
    ],
    reviews: [
      { name: "ইমরান হোসেন", rating: 5, date: "৯ মার্চ ২০২৬", comment: "হেয়ারকাট অসাধারণ হয়েছে! বার্বার অনেক স্কিলড।" },
      { name: "রাশেদ খান", rating: 5, date: "৫ মার্চ ২০২৬", comment: "বাসায় বসে এই মানের সার্ভিস পাওয়া সত্যিই সুবিধাজনক।" },
    ],
    features: ["প্রফেশনাল বার্বার", "হাইজিনিক টুলস", "প্রিমিয়াম প্রোডাক্ট", "ফ্লেক্সিবল শিডিউল"],
    availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "সিলেট"],
  },
  {
    slug: "nursing",
    title: "নার্সিং ও কেয়ারগিভার",
    titleEn: "Nursing & Caregiver",
    image: serviceNursing,
    description: "বাড়িতে বসে প্রফেশনাল নার্সিং সার্ভিস। রোগী পরিচর্যা, বয়স্ক যত্ন, ফিজিওথেরাপি — সব একখানে।",
    rating: 4.8,
    totalReviews: 1890,
    totalOrders: 6800,
    packages: [
      { name: "ডে কেয়ার", price: 999, features: ["৮ ঘণ্টা সার্ভিস", "রোগী পরিচর্যা", "ওষুধ ব্যবস্থাপনা"] },
      { name: "নাইট কেয়ার", price: 1299, originalPrice: 1499, features: ["১২ ঘণ্টা রাতের সার্ভিস", "রোগী মনিটরিং", "ইমার্জেন্সি সাপোর্ট"] },
      { name: "ফুলটাইম কেয়ারগিভার", price: 18000, originalPrice: 22000, features: ["মাসিক সার্ভিস", "২৪/৭ কেয়ার", "মেডিকেল রিপোর্টিং", "ফিজিওথেরাপি সাপোর্ট"] },
    ],
    reviews: [
      { name: "মনিরুজ্জামান", rating: 5, date: "৬ মার্চ ২০২৬", comment: "আমার বাবার জন্য নার্স নিয়েছিলাম। খুবই যত্নশীল ছিলেন।" },
    ],
    features: ["ট্রেইনড নার্স", "মেডিকেল সার্টিফিকেট", "২৪/৭ সাপোর্ট", "ব্যাকগ্রাউন্ড ভেরিফাইড"],
    availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট"],
  },
  {
    slug: "medicine-delivery",
    title: "ঔষধ ডেলিভারি সার্ভিস",
    titleEn: "Medicine Delivery",
    image: "/images/placeholder.svg",
    description: "ঘরে বসে ঔষধ অর্ডার করুন। প্রেসক্রিপশন আপলোড করুন, অনলাইনে অর্ডার দিন এবং দ্রুত হোম ডেলিভারি পান। সকল ধরনের ঔষধ, মেডিকেল সাপ্লাই ও হেলথ প্রোডাক্ট পাবেন।",
    rating: 4.7,
    totalReviews: 1560,
    totalOrders: 5800,
    packages: [
      { name: "রেগুলার অর্ডার", price: 49, features: ["প্রেসক্রিপশন আপলোড", "৪-৬ ঘণ্টায় ডেলিভারি", "ক্যাশ অন ডেলিভারি", "ফ্রি কন্সালটেশন"] },
      { name: "এক্সপ্রেস ডেলিভারি", price: 99, originalPrice: 149, features: ["১-২ ঘণ্টায় ডেলিভারি", "প্রেসক্রিপশন ভেরিফিকেশন", "লাইভ ট্র্যাকিং", "রিফান্ড গ্যারান্টি"] },
      { name: "মাসিক প্যাকেজ", price: 299, originalPrice: 499, features: ["মাসিক ঔষধ সাবস্ক্রিপশন", "অটো-রিফিল রিমাইন্ডার", "১০% ডিসকাউন্ট", "ফ্রি ডেলিভারি", "ফার্মাসিস্ট কন্সালটেশন"] },
    ],
    reviews: [
      { name: "জাহানারা বেগম", rating: 5, date: "১৫ মার্চ ২০২৬", comment: "প্রেসক্রিপশন আপলোড করেই ঔষধ পেয়ে গেছি। খুবই সুবিধাজনক!" },
      { name: "আব্দুল করিম", rating: 5, date: "১০ মার্চ ২০২৬", comment: "বয়স্ক বাবা-মায়ের জন্য মাসিক প্যাকেজ নিয়েছি। দারুণ সার্ভিস!" },
      { name: "নাসরিন আক্তার", rating: 4, date: "৫ মার্চ ২০২৬", comment: "দ্রুত ডেলিভারি পেয়েছি। দাম বাজারের সমান।" },
    ],
    features: ["লাইসেন্সড ফার্মেসি", "প্রেসক্রিপশন ভেরিফিকেশন", "কোল্ড চেইন ডেলিভারি", "১০০% অরিজিনাল ঔষধ", "২৪/৭ অর্ডার", "ফার্মাসিস্ট কন্সালটেশন"],
    featuresEn: ["Licensed Pharmacy", "Prescription Verification", "Cold Chain Delivery", "100% Original Medicine", "24/7 Ordering", "Pharmacist Consultation"],
    availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "রংপুর", "বরিশাল", "ময়মনসিংহ", "কুমিল্লা", "বগুড়া"],
  },
  {
    slug: "lab-test",
    title: "ল্যাব টেস্ট বুকিং",
    titleEn: "Lab Test Booking",
    image: "/images/placeholder.svg",
    description: "ঘরে বসে ল্যাব টেস্টের স্যাম্পল দিন। প্রশিক্ষিত টেকনিশিয়ান আপনার বাড়িতে এসে রক্ত, ইউরিন ও অন্যান্য স্যাম্পল সংগ্রহ করবেন। রিপোর্ট অনলাইনে পাবেন।",
    rating: 4.8,
    totalReviews: 2100,
    totalOrders: 7200,
    packages: [
      { name: "বেসিক চেকআপ", price: 799, features: ["CBC, ব্লাড সুগার, লিপিড প্রোফাইল", "হোম স্যাম্পল কালেকশন", "অনলাইন রিপোর্ট ২৪ ঘণ্টায়"] },
      { name: "স্ট্যান্ডার্ড প্যাকেজ", price: 1999, originalPrice: 2499, features: ["২০+ টেস্ট প্রোফাইল", "থাইরয়েড, লিভার, কিডনি ফাংশন", "ফ্রি ডক্টর কন্সালটেশন", "ডিজিটাল রিপোর্ট"] },
      { name: "প্রিমিয়াম হেলথ চেকআপ", price: 4999, originalPrice: 6999, features: ["৫০+ টেস্ট", "ভিটামিন ও হরমোন প্যানেল", "ECG ইনক্লুডেড", "ডক্টর ফলোআপ", "বার্ষিক হেলথ রিপোর্ট"] },
    ],
    reviews: [
      { name: "সালমা খাতুন", rating: 5, date: "১৮ মার্চ ২০২৬", comment: "বাসায় বসেই রক্ত দিয়েছি, পরদিনই রিপোর্ট পেয়ে গেছি। চমৎকার!" },
      { name: "মোহাম্মদ রফিক", rating: 5, date: "১২ মার্চ ২০২৬", comment: "বয়স্ক মায়ের জন্য হোমে স্যাম্পল কালেকশন অনেক সুবিধাজনক।" },
    ],
    features: ["BMDC অনুমোদিত ল্যাব", "হোম স্যাম্পল কালেকশন", "ডিজিটাল রিপোর্ট", "১০০% নির্ভুল রেজাল্ট", "ডক্টর কন্সালটেশন", "গোপনীয়তা নিশ্চিত"],
    featuresEn: ["BMDC Approved Lab", "Home Sample Collection", "Digital Report", "100% Accurate Results", "Doctor Consultation", "Privacy Guaranteed"],
    availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "রংপুর", "বরিশাল", "ময়মনসিংহ"],
  },
  {
    slug: "physiotherapy",
    title: "ফিজিওথেরাপি সার্ভিস",
    titleEn: "Physiotherapy Service",
    image: "/images/placeholder.svg",
    description: "ঘরে বসে প্রফেশনাল ফিজিওথেরাপি সার্ভিস নিন। ব্যাক পেইন, জয়েন্ট পেইন, স্পোর্টস ইনজুরি, স্ট্রোক রিহ্যাবিলিটেশন — সব ধরনের ফিজিওথেরাপি সার্ভিস পাবেন।",
    rating: 4.7,
    totalReviews: 1450,
    totalOrders: 5100,
    packages: [
      { name: "বেসিক সেশন", price: 999, features: ["১ সেশন (৪৫ মিনিট)", "পেইন অ্যাসেসমেন্ট", "এক্সারসাইজ গাইডলাইন", "ফলোআপ প্ল্যান"] },
      { name: "স্ট্যান্ডার্ড প্যাকেজ", price: 4499, originalPrice: 5999, features: ["৫ সেশন প্যাকেজ", "ইলেক্ট্রোথেরাপি", "ম্যানুয়াল থেরাপি", "হোম এক্সারসাইজ প্রোগ্রাম"] },
      { name: "প্রিমিয়াম রিহ্যাব", price: 8999, originalPrice: 11999, features: ["১০ সেশন প্যাকেজ", "অ্যাডভান্সড ইকুইপমেন্ট", "স্পেশালিস্ট ফিজিওথেরাপিস্ট", "প্রগ্রেস ট্র্যাকিং", "ডক্টর কো-অর্ডিনেশন"] },
    ],
    reviews: [
      { name: "আনিসুর রহমান", rating: 5, date: "১৪ মার্চ ২০২৬", comment: "হাঁটু ব্যথায় ৫ সেশনেই অনেক উন্নতি হয়েছে। ফিজিওথেরাপিস্ট খুব দক্ষ।" },
      { name: "শামীমা পারভীন", rating: 4, date: "৮ মার্চ ২০২৬", comment: "ব্যাক পেইনের জন্য নিয়মিত সেশন নিচ্ছি। ভালো ফলাফল পাচ্ছি।" },
    ],
    features: ["সার্টিফাইড ফিজিওথেরাপিস্ট", "হোম ভিজিট", "আধুনিক ইকুইপমেন্ট", "কাস্টমাইজড ট্রিটমেন্ট প্ল্যান", "ডক্টর রেফারেল সাপোর্ট"],
    featuresEn: ["Certified Physiotherapist", "Home Visit", "Modern Equipment", "Customized Treatment Plan", "Doctor Referral Support"],
    availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট"],
  },
  {
    slug: "diagnostic-center",
    title: "ডায়াগনস্টিক সেন্টার",
    titleEn: "Diagnostic Center",
    image: "/images/placeholder.svg",
    description: "আধুনিক ডায়াগনস্টিক সার্ভিস — এক্স-রে, আল্ট্রাসনোগ্রাম, ইসিজি, ইকো, সিটি স্ক্যান, এমআরআই বুকিং ও রিপোর্ট ডেলিভারি সবকিছু এক প্ল্যাটফর্মে।",
    rating: 4.6,
    totalReviews: 980,
    totalOrders: 3600,
    packages: [
      { name: "বেসিক ইমেজিং", price: 1499, features: ["এক্স-রে / আল্ট্রাসনোগ্রাম", "অ্যাপয়েন্টমেন্ট বুকিং", "ডিজিটাল রিপোর্ট", "পিক-ড্রপ সার্ভিস"] },
      { name: "স্ট্যান্ডার্ড ডায়াগনস্টিক", price: 3999, originalPrice: 4999, features: ["ECG + ইকোকার্ডিওগ্রাম", "অ্যাপয়েন্টমেন্ট ম্যানেজমেন্ট", "স্পেশালিস্ট রেফারেল", "প্রিন্ট + ডিজিটাল রিপোর্ট"] },
      { name: "প্রিমিয়াম স্ক্যান", price: 9999, originalPrice: 12999, features: ["সিটি স্ক্যান / এমআরআই", "প্রায়োরিটি অ্যাপয়েন্টমেন্ট", "রেডিওলজিস্ট কন্সালটেশন", "হোম থেকে পিকআপ", "ফ্রি ফলোআপ"] },
    ],
    reviews: [
      { name: "কামরুল হাসান", rating: 5, date: "১৬ মার্চ ২০২৬", comment: "অনলাইনে বুকিং করে সিটি স্ক্যান করিয়েছি। কোনো লাইনে দাঁড়াতে হয়নি!" },
      { name: "ফাতেমা জান্নাত", rating: 4, date: "৯ মার্চ ২০২৬", comment: "পিকআপ সার্ভিস খুবই ভালো ছিল। রিপোর্টও দ্রুত পেয়েছি।" },
    ],
    features: ["DGHS অনুমোদিত সেন্টার", "আধুনিক ইকুইপমেন্ট", "অভিজ্ঞ রেডিওলজিস্ট", "ডিজিটাল রিপোর্ট", "পিকআপ ও ড্রপ সার্ভিস", "অনলাইন বুকিং"],
    featuresEn: ["DGHS Approved Center", "Modern Equipment", "Experienced Radiologist", "Digital Report", "Pickup & Drop Service", "Online Booking"],
    availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "রংপুর"],
  },
  {
    slug: "car-wash",
    title: "কার ওয়াশ ও কেয়ার",
    titleEn: "Car Wash & Care",
    image: serviceCarWash,
    description: "আপনার গাড়ির যত্ন নিন প্রফেশনাল কার ওয়াশ, পলিশিং ও ডিটেইলিং সার্ভিসে।",
    rating: 4.5,
    totalReviews: 1120,
    totalOrders: 4200,
    packages: [
      { name: "রেগুলার ওয়াশ", price: 499, features: ["এক্সটেরিয়র ওয়াশ", "ইন্টেরিয়র ভ্যাকুম", "ড্যাশবোর্ড ক্লিন"] },
      { name: "প্রিমিয়াম ওয়াশ", price: 1299, originalPrice: 1599, features: ["ফোম ওয়াশ", "ইন্টেরিয়র শ্যাম্পু", "টায়ার ড্রেসিং", "এয়ার ফ্রেশনার"] },
      { name: "ডিটেইলিং প্যাকেজ", price: 3499, originalPrice: 4499, features: ["ফুল পলিশিং", "সিরামিক কোটিং", "ইঞ্জিন ক্লিনিং", "লেদার কন্ডিশনিং"] },
    ],
    reviews: [
      { name: "ফাহিম আহমেদ", rating: 5, date: "৪ মার্চ ২০২৬", comment: "গাড়ি শোরুমের মতো চকচকে হয়ে গেছে!" },
    ],
    features: ["ডোরস্টেপ সার্ভিস", "প্রিমিয়াম প্রোডাক্ট", "ট্রেইনড টিম", "সন্তুষ্টি গ্যারান্টি"],
    availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা"],
  },
  {
    slug: "laptop-repair",
    title: "ল্যাপটপ ও কম্পিউটার সার্ভিস",
    titleEn: "Laptop & Computer Service",
    image: serviceLaptop,
    description: "ল্যাপটপ, ডেস্কটপ, প্রিন্টার সহ সকল ইলেকট্রনিক্স গ্যাজেটের রিপেয়ার ও সার্ভিসিং।",
    rating: 4.4,
    totalReviews: 980,
    totalOrders: 3600,
    packages: [
      { name: "সফটওয়্যার সার্ভিস", price: 499, features: ["OS ইনস্টল", "ভাইরাস রিমুভ", "ড্রাইভার আপডেট"] },
      { name: "হার্ডওয়্যার রিপেয়ার", price: 999, originalPrice: 1299, features: ["স্ক্রিন ফিক্স", "কিবোর্ড রিপ্লেস", "RAM/SSD আপগ্রেড"] },
      { name: "ফুল সার্ভিসিং", price: 1999, originalPrice: 2499, features: ["কমপ্লিট চেকআপ", "ক্লিনিং ও পেস্ট চেঞ্জ", "পার্টস রিপ্লেসমেন্ট", "৩০ দিনের ওয়ারেন্টি"] },
    ],
    reviews: [
      { name: "সাকিব হাসান", rating: 5, date: "৮ মার্চ ২০২৬", comment: "ল্যাপটপের স্ক্রিন চেঞ্জ করিয়েছি। কাজ খুবই ভালো হয়েছে।" },
    ],
    features: ["সার্টিফাইড টেকনিশিয়ান", "অরিজিনাল পার্টস", "ফ্রি ডায়াগনসিস", "হোম পিকআপ ও ডেলিভারি"],
    availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "সিলেট"],
  },
  {
    slug: "carpentry",
    title: "কার্পেন্ট্রি সার্ভিস",
    titleEn: "Carpentry Service",
    image: serviceCarpentry,
    description: "ফার্নিচার মেরামত, কাস্টম ফার্নিচার তৈরি, দরজা-জানালা ফিটিং সহ সকল কাঠের কাজ।",
    rating: 4.5,
    totalReviews: 750,
    totalOrders: 2800,
    packages: [
      { name: "ছোট মেরামত", price: 399, features: ["ফার্নিচার ফিক্সিং", "হিঞ্জ/লক রিপ্লেস", "৩০ মিনিট সার্ভিস"] },
      { name: "ফার্নিচার অ্যাসেম্বলি", price: 999, originalPrice: 1299, features: ["নতুন ফার্নিচার সেটআপ", "ওয়ার্ডরোব ফিটিং", "শেলফ ইনস্টলেশন"] },
      { name: "কাস্টম ফার্নিচার", price: 4999, originalPrice: 6999, features: ["ডিজাইন কন্সালটেশন", "কাস্টম বুকশেলফ/ক্যাবিনেট", "প্রিমিয়াম উড", "ইনস্টলেশন ইনক্লুডেড"] },
    ],
    reviews: [
      { name: "তারেক মাহমুদ", rating: 5, date: "২ মার্চ ২০২৬", comment: "কাস্টম বুকশেলফ বানিয়ে দিয়েছে। ফিনিশিং অসাধারণ!" },
    ],
    features: ["দক্ষ কার্পেন্টার", "প্রিমিয়াম ম্যাটেরিয়াল", "কাস্টম ডিজাইন", "ওয়ারেন্টি"],
    availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট"],
  },
  {
    slug: "interior-design",
    title: "ইন্টেরিয়র ডিজাইন",
    titleEn: "Interior Design",
    image: serviceInterior,
    description: "আপনার বাড়ি বা অফিসের ইন্টেরিয়র ডিজাইন, রেনোভেশন ও ডেকোরেশন সার্ভিস।",
    rating: 4.7,
    totalReviews: 620,
    totalOrders: 1800,
    packages: [
      { name: "কন্সালটেশন", price: 1999, features: ["ডিজাইন পরামর্শ", "৩D ভিজুয়ালাইজেশন", "কস্ট এস্টিমেশন"] },
      { name: "১ রুম ডিজাইন", price: 14999, originalPrice: 19999, features: ["ফুল রুম ডিজাইন", "ফার্নিচার সিলেকশন", "লাইটিং প্ল্যান", "ইমপ্লিমেন্টেশন"] },
      { name: "ফুল হোম", price: 49999, originalPrice: 69999, features: ["সম্পূর্ণ হোম ডিজাইন", "কাস্টম ফার্নিচার", "ফলস সিলিং", "মডুলার কিচেন", "প্রজেক্ট ম্যানেজমেন্ট"] },
    ],
    reviews: [
      { name: "সাবিহা নাসরিন", rating: 5, date: "১ মার্চ ২০২৬", comment: "আমাদের ফ্ল্যাটের ইন্টেরিয়র অসাধারণ হয়েছে! ডিজাইনার অনেক ক্রিয়েটিভ।" },
    ],
    features: ["এক্সপার্ট ডিজাইনার", "৩D রেন্ডারিং", "প্রজেক্ট ম্যানেজমেন্ট", "বাজেট ফ্রেন্ডলি অপশন"],
    availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম"],
  },
  // ===== সন্ধান মার্ট সার্ভিস =====
  {
    slug: "grocery-delivery",
    title: "মুদি ও মশলা ডেলিভারি",
    titleEn: "Grocery & Spice Delivery",
    image: serviceGrocery,
    description: "চাল, ডাল, তেল, মশলা সহ সকল প্রকার মুদি পণ্য আপনার দোরগোড়ায় ডেলিভারি।",
    rating: 4.6,
    totalReviews: 1200,
    totalOrders: 8500,
    packages: [
      { name: "দৈনিক প্যাকেজ", price: 299, features: ["১০টি পর্যন্ত আইটেম", "২ ঘণ্টায় ডেলিভারি", "ফ্রেশ পণ্য গ্যারান্টি"] },
      { name: "সাপ্তাহিক প্যাকেজ", price: 1499, originalPrice: 1999, features: ["৩০টি পর্যন্ত আইটেম", "ফ্রি ডেলিভারি", "বেস্ট প্রাইস গ্যারান্টি"] },
      { name: "মাসিক প্যাকেজ", price: 4999, originalPrice: 6999, features: ["আনলিমিটেড আইটেম", "৪ বার ফ্রি ডেলিভারি", "এক্সক্লুসিভ ডিসকাউন্ট", "প্রায়োরিটি সার্ভিস"] },
    ],
    reviews: [
      { name: "রহিমা বেগম", rating: 5, date: "১৫ মার্চ ২০২৬", comment: "দ্রুত ডেলিভারি এবং ফ্রেশ পণ্য পেয়েছি। খুব সন্তুষ্ট!" },
    ],
    features: ["ফ্রেশ পণ্য", "দ্রুত ডেলিভারি", "ন্যায্য মূল্য", "বিস্তৃত পণ্য তালিকা"],
    availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট"],
  },
  {
    slug: "fish-meat-market",
    title: "মাছ ও মাংস বাজার",
    titleEn: "Fish & Meat Market",
    image: serviceFishMeat,
    description: "তাজা মাছ, মাংস, চিংড়ি সহ সকল প্রোটিন পণ্য সরাসরি আপনার বাসায়।",
    rating: 4.5,
    totalReviews: 980,
    totalOrders: 6200,
    packages: [
      { name: "রেগুলার অর্ডার", price: 499, features: ["৫ কেজি পর্যন্ত", "ক্লিন ও কাট", "২ ঘণ্টায় ডেলিভারি"] },
      { name: "ফ্যামিলি প্যাক", price: 1999, originalPrice: 2499, features: ["১৫ কেজি পর্যন্ত", "মিক্স মাছ-মাংস", "ফ্রি ক্লিনিং", "ফ্রি ডেলিভারি"] },
      { name: "পার্টি প্যাক", price: 4999, originalPrice: 5999, features: ["৩০ কেজি পর্যন্ত", "প্রিমিয়াম কাট", "মেরিনেশন অপশন", "ফ্রি ডেলিভারি"] },
    ],
    reviews: [
      { name: "কামাল হোসেন", rating: 5, date: "১০ মার্চ ২০২৬", comment: "তাজা ইলিশ পেয়েছি। কাটিং ও ক্লিনিং চমৎকার!" },
    ],
    features: ["১০০% তাজা", "হাইজেনিক প্যাকেজিং", "ক্লিন ও কাট সার্ভিস", "দ্রুত ডেলিভারি"],
    availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা"],
  },
  {
    slug: "vegetables-fruits",
    title: "শাকসবজি ও ফলমূল",
    titleEn: "Vegetables & Fruits",
    image: serviceVegetables,
    description: "সদ্য তোলা তাজা শাকসবজি ও মৌসুমী ফলমূল আপনার দরজায়।",
    rating: 4.7,
    totalReviews: 1500,
    totalOrders: 9800,
    packages: [
      { name: "দৈনিক ভেজি বক্স", price: 199, features: ["৩ কেজি মিক্স সবজি", "মৌসুমী সবজি", "সকালে ডেলিভারি"] },
      { name: "ফ্যামিলি ভেজি বক্স", price: 599, originalPrice: 799, features: ["৮ কেজি সবজি", "২ কেজি ফল", "সাপ্তাহিক সাবস্ক্রিপশন অপশন"] },
      { name: "প্রিমিয়াম ফ্রুট বক্স", price: 999, originalPrice: 1299, features: ["৫ কেজি প্রিমিয়াম ফল", "আমদানিকৃত ফল", "গিফট প্যাকেজিং"] },
    ],
    reviews: [
      { name: "নাসরিন আক্তার", rating: 5, date: "১২ মার্চ ২০২৬", comment: "খুব তাজা সবজি পাই প্রতিদিন। দাম ও যুক্তিসঙ্গত।" },
    ],
    features: ["সদ্য তোলা তাজা", "কেমিক্যাল ফ্রি", "মৌসুমী ভ্যারাইটি", "সকালে ডেলিভারি"],
    availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট"],
  },
  // ===== সন্ধান ডিল সার্ভিস =====
  {
    slug: "buy-sell-electronics",
    title: "ইলেকট্রনিক্স কেনাবেচা",
    titleEn: "Buy & Sell Electronics",
    image: serviceBuySellElectronics,
    description: "মোবাইল, ল্যাপটপ, ট্যাবলেট সহ সকল ইলেকট্রনিক্স পণ্য কেনাবেচা করুন নিরাপদে।",
    rating: 4.4,
    totalReviews: 850,
    totalOrders: 4200,
    packages: [
      { name: "ফ্রি লিস্টিং", price: 0, features: ["১টি পণ্য লিস্ট", "৭ দিন অ্যাক্টিভ", "বেসিক ভেরিফিকেশন"] },
      { name: "প্রিমিয়াম লিস্টিং", price: 199, features: ["৫টি পণ্য লিস্ট", "৩০ দিন অ্যাক্টিভ", "টপ পজিশন", "ভেরিফাইড সেলার ব্যাজ"] },
      { name: "বিজনেস প্যাকেজ", price: 999, originalPrice: 1499, features: ["আনলিমিটেড লিস্টিং", "৯০ দিন অ্যাক্টিভ", "ফিচার্ড সেলার", "ডেডিকেটেড সাপোর্ট"] },
    ],
    reviews: [
      { name: "ফারুক আহমেদ", rating: 4, date: "৮ মার্চ ২০২৬", comment: "সেকেন্ড হ্যান্ড ল্যাপটপ কিনেছি। কন্ডিশন ভালো ছিল।" },
    ],
    features: ["নিরাপদ লেনদেন", "পণ্য ভেরিফিকেশন", "ন্যায্য মূল্যায়ন", "ডেলিভারি সাপোর্ট"],
    availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট"],
  },
  {
    slug: "buy-sell-furniture",
    title: "ফার্নিচার কেনাবেচা",
    titleEn: "Buy & Sell Furniture",
    image: serviceBuySellFurniture,
    description: "নতুন ও পুরাতন ফার্নিচার কেনাবেচা করুন সহজে ও নিরাপদে।",
    rating: 4.3,
    totalReviews: 620,
    totalOrders: 3100,
    packages: [
      { name: "ফ্রি লিস্টিং", price: 0, features: ["১টি ফার্নিচার লিস্ট", "৭ দিন অ্যাক্টিভ", "ফটো আপলোড"] },
      { name: "প্রিমিয়াম লিস্টিং", price: 299, features: ["৫টি ফার্নিচার লিস্ট", "৩০ দিন অ্যাক্টিভ", "হোম পিকআপ সাপোর্ট"] },
      { name: "শোরুম প্যাকেজ", price: 1499, originalPrice: 1999, features: ["আনলিমিটেড লিস্টিং", "৯০ দিন অ্যাক্টিভ", "ফিচার্ড শোরুম পেজ", "ডেলিভারি সাপোর্ট"] },
    ],
    reviews: [
      { name: "শামীমা আক্তার", rating: 5, date: "৫ মার্চ ২০২৬", comment: "পুরাতন সোফা বিক্রি করেছি। প্রক্রিয়া খুব সহজ ছিল।" },
    ],
    features: ["ফ্রি মূল্যায়ন", "হোম পিকআপ", "নিরাপদ পেমেন্ট", "ডেলিভারি সার্ভিস"],
    availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা"],
  },
  {
    slug: "buy-sell-vehicles",
    title: "গাড়ি ও বাইক কেনাবেচা",
    titleEn: "Buy & Sell Vehicles",
    image: serviceBuySellVehicles,
    description: "গাড়ি, বাইক, অটোরিকশা সহ সকল যানবাহন কেনাবেচা করুন বিশ্বস্ত প্ল্যাটফর্মে।",
    rating: 4.5,
    totalReviews: 720,
    totalOrders: 2800,
    packages: [
      { name: "ফ্রি লিস্টিং", price: 0, features: ["১টি গাড়ি/বাইক লিস্ট", "১৪ দিন অ্যাক্টিভ", "বেসিক ভেরিফিকেশন"] },
      { name: "প্রিমিয়াম লিস্টিং", price: 499, features: ["৩টি যানবাহন লিস্ট", "৬০ দিন অ্যাক্টিভ", "ইন্সপেকশন রিপোর্ট", "টপ পজিশন"] },
      { name: "ডিলার প্যাকেজ", price: 2999, originalPrice: 3999, features: ["আনলিমিটেড লিস্টিং", "৯০ দিন অ্যাক্টিভ", "ফিচার্ড ডিলার পেজ", "ডকুমেন্ট ভেরিফিকেশন", "ডেডিকেটেড সাপোর্ট"] },
    ],
    reviews: [
      { name: "আবদুল করিম", rating: 5, date: "১ মার্চ ২০২৬", comment: "পুরাতন বাইক বিক্রি করেছি। ভেরিফিকেশন প্রক্রিয়া ভালো।" },
    ],
    features: ["যানবাহন ইন্সপেকশন", "ডকুমেন্ট ভেরিফিকেশন", "নিরাপদ লেনদেন", "ট্রান্সফার সাপোর্ট"],
    availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট"],
  },
  // --- Courier & Delivery ---
  {
    slug: "parcel-delivery",
    title: "পার্সেল ডেলিভারি",
    titleEn: "Parcel Delivery",
    description: "দ্রুত ও নিরাপদ পার্সেল ডেলিভারি সার্ভিস। ঢাকা সিটির ভেতরে ও বাইরে যেকোনো স্থানে পার্সেল পাঠান।",
    image: "/images/placeholder.svg",
    rating: 4.7,
    totalReviews: 890,
    totalOrders: 5200,
    packages: [
      { name: "সেম ডে ডেলিভারি", price: 80, originalPrice: 120, features: ["ঢাকা সিটি", "একই দিনে ডেলিভারি", "২ কেজি পর্যন্ত", "লাইভ ট্র্যাকিং"] },
      { name: "নেক্সট ডে ডেলিভারি", price: 60, originalPrice: 90, features: ["সারাদেশে", "পরের দিন ডেলিভারি", "৫ কেজি পর্যন্ত", "SMS নোটিফিকেশন"] },
      { name: "বাল্ক শিপিং", price: 150, originalPrice: 200, features: ["১০+ পার্সেল", "বিশেষ ডিসকাউন্ট", "ডেডিকেটেড পিকআপ", "বিজনেস ড্যাশবোর্ড"] },
    ],
    reviews: [
      { name: "রাকিব হাসান", rating: 5, date: "১০ মার্চ ২০২৬", comment: "খুব দ্রুত পার্সেল পৌঁছে গেছে। ট্র্যাকিং সিস্টেম চমৎকার।" },
      { name: "সুমাইয়া আক্তার", rating: 4, date: "৮ মার্চ ২০২৬", comment: "সময়মতো ডেলিভারি হয়েছে। প্যাকেজিং ভালো ছিল।" },
    ],
    features: ["লাইভ ট্র্যাকিং", "ক্যাশ অন ডেলিভারি", "ফ্র্যাজাইল আইটেম কেয়ার", "ইন্স্যুরেন্স কভারেজ", "পিকআপ সার্ভিস"],
    availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "বরিশাল", "রংপুর", "ময়মনসিংহ"],
  },
  {
    slug: "document-courier",
    title: "ডকুমেন্ট কুরিয়ার",
    titleEn: "Document Courier",
    description: "গোপনীয় ও গুরুত্বপূর্ণ ডকুমেন্ট নিরাপদে পাঠান। চিঠি, চুক্তিপত্র, সার্টিফিকেট ইত্যাদি দ্রুত কুরিয়ার সার্ভিস।",
    image: "/images/placeholder.svg",
    rating: 4.8,
    totalReviews: 620,
    totalOrders: 3800,
    packages: [
      { name: "আর্জেন্ট ডকুমেন্ট", price: 100, originalPrice: 150, features: ["৪ ঘণ্টায় ডেলিভারি", "ঢাকা সিটি", "সিল করা এনভেলপ", "রিসিভার সাইন"] },
      { name: "স্ট্যান্ডার্ড ডকুমেন্ট", price: 50, originalPrice: 80, features: ["২৪ ঘণ্টায় ডেলিভারি", "সারাদেশে", "ট্র্যাকিং নম্বর", "SMS কনফার্মেশন"] },
      { name: "বাল্ক ডকুমেন্ট", price: 200, originalPrice: 300, features: ["অফিস থেকে পিকআপ", "একাধিক ঠিকানায়", "মাসিক বিলিং", "ডেডিকেটেড এজেন্ট"] },
    ],
    reviews: [
      { name: "কামরুল ইসলাম", rating: 5, date: "১২ মার্চ ২০২৬", comment: "অফিসের গুরুত্বপূর্ণ ডকুমেন্ট নিরাপদে পৌঁছে গেছে।" },
    ],
    features: ["গোপনীয়তা নিশ্চিত", "সিলড এনভেলপ", "রিসিভার ভেরিফিকেশন", "ডিজিটাল রিসিট", "প্রুফ অব ডেলিভারি"],
    availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "বরিশাল"],
  },
  {
    slug: "ecommerce-shipping",
    title: "ই-কমার্স শিপিং",
    titleEn: "E-Commerce Shipping",
    description: "অনলাইন ব্যবসার জন্য সম্পূর্ণ শিপিং সমাধান। পিকআপ, প্যাকেজিং, ডেলিভারি ও ক্যাশ কালেকশন এক প্ল্যাটফর্মে।",
    image: "/images/placeholder.svg",
    rating: 4.6,
    totalReviews: 450,
    totalOrders: 8500,
    packages: [
      { name: "স্টার্টার", price: 50, originalPrice: 70, features: ["প্রতি পার্সেল ৫০ টাকা", "ঢাকার ভেতর", "২৪-৪৮ ঘণ্টা", "COD সুবিধা"] },
      { name: "বিজনেস", price: 45, originalPrice: 65, features: ["প্রতি পার্সেল ৪৫ টাকা", "সারাদেশে", "মার্চেন্ট প্যানেল", "বাল্ক অর্ডার"] },
      { name: "এন্টারপ্রাইজ", price: 35, originalPrice: 55, features: ["কাস্টম রেট", "ডেডিকেটেড ম্যানেজার", "API ইন্টিগ্রেশন", "রিয়েলটাইম ড্যাশবোর্ড"] },
    ],
    reviews: [
      { name: "তানভীর আহমেদ", rating: 5, date: "৫ মার্চ ২০২৬", comment: "আমার অনলাইন শপের জন্য সেরা শিপিং পার্টনার। COD কালেকশন খুব দ্রুত।" },
    ],
    features: ["মার্চেন্ট ড্যাশবোর্ড", "COD কালেকশন", "রিটার্ন ম্যানেজমেন্ট", "বাল্ক অর্ডার", "API ইন্টিগ্রেশন", "অটো SMS"],
    availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "বরিশাল", "রংপুর", "ময়মনসিংহ", "কুমিল্লা"],
  },
  // --- Health & Ambulance (additional) ---
  { slug: "online-doctor", title: "অনলাইন ডক্টর", titleEn: "Online Doctor", description: "ঘরে বসে অভিজ্ঞ ডাক্তারের সাথে ভিডিও কনসালটেশন। প্রেসক্রিপশন ও ফলো-আপ সুবিধা।", image: "/images/placeholder.svg", rating: 4.8, totalReviews: 1200, totalOrders: 8500, packages: [
    { name: "সিঙ্গেল কনসালটেশন", price: 300, originalPrice: 500, features: ["১৫ মিনিট ভিডিও কল", "ই-প্রেসক্রিপশন", "ফলো-আপ চ্যাট"] },
    { name: "ফ্যামিলি প্যাকেজ", price: 800, originalPrice: 1200, features: ["৪ জন পর্যন্ত", "মাসিক চেকআপ", "২৪/৭ চ্যাট সাপোর্ট"] },
    { name: "প্রিমিয়াম কেয়ার", price: 1500, originalPrice: 2000, features: ["আনলিমিটেড কনসালটেশন", "স্পেশালিস্ট রেফারেল", "ল্যাব টেস্ট ডিসকাউন্ট"] },
  ], reviews: [{ name: "ফাতেমা বেগম", rating: 5, date: "১৫ মার্চ ২০২৬", comment: "খুব ভালো অভিজ্ঞতা। ডাক্তার খুব মনোযোগ দিয়ে শুনেছেন।" }], features: ["ভিডিও কনসালটেশন", "ই-প্রেসক্রিপশন", "ফলো-আপ চ্যাট", "স্পেশালিস্ট রেফারেল"], availableCities: ["ঢাকা", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "বরিশাল", "রংপুর", "ময়মনসিংহ"] },
  { slug: "home-doctor", title: "হোম ডক্টর", titleEn: "Home Doctor", description: "বাসায় ডাক্তার ভিজিট সার্ভিস। অসুস্থ বা বয়স্ক রোগীদের জন্য আদর্শ।", image: "/images/placeholder.svg", rating: 4.7, totalReviews: 850, totalOrders: 4200, packages: [
    { name: "সিঙ্গেল ভিজিট", price: 1000, originalPrice: 1500, features: ["ডাক্তার হোম ভিজিট", "প্রেসক্রিপশন", "বেসিক চেকআপ"] },
    { name: "ফ্যামিলি ভিজিট", price: 1800, originalPrice: 2500, features: ["পরিবারের সবাই", "বিস্তারিত পরীক্ষা", "ফলো-আপ কল"] },
    { name: "মাসিক কেয়ার", price: 3500, originalPrice: 5000, features: ["মাসে ৪টি ভিজিট", "প্রেশার/সুগার মনিটরিং", "ইমার্জেন্সি সাপোর্ট"] },
  ], reviews: [{ name: "আব্দুল হক", rating: 5, date: "১২ মার্চ ২০২৬", comment: "বাবার জন্য ডাক্তার ডেকেছিলাম। সময়মতো এসে চমৎকার সার্ভিস দিয়েছেন।" }], features: ["হোম ভিজিট", "প্রেসক্রিপশন", "ফলো-আপ", "ইমার্জেন্সি সাপোর্ট"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম"] },
  { slug: "health-checkup", title: "হেলথ চেকআপ", titleEn: "Health Checkup", description: "সম্পূর্ণ স্বাস্থ্য পরীক্ষা প্যাকেজ। সকল বয়সের জন্য কাস্টমাইজড প্ল্যান।", image: "/images/placeholder.svg", rating: 4.6, totalReviews: 680, totalOrders: 3500, packages: [
    { name: "বেসিক চেকআপ", price: 1500, originalPrice: 2500, features: ["ব্লাড টেস্ট", "ইউরিন টেস্ট", "BMI চেক", "ডাক্তার কনসালটেশন"] },
    { name: "কমপ্রিহেনসিভ", price: 3500, originalPrice: 5000, features: ["৩০+ টেস্ট", "ECG", "চেস্ট এক্স-রে", "ডায়াবেটিস স্ক্রিনিং"] },
    { name: "এক্সিকিউটিভ", price: 7000, originalPrice: 10000, features: ["৬০+ টেস্ট", "আল্ট্রাসনোগ্রাম", "ইকো", "ক্যান্সার মার্কার"] },
  ], reviews: [{ name: "নাজমুল ইসলাম", rating: 5, date: "১০ মার্চ ২০২৬", comment: "সম্পূর্ণ হেলথ চেকআপ করিয়েছি। রিপোর্ট পেতে ২৪ ঘণ্টা লেগেছে।" }], features: ["হোম স্যাম্পল কালেকশন", "ডিজিটাল রিপোর্ট", "ডাক্তার কনসালটেশন", "ফলো-আপ"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট"] },
  { slug: "ambulance-ac", title: "এসি এম্বুল্যান্স", titleEn: "AC Ambulance", description: "এয়ার কন্ডিশনড এম্বুল্যান্স সার্ভিস। জরুরি ও নন-ইমার্জেন্সি রোগী পরিবহন।", image: "/images/placeholder.svg", rating: 4.9, totalReviews: 420, totalOrders: 2800, packages: [
    { name: "সিটি ট্রান্সফার", price: 2000, originalPrice: 3000, features: ["ঢাকা সিটি", "এসি এম্বুল্যান্স", "প্যারামেডিক", "অক্সিজেন"] },
    { name: "আন্তঃজেলা", price: 5000, originalPrice: 7000, features: ["জেলায় জেলায়", "এসি এম্বুল্যান্স", "নার্স সহ", "মনিটরিং"] },
    { name: "লং ডিস্ট্যান্স", price: 10000, originalPrice: 15000, features: ["সারাদেশে", "ICU সুবিধা", "ডাক্তার সহ", "ভেন্টিলেটর"] },
  ], reviews: [{ name: "রহিম উদ্দিন", rating: 5, date: "৮ মার্চ ২০২৬", comment: "জরুরি সময়ে ১৫ মিনিটে এম্বুল্যান্স পাঠিয়েছেন।" }], features: ["২৪/৭ সার্ভিস", "এসি এম্বুল্যান্স", "প্যারামেডিক", "অক্সিজেন সাপ্লাই"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "বরিশাল"] },
  { slug: "icu-ambulance", title: "ICU এম্বুল্যান্স", titleEn: "ICU Ambulance", description: "ICU সুবিধাযুক্ত এম্বুল্যান্স। ক্রিটিক্যাল কেয়ার রোগী পরিবহনের জন্য।", image: "/images/placeholder.svg", rating: 4.9, totalReviews: 280, totalOrders: 1500, packages: [
    { name: "সিটি ICU", price: 5000, originalPrice: 7000, features: ["ঢাকা সিটি", "ICU সেটআপ", "ডাক্তার", "ভেন্টিলেটর"] },
    { name: "আন্তঃজেলা ICU", price: 12000, originalPrice: 18000, features: ["জেলায় জেলায়", "ফুল ICU", "বিশেষজ্ঞ ডাক্তার", "মনিটরিং"] },
    { name: "এয়ার এম্বুল্যান্স", price: 50000, originalPrice: 70000, features: ["সারাদেশে", "হেলিকপ্টার", "ফুল ICU টিম", "ক্রিটিক্যাল কেয়ার"] },
  ], reviews: [{ name: "মোঃ জাহিদ", rating: 5, date: "৫ মার্চ ২০২৬", comment: "মায়ের জন্য ICU এম্বুল্যান্স লেগেছিল। দ্রুত সার্ভিস পেয়েছি।" }], features: ["ICU সেটআপ", "ভেন্টিলেটর", "কার্ডিয়াক মনিটর", "২৪/৭ সার্ভিস"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট"] },

  // --- Home Service ---
  { slug: "maid-service", title: "কাজের বুয়া", titleEn: "Maid Service", description: "বিশ্বস্ত ও ভেরিফাইড কাজের বুয়া সার্ভিস। দৈনিক, সাপ্তাহিক বা মাসিক ভিত্তিতে।", image: "/images/placeholder.svg", rating: 4.5, totalReviews: 1500, totalOrders: 9500, packages: [
    { name: "দৈনিক সার্ভিস", price: 500, originalPrice: 700, features: ["দিনে ৪ ঘণ্টা", "রান্না ও পরিষ্কার", "ভেরিফাইড বুয়া"] },
    { name: "মাসিক (হাফ টাইম)", price: 6000, originalPrice: 8000, features: ["মাসিক চুক্তি", "দিনে ৪ ঘণ্টা", "ট্রেনড কর্মী"] },
    { name: "মাসিক (ফুল টাইম)", price: 10000, originalPrice: 14000, features: ["মাসিক চুক্তি", "দিনে ৮ ঘণ্টা", "রান্না+পরিষ্কার+বাসন"] },
  ], reviews: [{ name: "শাহানা পারভীন", rating: 5, date: "১৪ মার্চ ২০২৬", comment: "ভালো ও বিশ্বস্ত বুয়া পাঠিয়েছেন।" }], features: ["ভেরিফাইড কর্মী", "NID যাচাই", "প্রশিক্ষিত", "রিপ্লেসমেন্ট গ্যারান্টি"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম"] },
  { slug: "cook-service", title: "রাঁধুনি সার্ভিস", titleEn: "Cook Service", description: "দক্ষ রাঁধুনি সার্ভিস। বাড়ির রান্না, পার্টি কেটারিং বা ইভেন্ট রান্নার জন্য।", image: "/images/placeholder.svg", rating: 4.6, totalReviews: 780, totalOrders: 4200, packages: [
    { name: "দৈনিক রান্না", price: 600, originalPrice: 800, features: ["২ বেলা রান্না", "৪-৫ আইটেম", "বাজার লিস্ট"] },
    { name: "মাসিক রান্না", price: 8000, originalPrice: 11000, features: ["মাসিক চুক্তি", "২ বেলা রান্না", "পরিষ্কার সহ"] },
    { name: "পার্টি/ইভেন্ট", price: 3000, originalPrice: 4500, features: ["২০-৫০ জন", "মেনু কাস্টম", "সকল উপকরণ সহ"] },
  ], reviews: [{ name: "রিনা আক্তার", rating: 4, date: "১১ মার্চ ২০২৬", comment: "পার্টির রান্না চমৎকার হয়েছিল। সবাই প্রশংসা করেছে।" }], features: ["ভেরিফাইড রাঁধুনি", "হাইজিন মেন্টেন", "কাস্টম মেনু", "টাইম ম্যানেজমেন্ট"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম"] },
  { slug: "babysitter", title: "বেবিসিটার", titleEn: "Babysitter", description: "প্রশিক্ষিত ও বিশ্বস্ত বেবিসিটার সার্ভিস। আপনার শিশুর যত্নে নিরাপদ হাত।", image: "/images/placeholder.svg", rating: 4.7, totalReviews: 920, totalOrders: 5100, packages: [
    { name: "ঘণ্টা ভিত্তিক", price: 200, originalPrice: 300, features: ["প্রতি ঘণ্টা", "শিশু দেখভাল", "খাওয়ানো ও খেলানো"] },
    { name: "দৈনিক", price: 800, originalPrice: 1200, features: ["৮ ঘণ্টা", "শিশু যত্ন", "প্রশিক্ষিত সিটার"] },
    { name: "মাসিক", price: 12000, originalPrice: 16000, features: ["ফুল টাইম", "ট্রেনড নার্সারি কেয়ার", "ফার্স্ট এইড জানা"] },
  ], reviews: [{ name: "তাসনিম জাহান", rating: 5, date: "১৩ মার্চ ২০২৬", comment: "অফিসে থাকা অবস্থায় বাচ্চার যত্ন নিয়ে চিন্তামুক্ত ছিলাম।" }], features: ["NID ভেরিফাইড", "ফার্স্ট এইড ট্রেনিং", "বাচ্চাদের সাথে অভিজ্ঞ", "CCTV মনিটরিং"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম"] },
  { slug: "wash-iron", title: "ওয়াশ অ্যান্ড আয়রন", titleEn: "Wash & Iron", description: "প্রফেশনাল লন্ড্রি সার্ভিস। কাপড় ধোয়া ও ইস্ত্রি পিকআপ ও ডেলিভারি সহ।", image: "/images/placeholder.svg", rating: 4.5, totalReviews: 650, totalOrders: 3800, packages: [
    { name: "বেসিক", price: 15, originalPrice: 25, features: ["প্রতি পিস", "ওয়াশ ও আয়রন", "পিকআপ ও ডেলিভারি"] },
    { name: "ফ্যামিলি প্যাক", price: 500, originalPrice: 750, features: ["৩০ পিস পর্যন্ত", "ওয়াশ ও আয়রন", "ফ্রি পিকআপ"] },
    { name: "মাসিক সাবস্ক্রিপশন", price: 1500, originalPrice: 2200, features: ["আনলিমিটেড", "ওয়াশ ও আয়রন", "সাপ্তাহিক পিকআপ"] },
  ], reviews: [{ name: "সাদিয়া রহমান", rating: 4, date: "৯ মার্চ ২০২৬", comment: "কাপড় পরিষ্কার ও সুন্দরভাবে ইস্ত্রি করে দিয়েছে।" }], features: ["পিকআপ ও ডেলিভারি", "ইকো-ফ্রেন্ডলি", "৪৮ ঘণ্টায় ডেলিভারি", "ড্যামেজ গ্যারান্টি"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম"] },
  { slug: "dry-cleaning", title: "ড্রাই ক্লিনিং", titleEn: "Dry Cleaning", description: "প্রিমিয়াম ড্রাই ক্লিনিং সার্ভিস। স্যুট, শাড়ি, জ্যাকেট সবকিছুর যত্ন।", image: "/images/placeholder.svg", rating: 4.6, totalReviews: 420, totalOrders: 2500, packages: [
    { name: "সিঙ্গেল আইটেম", price: 250, originalPrice: 400, features: ["প্রতি পিস", "ড্রাই ক্লিনিং", "প্রেসিং"] },
    { name: "৫ পিস প্যাক", price: 1000, originalPrice: 1500, features: ["৫ পিস", "ড্রাই ক্লিনিং", "ফ্রি পিকআপ"] },
    { name: "প্রিমিয়াম", price: 2000, originalPrice: 3000, features: ["১০ পিস", "স্টেইন রিমুভাল", "প্রিমিয়াম প্যাকিং"] },
  ], reviews: [{ name: "কামরুন নাহার", rating: 5, date: "৭ মার্চ ২০২৬", comment: "স্যুট ড্রাই ক্লিন করিয়েছি। নতুনের মতো হয়ে এসেছে।" }], features: ["প্রফেশনাল ক্লিনিং", "স্টেইন রিমুভাল", "ফ্রি পিকআপ", "ইন্স্যুরেন্স কভার"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম"] },
  { slug: "washing-service", title: "ওয়াশিং মেশিন সার্ভিস", titleEn: "Washing Service", description: "ওয়াশিং মেশিনে বাল্ক লন্ড্রি সার্ভিস। কম্বল, পর্দা, বেডশিট ধোয়ার জন্য।", image: "/images/placeholder.svg", rating: 4.4, totalReviews: 380, totalOrders: 2100, packages: [
    { name: "বেসিক ওয়াশ", price: 300, originalPrice: 500, features: ["৫ কেজি পর্যন্ত", "মেশিন ওয়াশ", "ড্রাই ও ফোল্ড"] },
    { name: "হেভি ওয়াশ", price: 600, originalPrice: 900, features: ["১০ কেজি পর্যন্ত", "কম্বল/পর্দা", "ইস্ত্রি সহ"] },
    { name: "বাল্ক ওয়াশ", price: 1000, originalPrice: 1500, features: ["২০ কেজি পর্যন্ত", "ফ্রি পিকআপ", "ডেটারজেন্ট ফ্রি"] },
  ], reviews: [{ name: "আমিনা খাতুন", rating: 4, date: "৬ মার্চ ২০২৬", comment: "পর্দাগুলো খুব পরিষ্কার হয়ে এসেছে।" }], features: ["মেশিন ওয়াশ", "পিকআপ ও ডেলিভারি", "ডেটারজেন্ট ইনক্লুডেড", "৩৬ ঘণ্টায় রিটার্ন"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম"] },
  { slug: "tiffin-service", title: "টিফিন সার্ভিস", titleEn: "Tiffin Service", description: "হোমমেড টিফিন সার্ভিস। অফিস বা বাসায় দুপুরে স্বাস্থ্যকর ঘরোয়া খাবার।", image: "/images/placeholder.svg", rating: 4.5, totalReviews: 560, totalOrders: 3200, packages: [
    { name: "সিঙ্গেল মিল", price: 100, originalPrice: 150, features: ["১ বেলা", "ভাত+মাছ/মাংস+সবজি", "ফ্রি ডেলিভারি"] },
    { name: "সাপ্তাহিক", price: 600, originalPrice: 900, features: ["৬ দিন", "দুপুরের খাবার", "কাস্টম মেনু"] },
    { name: "মাসিক", price: 2200, originalPrice: 3000, features: ["২৬ দিন", "দুপুর+রাত", "ডায়েট অপশন"] },
  ], reviews: [{ name: "মাহমুদ হাসান", rating: 5, date: "১১ মার্চ ২০২৬", comment: "অফিসে রোজ ঘরোয়া খাবার পাচ্ছি। দারুণ স্বাদ।" }], features: ["ঘরোয়া রান্না", "হাইজেনিক", "টাইমলি ডেলিভারি", "ডায়েট ফ্রেন্ডলি"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ"] },

  // --- Vehicle Rental ---
  { slug: "covered-van", title: "কাভার্ড ভ্যান", titleEn: "Covered Van", description: "পণ্য পরিবহনের জন্য কাভার্ড ভ্যান ভাড়া। নিরাপদ ও সময়মতো ডেলিভারি।", image: "/images/placeholder.svg", rating: 4.6, totalReviews: 520, totalOrders: 3100, packages: [
    { name: "ছোট ভ্যান", price: 2500, originalPrice: 3500, features: ["১ টন ক্যাপাসিটি", "ঢাকার মধ্যে", "ড্রাইভার সহ", "লোডিং সহ"] },
    { name: "বড় ভ্যান", price: 4000, originalPrice: 5500, features: ["৩ টন ক্যাপাসিটি", "আন্তঃজেলা", "ড্রাইভার+হেল্পার"] },
    { name: "লং ডিস্ট্যান্স", price: 8000, originalPrice: 12000, features: ["৫ টন", "সারাদেশে", "ইন্স্যুরেন্স কভার"] },
  ], reviews: [{ name: "জাহিদ হোসেন", rating: 5, date: "১০ মার্চ ২০২৬", comment: "ফার্নিচার শিফটিং করেছি। খুব ভালো সার্ভিস।" }], features: ["GPS ট্র্যাকিং", "ইন্স্যুরেন্স", "লোডিং/আনলোডিং", "২৪/৭ সার্ভিস"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট"] },
  { slug: "truck-rental", title: "ট্রাক ভাড়া", titleEn: "Truck Rental", description: "ভারী মালামাল পরিবহনের জন্য ট্রাক ভাড়া। শিল্প ও বাণিজ্যিক পরিবহন।", image: "/images/placeholder.svg", rating: 4.5, totalReviews: 380, totalOrders: 2200, packages: [
    { name: "ছোট ট্রাক", price: 5000, originalPrice: 7000, features: ["৫ টন", "ঢাকা সিটি", "ড্রাইভার+হেল্পার"] },
    { name: "মাঝারি ট্রাক", price: 10000, originalPrice: 14000, features: ["১০ টন", "আন্তঃজেলা", "ইন্স্যুরেন্স"] },
    { name: "বড় ট্রাক", price: 20000, originalPrice: 28000, features: ["২০ টন", "সারাদেশে", "ফুল সাপোর্ট"] },
  ], reviews: [{ name: "আলমগীর হোসেন", rating: 4, date: "৮ মার্চ ২০২৬", comment: "ফ্যাক্টরির মালামাল সময়মতো পৌঁছেছে।" }], features: ["হেভি ক্যাপাসিটি", "GPS ট্র্যাকিং", "ইন্স্যুরেন্স কভার", "অভিজ্ঞ ড্রাইভার"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "বরিশাল"] },
  { slug: "pickup-van", title: "পিকআপ ভ্যান", titleEn: "Pickup Van", description: "ছোট মালামাল পরিবহনের জন্য পিকআপ ভ্যান। দ্রুত ও সাশ্রয়ী।", image: "/images/placeholder.svg", rating: 4.5, totalReviews: 450, totalOrders: 2800, packages: [
    { name: "সিটি রাইড", price: 1500, originalPrice: 2000, features: ["ঢাকা সিটি", "৫০০ কেজি", "ড্রাইভার সহ"] },
    { name: "শর্ট ডিস্ট্যান্স", price: 2500, originalPrice: 3500, features: ["৫০ কিমি পর্যন্ত", "১ টন", "হেল্পার সহ"] },
    { name: "লং ডিস্ট্যান্স", price: 5000, originalPrice: 7000, features: ["সারাদেশে", "১.৫ টন", "ইন্স্যুরেন্স"] },
  ], reviews: [{ name: "করিম মিয়া", rating: 4, date: "১২ মার্চ ২০২৬", comment: "অল্প মালামাল শিফট করতে পিকআপ দারুণ কাজ দিয়েছে।" }], features: ["দ্রুত সার্ভিস", "সাশ্রয়ী মূল্য", "GPS ট্র্যাকিং", "লোডিং সহায়তা"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা"] },
  { slug: "microbus-rent", title: "মাইক্রোবাস ভাড়া", titleEn: "Microbus Rent", description: "পরিবার বা গ্রুপ ট্রিপের জন্য মাইক্রোবাস ভাড়া। ড্রাইভার সহ আরামদায়ক যাত্রা।", image: "/images/placeholder.svg", rating: 4.7, totalReviews: 680, totalOrders: 4500, packages: [
    { name: "হাফ ডে", price: 3000, originalPrice: 4000, features: ["৬ ঘণ্টা", "৭ সিটার", "ড্রাইভার+ফুয়েল"] },
    { name: "ফুল ডে", price: 5000, originalPrice: 7000, features: ["১২ ঘণ্টা", "৭-১০ সিটার", "ড্রাইভার+ফুয়েল"] },
    { name: "মাল্টি ডে", price: 8000, originalPrice: 12000, features: ["প্রতি দিন", "১০-১৫ সিটার", "আউটসিটি"] },
  ], reviews: [{ name: "শফিক আহমেদ", rating: 5, date: "৯ মার্চ ২০২৬", comment: "কক্সবাজার ট্রিপে মাইক্রোবাস নিয়েছিলাম। দারুণ অভিজ্ঞতা।" }], features: ["এসি মাইক্রোবাস", "অভিজ্ঞ ড্রাইভার", "ফুয়েল ইনক্লুডেড", "২৪/৭ বুকিং"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "বরিশাল"] },
  { slug: "luxury-rent", title: "লাক্সারি কার ভাড়া", titleEn: "Luxury Car Rent", description: "বিয়ে, ইভেন্ট বা বিজনেসের জন্য লাক্সারি গাড়ি ভাড়া।", image: "/images/placeholder.svg", rating: 4.8, totalReviews: 320, totalOrders: 1800, packages: [
    { name: "সেডান", price: 5000, originalPrice: 7000, features: ["৮ ঘণ্টা", "টয়োটা/হোন্ডা", "ড্রাইভার+ফুয়েল"] },
    { name: "SUV/Jeep", price: 8000, originalPrice: 12000, features: ["১২ ঘণ্টা", "প্রাডো/পাজেরো", "ডেকোরেশন অপশন"] },
    { name: "প্রিমিয়াম", price: 15000, originalPrice: 22000, features: ["ফুল ডে", "BMW/Mercedes", "VIP ট্রিটমেন্ট"] },
  ], reviews: [{ name: "তানভীর ইমাম", rating: 5, date: "১০ মার্চ ২০২৬", comment: "বিয়ের গাড়ি হিসেবে দারুণ ছিল। সুন্দর ডেকোরেশন করেছিল।" }], features: ["প্রিমিয়াম গাড়ি", "ডেকোরেশন", "প্রফেশনাল ড্রাইভার", "এয়ারপোর্ট পিকআপ"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম"] },
  { slug: "sedan-rent", title: "সেডান কার ভাড়া", titleEn: "Sedan Car Rent", description: "দৈনন্দিন ব্যবহার, অফিস যাতায়াত বা শহরের ভেতর চলাফেরার জন্য সেডান গাড়ি।", image: "/images/placeholder.svg", rating: 4.5, totalReviews: 450, totalOrders: 2800, packages: [
    { name: "ঘণ্টা ভিত্তিক", price: 500, originalPrice: 700, features: ["প্রতি ঘণ্টা", "ড্রাইভার সহ", "ফুয়েল সহ"] },
    { name: "হাফ ডে", price: 2500, originalPrice: 3500, features: ["৬ ঘণ্টা", "সিটি রাইড", "এসি গাড়ি"] },
    { name: "ফুল ডে", price: 4000, originalPrice: 5500, features: ["১২ ঘণ্টা", "আনলিমিটেড কিমি", "ড্রাইভার+ফুয়েল"] },
  ], reviews: [{ name: "রেজওয়ান করিম", rating: 4, date: "৮ মার্চ ২০২৬", comment: "অফিসের কাজে গাড়ি ভাড়া নিয়েছিলাম। ড্রাইভার ভদ্র ও সময়নিষ্ঠ ছিলেন।" }], features: ["এসি গাড়ি", "প্রফেশনাল ড্রাইভার", "ফুয়েল ইনক্লুডেড", "GPS ট্র্যাকিং"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম"] },
  { slug: "bike-rent", title: "বাইক ভাড়া", titleEn: "Bike Rent", description: "শহরে দ্রুত চলাফেরার জন্য বাইক ভাড়া। হেলমেট ও ইন্স্যুরেন্স সহ।", image: "/images/placeholder.svg", rating: 4.4, totalReviews: 350, totalOrders: 2100, packages: [
    { name: "ঘণ্টা ভিত্তিক", price: 100, originalPrice: 150, features: ["প্রতি ঘণ্টা", "হেলমেট ফ্রি", "সিটি রাইড"] },
    { name: "দৈনিক", price: 500, originalPrice: 700, features: ["২৪ ঘণ্টা", "আনলিমিটেড কিমি", "হেলমেট+ইন্স্যুরেন্স"] },
    { name: "সাপ্তাহিক", price: 2500, originalPrice: 3500, features: ["৭ দিন", "ফুয়েল আলাদা", "মেইনটেন্যান্স ফ্রি"] },
  ], reviews: [{ name: "রাকিব হাসান", rating: 4, date: "৭ মার্চ ২০২৬", comment: "ট্রাফিক এড়াতে বাইক সবচেয়ে ভালো অপশন।" }], features: ["হেলমেট ফ্রি", "ইন্স্যুরেন্স", "GPS ট্র্যাকিং", "রোডসাইড অ্যাসিস্ট্যান্স"], availableCities: ["ঢাকা", "গাজীপুর", "চট্টগ্রাম"] },
  { slug: "cycle-rent", title: "সাইকেল ভাড়া", titleEn: "Cycle Rent", description: "স্বাস্থ্যকর ও পরিবেশবান্ধব যাতায়াতের জন্য সাইকেল ভাড়া।", image: "/images/placeholder.svg", rating: 4.3, totalReviews: 220, totalOrders: 1200, packages: [
    { name: "ঘণ্টা ভিত্তিক", price: 30, originalPrice: 50, features: ["প্রতি ঘণ্টা", "সিটি সাইকেল", "লক ফ্রি"] },
    { name: "দৈনিক", price: 150, originalPrice: 250, features: ["২৪ ঘণ্টা", "গিয়ার সাইকেল", "হেলমেট ফ্রি"] },
    { name: "মাসিক", price: 2000, originalPrice: 3000, features: ["৩০ দিন", "প্রিমিয়াম সাইকেল", "মেইনটেন্যান্স ফ্রি"] },
  ], reviews: [{ name: "সাব্বির আহমেদ", rating: 4, date: "৫ মার্চ ২০২৬", comment: "ক্যাম্পাসে চলাফেরার জন্য সাইকেল ভাড়া নিয়েছি।" }], features: ["ইকো ফ্রেন্ডলি", "হেলমেট ফ্রি", "ডেলিভারি অপশন", "মেইনটেন্যান্স"], availableCities: ["ঢাকা", "চট্টগ্রাম", "রাজশাহী"] },

  // --- IT & Web ---
  { slug: "website-development", title: "ওয়েবসাইট ডেভেলপমেন্ট", titleEn: "Website Development", description: "কাস্টম ওয়েবসাইট ডিজাইন ও ডেভেলপমেন্ট। ব্যবসা, ই-কমার্স বা পোর্টফোলিও।", image: "/images/placeholder.svg", rating: 4.8, totalReviews: 450, totalOrders: 2200, packages: [
    { name: "বেসিক", price: 15000, originalPrice: 25000, features: ["৫ পেজ", "রেসপন্সিভ ডিজাইন", "১ বছর হোস্টিং"] },
    { name: "স্ট্যান্ডার্ড", price: 35000, originalPrice: 50000, features: ["১০+ পেজ", "CMS", "SEO অপটিমাইজড", "SSL"] },
    { name: "প্রিমিয়াম", price: 80000, originalPrice: 120000, features: ["কাস্টম ফিচার", "ই-কমার্স", "পেমেন্ট গেটওয়ে", "অ্যাডমিন প্যানেল"] },
  ], reviews: [{ name: "আরিফ চৌধুরী", rating: 5, date: "১৫ মার্চ ২০২৬", comment: "আমাদের কোম্পানির ওয়েবসাইট চমৎকার হয়েছে।" }], features: ["কাস্টম ডিজাইন", "SEO ফ্রেন্ডলি", "মোবাইল রেসপন্সিভ", "সাপোর্ট"], availableCities: ["ঢাকা", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "বরিশাল", "রংপুর", "ময়মনসিংহ"] },
  { slug: "graphics-design", title: "গ্রাফিক্স ডিজাইন", titleEn: "Graphics Design", description: "লোগো, ব্যানার, সোশ্যাল মিডিয়া পোস্ট, ব্রোশিওর ইত্যাদি গ্রাফিক্স ডিজাইন।", image: "/images/placeholder.svg", rating: 4.7, totalReviews: 620, totalOrders: 3800, packages: [
    { name: "বেসিক", price: 2000, originalPrice: 3500, features: ["লোগো ডিজাইন", "৩টি কনসেপ্ট", "২ রিভিশন"] },
    { name: "স্ট্যান্ডার্ড", price: 5000, originalPrice: 8000, features: ["ব্র্যান্ডিং প্যাকেজ", "লোগো+বিজনেস কার্ড+লেটারহেড", "৫ রিভিশন"] },
    { name: "প্রিমিয়াম", price: 15000, originalPrice: 22000, features: ["ফুল ব্র্যান্ড কিট", "সোশ্যাল মিডিয়া টেমপ্লেট", "আনলিমিটেড রিভিশন"] },
  ], reviews: [{ name: "মুনতাসির রহমান", rating: 5, date: "১৩ মার্চ ২০২৬", comment: "আমাদের কোম্পানির লোগো অসাধারণ হয়েছে।" }], features: ["প্রফেশনাল ডিজাইন", "সোর্স ফাইল", "আনলিমিটেড রিভিশন", "ফাস্ট ডেলিভারি"], availableCities: ["ঢাকা", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "বরিশাল", "রংপুর", "ময়মনসিংহ"] },
  { slug: "digital-marketing", title: "ডিজিটাল মার্কেটিং", titleEn: "Digital Marketing", description: "সোশ্যাল মিডিয়া মার্কেটিং, Google Ads, Facebook Ads ও কন্টেন্ট মার্কেটিং।", image: "/images/placeholder.svg", rating: 4.6, totalReviews: 380, totalOrders: 1800, packages: [
    { name: "বেসিক", price: 5000, originalPrice: 8000, features: ["সোশ্যাল মিডিয়া ম্যানেজমেন্ট", "মাসে ১৫ পোস্ট", "বেসিক রিপোর্ট"] },
    { name: "স্ট্যান্ডার্ড", price: 15000, originalPrice: 22000, features: ["Facebook+Instagram Ads", "মাসে ৩০ পোস্ট", "বিস্তারিত অ্যানালিটিক্স"] },
    { name: "প্রিমিয়াম", price: 35000, originalPrice: 50000, features: ["Google+FB+Insta", "SEO+SEM", "ডেডিকেটেড ম্যানেজার", "মাসিক রিপোর্ট"] },
  ], reviews: [{ name: "সাকিব হাসান", rating: 5, date: "১০ মার্চ ২০২৬", comment: "৩ মাসে আমাদের পেজের ফলোয়ার ৫ গুণ বেড়েছে।" }], features: ["টার্গেটেড অ্যাডস", "কন্টেন্ট ক্রিয়েশন", "অ্যানালিটিক্স", "ROI ট্র্যাকিং"], availableCities: ["ঢাকা", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "বরিশাল", "রংপুর", "ময়মনসিংহ"] },
  { slug: "computer-repair", title: "কম্পিউটার রিপেয়ার", titleEn: "Computer Repair", description: "ডেস্কটপ ও ল্যাপটপ রিপেয়ার, আপগ্রেড, ভাইরাস রিমুভাল ও ডেটা রিকভারি।", image: "/images/placeholder.svg", rating: 4.6, totalReviews: 520, totalOrders: 3200, packages: [
    { name: "ডায়াগনসিস", price: 300, originalPrice: 500, features: ["সমস্যা চিহ্নিতকরণ", "হোম ভিজিট", "ফ্রি কনসালটেশন"] },
    { name: "বেসিক রিপেয়ার", price: 1000, originalPrice: 1500, features: ["সফটওয়্যার ইস্যু", "OS ইনস্টল", "ভাইরাস রিমুভাল"] },
    { name: "হার্ডওয়্যার রিপেয়ার", price: 2500, originalPrice: 4000, features: ["হার্ডওয়্যার ফিক্স", "পার্টস রিপ্লেস", "৩০ দিন ওয়ারেন্টি"] },
  ], reviews: [{ name: "নাজমুস সাকিব", rating: 5, date: "১১ মার্চ ২০২৬", comment: "ল্যাপটপের স্ক্রিন বদলে দিয়েছে। কাজ খুব ভালো।" }], features: ["হোম সার্ভিস", "ওয়ারেন্টি", "অরিজিনাল পার্টস", "দ্রুত সার্ভিস"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী"] },
  { slug: "data-recovery", title: "ডেটা রিকভারি", titleEn: "Data Recovery", description: "হারানো বা ডিলিট হওয়া ডেটা পুনরুদ্ধার। হার্ড ড্রাইভ, পেনড্রাইভ, মেমরি কার্ড।", image: "/images/placeholder.svg", rating: 4.7, totalReviews: 280, totalOrders: 1500, packages: [
    { name: "বেসিক", price: 1500, originalPrice: 2500, features: ["সফটওয়্যার রিকভারি", "পেনড্রাইভ/SD কার্ড", "২৪ ঘণ্টায়"] },
    { name: "স্ট্যান্ডার্ড", price: 3000, originalPrice: 5000, features: ["হার্ড ড্রাইভ", "ল্যাপটপ/ডেস্কটপ", "৪৮ ঘণ্টায়"] },
    { name: "অ্যাডভান্সড", price: 8000, originalPrice: 12000, features: ["ফিজিক্যাল ড্যামেজ", "RAID রিকভারি", "ক্লিনরুম সার্ভিস"] },
  ], reviews: [{ name: "ফারুক আহমেদ", rating: 5, date: "৮ মার্চ ২০২৬", comment: "মনে হয়েছিল সব হারিয়ে গেছে কিন্তু ৯৫% ডেটা ফিরে পেয়েছি।" }], features: ["ফ্রি ডায়াগনসিস", "নো ডেটা নো চার্জ", "গোপনীয়তা নিশ্চিত", "এক্সপার্ট টিম"], availableCities: ["ঢাকা", "চট্টগ্রাম"] },
  { slug: "networking", title: "নেটওয়ার্কিং", titleEn: "Networking", description: "অফিস ও বাসার নেটওয়ার্ক সেটআপ। WiFi, LAN, সার্ভার কনফিগারেশন।", image: "/images/placeholder.svg", rating: 4.5, totalReviews: 320, totalOrders: 1800, packages: [
    { name: "হোম WiFi", price: 1000, originalPrice: 1500, features: ["রাউটার সেটআপ", "WiFi অপটিমাইজ", "সিকিউরিটি সেটআপ"] },
    { name: "অফিস নেটওয়ার্ক", price: 5000, originalPrice: 8000, features: ["LAN সেটআপ", "১০ পয়েন্ট পর্যন্ত", "ফায়ারওয়াল"] },
    { name: "এন্টারপ্রাইজ", price: 15000, originalPrice: 25000, features: ["সার্ভার সেটআপ", "VPN", "ফুল ম্যানেজমেন্ট"] },
  ], reviews: [{ name: "রাফি ইসলাম", rating: 4, date: "৯ মার্চ ২০২৬", comment: "অফিসের নেটওয়ার্ক সেটআপ দারুণ হয়েছে।" }], features: ["প্রফেশনাল সেটআপ", "সিকিউরিটি", "মেইনটেন্যান্স", "২৪/৭ সাপোর্ট"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী"] },
  { slug: "software-development", title: "সফটওয়্যার ডেভেলপমেন্ট", titleEn: "Software Development", description: "কাস্টম সফটওয়্যার, মোবাইল অ্যাপ, ERP ও ম্যানেজমেন্ট সিস্টেম ডেভেলপমেন্ট।", image: "/images/placeholder.svg", rating: 4.8, totalReviews: 220, totalOrders: 850, packages: [
    { name: "বেসিক অ্যাপ", price: 30000, originalPrice: 50000, features: ["সিঙ্গেল প্ল্যাটফর্ম", "বেসিক ফিচার", "৩ মাস সাপোর্ট"] },
    { name: "স্ট্যান্ডার্ড", price: 80000, originalPrice: 120000, features: ["iOS+Android", "অ্যাডমিন প্যানেল", "API ইন্টিগ্রেশন"] },
    { name: "এন্টারপ্রাইজ", price: 200000, originalPrice: 300000, features: ["ফুল কাস্টম", "ERP/CRM", "১ বছর সাপোর্ট", "ট্রেনিং"] },
  ], reviews: [{ name: "ইমরান হোসেন", rating: 5, date: "১২ মার্চ ২০২৬", comment: "আমাদের ইনভেন্টরি সফটওয়্যার দারুণ কাজ করছে।" }], features: ["কাস্টম ডেভেলপমেন্ট", "স্কেলেবল", "সিকিউর", "ডেডিকেটেড টিম"], availableCities: ["ঢাকা", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট"] },
  { slug: "seo-service", title: "SEO সার্ভিস", titleEn: "SEO Service", description: "সার্চ ইঞ্জিন অপটিমাইজেশন। গুগলে আপনার ওয়েবসাইটকে টপে আনুন।", image: "/images/placeholder.svg", rating: 4.6, totalReviews: 280, totalOrders: 1200, packages: [
    { name: "বেসিক SEO", price: 5000, originalPrice: 8000, features: ["কিওয়ার্ড রিসার্চ", "অন-পেজ SEO", "মাসিক রিপোর্ট"] },
    { name: "স্ট্যান্ডার্ড", price: 12000, originalPrice: 18000, features: ["অন-পেজ+অফ-পেজ", "ব্যাকলিংক বিল্ডিং", "কন্টেন্ট অপটিমাইজ"] },
    { name: "প্রিমিয়াম", price: 25000, originalPrice: 40000, features: ["ফুল SEO অডিট", "কম্পিটিটর অ্যানালাইসিস", "গুগল অ্যাডস", "ডেডিকেটেড ম্যানেজার"] },
  ], reviews: [{ name: "তৌহিদ বিন জামিল", rating: 5, date: "১০ মার্চ ২০২৬", comment: "৬ মাসে গুগলের প্রথম পেজে এসেছে আমাদের সাইট।" }], features: ["কিওয়ার্ড রিসার্চ", "অন-পেজ SEO", "ব্যাকলিংক", "রিপোর্টিং"], availableCities: ["ঢাকা", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "বরিশাল", "রংপুর", "ময়মনসিংহ"] },
  { slug: "cyber-security", title: "সাইবার সিকিউরিটি", titleEn: "Cyber Security", description: "ওয়েবসাইট, সার্ভার ও নেটওয়ার্ক সিকিউরিটি অডিট ও প্রোটেকশন।", image: "/images/placeholder.svg", rating: 4.7, totalReviews: 180, totalOrders: 650, packages: [
    { name: "সিকিউরিটি অডিট", price: 5000, originalPrice: 8000, features: ["ভালনারেবিলিটি স্ক্যান", "রিপোর্ট", "রিকমেন্ডেশন"] },
    { name: "প্রোটেকশন", price: 15000, originalPrice: 22000, features: ["ফায়ারওয়াল সেটআপ", "ম্যালওয়্যার রিমুভাল", "SSL সেটআপ"] },
    { name: "এন্টারপ্রাইজ", price: 50000, originalPrice: 80000, features: ["পেনিট্রেশন টেস্টিং", "SOC মনিটরিং", "ইনসিডেন্ট রেসপন্স"] },
  ], reviews: [{ name: "নাফিস আহমেদ", rating: 5, date: "৭ মার্চ ২০২৬", comment: "সাইটের সিকিউরিটি নিয়ে এখন নিশ্চিন্ত।" }], features: ["ভালনারেবিলিটি স্ক্যান", "ম্যালওয়্যার প্রোটেকশন", "২৪/৭ মনিটরিং", "ইনসিডেন্ট রেসপন্স"], availableCities: ["ঢাকা", "চট্টগ্রাম"] },
  { slug: "ui-ux-design", title: "UI/UX ডিজাইন", titleEn: "UI/UX Design", description: "ইউজার ইন্টারফেস ও ইউজার এক্সপেরিয়েন্স ডিজাইন। অ্যাপ ও ওয়েব।", image: "/images/placeholder.svg", rating: 4.7, totalReviews: 250, totalOrders: 1100, packages: [
    { name: "বেসিক", price: 8000, originalPrice: 12000, features: ["ওয়্যারফ্রেম", "৫ স্ক্রিন", "Figma ফাইল"] },
    { name: "স্ট্যান্ডার্ড", price: 20000, originalPrice: 30000, features: ["ফুল UI ডিজাইন", "১৫+ স্ক্রিন", "প্রোটোটাইপ"] },
    { name: "প্রিমিয়াম", price: 50000, originalPrice: 75000, features: ["UX রিসার্চ", "ডিজাইন সিস্টেম", "ইন্টারেক্টিভ প্রোটোটাইপ"] },
  ], reviews: [{ name: "আবির হোসেন", rating: 5, date: "১১ মার্চ ২০২৬", comment: "অ্যাপের UI অসাধারণ হয়েছে। ইউজাররা খুব পছন্দ করেছে।" }], features: ["Figma/Sketch", "প্রোটোটাইপিং", "ইউজার টেস্টিং", "ডিজাইন সিস্টেম"], availableCities: ["ঢাকা", "চট্টগ্রাম", "রাজশাহী", "সিলেট"] },
  { slug: "domain-hosting", title: "ডোমেইন ও হোস্টিং", titleEn: "Domain & Hosting", description: "ডোমেইন রেজিস্ট্রেশন, ওয়েব হোস্টিং, ইমেইল হোস্টিং ও SSL সার্টিফিকেট।", image: "/images/placeholder.svg", rating: 4.5, totalReviews: 420, totalOrders: 2500, packages: [
    { name: "বেসিক", price: 2000, originalPrice: 3000, features: [".com ডোমেইন", "১ GB হোস্টিং", "SSL ফ্রি"] },
    { name: "স্ট্যান্ডার্ড", price: 5000, originalPrice: 8000, features: ["ডোমেইন+১০ GB", "ইমেইল হোস্টিং", "ডেইলি ব্যাকআপ"] },
    { name: "বিজনেস", price: 12000, originalPrice: 18000, features: ["আনলিমিটেড হোস্টিং", "VPS", "ডেডিকেটেড IP", "সাপোর্ট"] },
  ], reviews: [{ name: "কাজী ইমরান", rating: 4, date: "৯ মার্চ ২০২৬", comment: "হোস্টিং স্পিড দারুণ। ডাউনটাইম নেই।" }], features: ["৯৯.৯% আপটাইম", "SSL ফ্রি", "ডেইলি ব্যাকআপ", "২৪/৭ সাপোর্ট"], availableCities: ["ঢাকা", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "বরিশাল", "রংপুর", "ময়মনসিংহ"] },

  // --- Event Management ---
  { slug: "wedding-planning", title: "বিয়ের প্ল্যানিং", titleEn: "Wedding Planning", description: "সম্পূর্ণ বিয়ের আয়োজন। ভেন্যু, ক্যাটারিং, ডেকোরেশন সব এক প্যাকেজে।", image: "/images/placeholder.svg", rating: 4.8, totalReviews: 350, totalOrders: 1200, packages: [
    { name: "বেসিক", price: 50000, originalPrice: 75000, features: ["ভেন্যু বুকিং", "বেসিক ডেকোরেশন", "ক্যাটারিং ১০০ জন"] },
    { name: "স্ট্যান্ডার্ড", price: 150000, originalPrice: 200000, features: ["প্রিমিয়াম ভেন্যু", "থিম ডেকোরেশন", "ক্যাটারিং ৩০০ জন", "ফটোগ্রাফি"] },
    { name: "রয়্যাল", price: 500000, originalPrice: 700000, features: ["লাক্সারি ভেন্যু", "গ্র্যান্ড ডেকোরেশন", "৫০০+ গেস্ট", "ভিডিও+ফটো", "এন্টারটেইনমেন্ট"] },
  ], reviews: [{ name: "মেহজাবিন চৌধুরী", rating: 5, date: "১৫ মার্চ ২০২৬", comment: "আমাদের বিয়েটা রূপকথার মতো সুন্দর হয়েছিল।" }], features: ["ওয়ান-স্টপ সলিউশন", "থিম ডেকোরেশন", "এক্সপার্ট প্ল্যানার", "বাজেট ম্যানেজমেন্ট"], availableCities: ["ঢাকা", "গাজীপুর", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট"] },
  { slug: "wedding-catering", title: "বিয়ের ক্যাটারিং", titleEn: "Wedding Catering", description: "বিয়ের অনুষ্ঠানে প্রফেশনাল ক্যাটারিং সার্ভিস। বাংলাদেশি ও ইন্টারন্যাশনাল মেনু।", image: "/images/placeholder.svg", rating: 4.7, totalReviews: 480, totalOrders: 2200, packages: [
    { name: "বেসিক", price: 350, originalPrice: 500, features: ["প্রতি প্লেট", "৫ আইটেম", "সার্ভিং স্টাফ"] },
    { name: "স্ট্যান্ডার্ড", price: 550, originalPrice: 800, features: ["প্রতি প্লেট", "৮ আইটেম", "বুফে সেটআপ", "ড্রিংকস"] },
    { name: "প্রিমিয়াম", price: 1000, originalPrice: 1500, features: ["প্রতি প্লেট", "১২+ আইটেম", "লাইভ কুকিং", "কাস্টম মেনু"] },
  ], reviews: [{ name: "রাশেদ খান", rating: 5, date: "১২ মার্চ ২০২৬", comment: "খাবারের মান ও সার্ভিং দুটোই চমৎকার ছিল।" }], features: ["কাস্টম মেনু", "বুফে/প্লেট সার্ভিং", "সার্ভিং স্টাফ", "হাইজিনিক"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট"] },
  { slug: "wedding-photography", title: "ওয়েডিং ফটোগ্রাফি", titleEn: "Wedding Photography", description: "বিয়ের দিনের মূল্যবান মুহূর্তগুলো ধরে রাখুন প্রফেশনাল ফটোগ্রাফির মাধ্যমে।", image: "/images/placeholder.svg", rating: 4.8, totalReviews: 520, totalOrders: 2800, packages: [
    { name: "বেসিক", price: 15000, originalPrice: 25000, features: ["১ ফটোগ্রাফার", "৪ ঘণ্টা", "২০০+ ফটো", "অনলাইন গ্যালারি"] },
    { name: "স্ট্যান্ডার্ড", price: 35000, originalPrice: 50000, features: ["২ ফটোগ্রাফার", "ফুল ডে", "৫০০+ ফটো", "অ্যালবাম"] },
    { name: "সিনেমাটিক", price: 80000, originalPrice: 120000, features: ["ফটো+ভিডিও টিম", "ড্রোন শট", "সিনেমাটিক ফিল্ম", "প্রিমিয়াম অ্যালবাম"] },
  ], reviews: [{ name: "নুসরাত জাহান", rating: 5, date: "১৪ মার্চ ২০২৬", comment: "বিয়ের ছবিগুলো দেখে মনে হচ্ছে ম্যাগাজিনের শুটিং।" }], features: ["সিনেমাটিক ভিডিও", "ড্রোন শট", "প্রিমিয়াম অ্যালবাম", "অনলাইন গ্যালারি"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট"] },
  { slug: "birthday-event", title: "বার্থডে ইভেন্ট", titleEn: "Birthday Event", description: "জন্মদিনের অনুষ্ঠান আয়োজন। থিম ডেকোরেশন, কেক, এন্টারটেইনমেন্ট।", image: "/images/placeholder.svg", rating: 4.6, totalReviews: 380, totalOrders: 2100, packages: [
    { name: "বেসিক", price: 5000, originalPrice: 8000, features: ["বেসিক ডেকোরেশন", "বেলুন+ব্যানার", "ফটো জোন"] },
    { name: "স্ট্যান্ডার্ড", price: 15000, originalPrice: 22000, features: ["থিম ডেকোরেশন", "কেক+স্ন্যাকস", "ম্যাজিক শো"] },
    { name: "প্রিমিয়াম", price: 35000, originalPrice: 50000, features: ["গ্র্যান্ড থিম", "ফুল ক্যাটারিং", "DJ+লাইটিং", "ফটোগ্রাফি"] },
  ], reviews: [{ name: "তানিয়া আক্তার", rating: 5, date: "১০ মার্চ ২০২৬", comment: "বাচ্চার জন্মদিন অসাধারণ হয়েছিল।" }], features: ["থিম ডেকোরেশন", "কেক ও স্ন্যাকস", "এন্টারটেইনমেন্ট", "ফটোগ্রাফি"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী"] },
  { slug: "corporate-event", title: "কর্পোরেট ইভেন্ট", titleEn: "Corporate Event", description: "কোম্পানির সেমিনার, কনফারেন্স, প্রোডাক্ট লঞ্চ ও টিম বিল্ডিং ইভেন্ট।", image: "/images/placeholder.svg", rating: 4.7, totalReviews: 220, totalOrders: 800, packages: [
    { name: "ছোট ইভেন্ট", price: 25000, originalPrice: 40000, features: ["৫০ জন পর্যন্ত", "ভেন্যু+ডেকোরেশন", "সাউন্ড সিস্টেম"] },
    { name: "মিডিয়াম", price: 75000, originalPrice: 100000, features: ["২০০ জন", "স্টেজ+লাইটিং", "ক্যাটারিং", "ফটোগ্রাফি"] },
    { name: "গ্র্যান্ড", price: 200000, originalPrice: 300000, features: ["৫০০+ জন", "LED স্ক্রিন", "লাইভ স্ট্রিমিং", "ফুল ম্যানেজমেন্ট"] },
  ], reviews: [{ name: "ফারহান ইকবাল", rating: 5, date: "৯ মার্চ ২০২৬", comment: "কোম্পানির বার্ষিক সেমিনার দারুণ হয়েছিল।" }], features: ["ভেন্যু ম্যানেজমেন্ট", "AV সিস্টেম", "ক্যাটারিং", "ইভেন্ট কো-অর্ডিনেশন"], availableCities: ["ঢাকা", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট"] },
  { slug: "party-catering", title: "পার্টি ক্যাটারিং", titleEn: "Party Catering", description: "পার্টি ও ইভেন্টের জন্য প্রফেশনাল ক্যাটারিং সার্ভিস।", image: "/images/placeholder.svg", rating: 4.5, totalReviews: 350, totalOrders: 1800, packages: [
    { name: "বেসিক", price: 200, originalPrice: 300, features: ["প্রতি প্লেট", "৪ আইটেম", "সার্ভিং"] },
    { name: "স্ট্যান্ডার্ড", price: 400, originalPrice: 600, features: ["প্রতি প্লেট", "৭ আইটেম", "বুফে", "ড্রিংকস"] },
    { name: "প্রিমিয়াম", price: 700, originalPrice: 1000, features: ["প্রতি প্লেট", "১০+ আইটেম", "লাইভ কুকিং", "কাস্টম মেনু"] },
  ], reviews: [{ name: "শামীম আহমেদ", rating: 4, date: "১১ মার্চ ২০২৬", comment: "অফিস পার্টির ক্যাটারিং সবাই পছন্দ করেছে।" }], features: ["কাস্টম মেনু", "প্রফেশনাল সার্ভিং", "হাইজিনিক", "সময়মতো ডেলিভারি"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী"] },
  { slug: "stage-decoration", title: "স্টেজ ডেকোরেশন", titleEn: "Stage Decoration", description: "বিয়ে, কনসার্ট, কর্পোরেট ইভেন্টের জন্য প্রফেশনাল স্টেজ ডেকোরেশন।", image: "/images/placeholder.svg", rating: 4.7, totalReviews: 280, totalOrders: 1500, packages: [
    { name: "বেসিক", price: 15000, originalPrice: 25000, features: ["ফ্লাওয়ার ডেকোর", "ব্যাকড্রপ", "লাইটিং"] },
    { name: "থিম ডেকোর", price: 40000, originalPrice: 60000, features: ["কাস্টম থিম", "LED লাইটিং", "ফ্যাব্রিক ডেকোর"] },
    { name: "গ্র্যান্ড ডেকোর", price: 100000, originalPrice: 150000, features: ["লাক্সারি ডিজাইন", "LED স্ক্রিন", "পাইরোটেকনিকস", "ফুল সেটআপ"] },
  ], reviews: [{ name: "নাজনীন সুলতানা", rating: 5, date: "১২ মার্চ ২০২৬", comment: "বিয়ের স্টেজ অসাধারণ হয়েছিল।" }], features: ["কাস্টম ডিজাইন", "LED লাইটিং", "ফ্লাওয়ার ডেকোর", "থিম বেইসড"], availableCities: ["ঢাকা", "গাজীপুর", "চট্টগ্রাম", "রাজশাহী", "সিলেট"] },
  { slug: "sound-lighting", title: "সাউন্ড ও লাইটিং", titleEn: "Sound & Lighting", description: "ইভেন্টের জন্য প্রফেশনাল সাউন্ড সিস্টেম ও লাইটিং সেটআপ।", image: "/images/placeholder.svg", rating: 4.6, totalReviews: 320, totalOrders: 1800, packages: [
    { name: "বেসিক", price: 8000, originalPrice: 12000, features: ["PA সিস্টেম", "২ স্পিকার", "বেসিক লাইটিং"] },
    { name: "স্ট্যান্ডার্ড", price: 20000, originalPrice: 30000, features: ["প্রফেশনাল সাউন্ড", "মুভিং লাইট", "মিক্সার", "ওয়্যারলেস মাইক"] },
    { name: "কনসার্ট গ্রেড", price: 60000, originalPrice: 90000, features: ["JBL/Bose সিস্টেম", "LED ওয়াল", "ফগ মেশিন", "টেকনিশিয়ান"] },
  ], reviews: [{ name: "রিয়াদ হাসান", rating: 5, date: "৮ মার্চ ২০২৬", comment: "কনসার্টের সাউন্ড কোয়ালিটি অসাধারণ ছিল।" }], features: ["প্রফেশনাল ইকুইপমেন্ট", "টেকনিশিয়ান সহ", "সাউন্ড চেক", "ফুল সেটআপ"], availableCities: ["ঢাকা", "গাজীপুর", "চট্টগ্রাম", "রাজশাহী", "সিলেট"] },
  { slug: "event-mc", title: "ইভেন্ট MC/হোস্ট", titleEn: "Event MC/Host", description: "ইভেন্ট উপস্থাপক ও MC সার্ভিস। বিয়ে, কর্পোরেট বা সাংস্কৃতিক অনুষ্ঠানের জন্য।", image: "/images/placeholder.svg", rating: 4.7, totalReviews: 220, totalOrders: 950, packages: [
    { name: "বেসিক MC", price: 5000, originalPrice: 8000, features: ["৩ ঘণ্টা", "ইভেন্ট পরিচালনা", "স্ক্রিপ্ট তৈরি"] },
    { name: "প্রফেশনাল", price: 15000, originalPrice: 22000, features: ["ফুল ডে", "দ্বিভাষিক", "অডিয়েন্স ইন্টারেকশন"] },
    { name: "সেলিব্রিটি MC", price: 50000, originalPrice: 80000, features: ["জনপ্রিয় MC", "ফুল প্রোডাকশন", "কাস্টম স্ক্রিপ্ট"] },
  ], reviews: [{ name: "তাসকিন আহমেদ", rating: 5, date: "৭ মার্চ ২০২৬", comment: "MC অসাধারণ পারফর্ম করেছে। অনুষ্ঠান জমে উঠেছিল।" }], features: ["অভিজ্ঞ MC", "স্ক্রিপ্ট রাইটিং", "দ্বিভাষিক", "অডিয়েন্স এনগেজমেন্ট"], availableCities: ["ঢাকা", "চট্টগ্রাম", "রাজশাহী", "সিলেট"] },
  { slug: "concert-cultural", title: "কনসার্ট ও সাংস্কৃতিক", titleEn: "Concert & Cultural", description: "কনসার্ট, সাংস্কৃতিক অনুষ্ঠান ও লাইভ পারফরম্যান্স আয়োজন।", image: "/images/placeholder.svg", rating: 4.7, totalReviews: 180, totalOrders: 600, packages: [
    { name: "ছোট ইভেন্ট", price: 50000, originalPrice: 75000, features: ["১০০ জন", "সাউন্ড+লাইট", "স্টেজ সেটআপ"] },
    { name: "মিডিয়াম", price: 200000, originalPrice: 300000, features: ["৫০০ জন", "আর্টিস্ট ম্যানেজমেন্ট", "ফুল প্রোডাকশন"] },
    { name: "গ্র্যান্ড", price: 500000, originalPrice: 800000, features: ["১০০০+ জন", "মাল্টি আর্টিস্ট", "LED+পাইরো", "লাইভ স্ট্রিমিং"] },
  ], reviews: [{ name: "সায়েম চৌধুরী", rating: 5, date: "১০ মার্চ ২০২৬", comment: "কনসার্টের আয়োজন দারুণ ছিল।" }], features: ["আর্টিস্ট বুকিং", "ফুল প্রোডাকশন", "সিকিউরিটি", "ক্রাউড ম্যানেজমেন্ট"], availableCities: ["ঢাকা", "চট্টগ্রাম", "রাজশাহী", "সিলেট"] },
  { slug: "fair-management", title: "মেলা পরিচালনা", titleEn: "Fair Management", description: "বাণিজ্য মেলা, বইমেলা, খাদ্য মেলা ইত্যাদির সম্পূর্ণ আয়োজন ও পরিচালনা।", image: "/images/placeholder.svg", rating: 4.6, totalReviews: 150, totalOrders: 450, packages: [
    { name: "ছোট মেলা", price: 100000, originalPrice: 150000, features: ["২০ স্টল", "ভেন্যু+ডেকোর", "গেট ম্যানেজমেন্ট"] },
    { name: "মাঝারি মেলা", price: 300000, originalPrice: 450000, features: ["৫০ স্টল", "স্টেজ+সাউন্ড", "সিকিউরিটি", "মার্কেটিং"] },
    { name: "গ্র্যান্ড মেলা", price: 800000, originalPrice: 1200000, features: ["১০০+ স্টল", "ফুল ইনফ্রাস্ট্রাকচার", "মিডিয়া কভারেজ", "স্পন্সরশিপ ম্যানেজমেন্ট"] },
  ], reviews: [{ name: "জাকির হোসেন", rating: 5, date: "১৩ মার্চ ২০২৬", comment: "খাদ্য মেলার আয়োজন চমৎকার হয়েছিল।" }], features: ["স্টল ম্যানেজমেন্ট", "সিকিউরিটি", "মার্কেটিং", "ফুল লজিস্টিক্স"], availableCities: ["ঢাকা", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট"] },

  // --- Media Production ---
  { slug: "drama-production", title: "নাটক প্রোডাকশন", titleEn: "Drama Production", description: "টেলিভিশন ও ওয়েব নাটক প্রোডাকশন সার্ভিস।", image: "/images/placeholder.svg", rating: 4.7, totalReviews: 120, totalOrders: 350, packages: [
    { name: "শর্ট ড্রামা", price: 50000, originalPrice: 80000, features: ["১৫-২০ মিনিট", "বেসিক প্রোডাকশন", "৩ দিন শুটিং"] },
    { name: "সিঙ্গেল এপিসোড", price: 150000, originalPrice: 220000, features: ["৪০-৫০ মিনিট", "প্রফেশনাল ক্রু", "পোস্ট প্রোডাকশন"] },
    { name: "সিরিজ", price: 500000, originalPrice: 750000, features: ["৫+ এপিসোড", "স্ক্রিপ্ট ডেভেলপমেন্ট", "ফুল প্রোডাকশন টিম"] },
  ], reviews: [{ name: "শাকিল আহমেদ", rating: 5, date: "১০ মার্চ ২০২৬", comment: "নাটকের কোয়ালিটি দারুণ ছিল।" }], features: ["স্ক্রিপ্ট রাইটিং", "প্রফেশনাল ক্রু", "পোস্ট প্রোডাকশন", "কাস্টিং সাপোর্ট"], availableCities: ["ঢাকা", "চট্টগ্রাম"] },
  { slug: "commercial-production", title: "কমার্শিয়াল প্রোডাকশন", titleEn: "Commercial Production", description: "টিভি কমার্শিয়াল, ব্র্যান্ড ভিডিও ও প্রোডাক্ট শুটিং।", image: "/images/placeholder.svg", rating: 4.8, totalReviews: 180, totalOrders: 650, packages: [
    { name: "সোশ্যাল মিডিয়া", price: 20000, originalPrice: 35000, features: ["৩০-৬০ সেকেন্ড", "মোবাইল অপটিমাইজড", "১ দিন শুটিং"] },
    { name: "TVC", price: 100000, originalPrice: 150000, features: ["৩০ সেকেন্ড TVC", "প্রফেশনাল ক্রু", "পোস্ট প্রোডাকশন"] },
    { name: "ব্র্যান্ড ফিল্ম", price: 300000, originalPrice: 450000, features: ["৩-৫ মিনিট", "সিনেমাটিক", "ড্রোন শট", "কালার গ্রেডিং"] },
  ], reviews: [{ name: "আরমান হক", rating: 5, date: "১৪ মার্চ ২০২৬", comment: "আমাদের প্রোডাক্টের TVC অসাধারণ হয়েছে।" }], features: ["সিনেমাটিক কোয়ালিটি", "প্রফেশনাল ক্রু", "কালার গ্রেডিং", "SFX"], availableCities: ["ঢাকা", "চট্টগ্রাম"] },
  { slug: "web-series", title: "ওয়েব সিরিজ", titleEn: "Web Series", description: "YouTube ও OTT প্ল্যাটফর্মের জন্য ওয়েব সিরিজ প্রোডাকশন।", image: "/images/placeholder.svg", rating: 4.7, totalReviews: 100, totalOrders: 250, packages: [
    { name: "পাইলট এপিসোড", price: 80000, originalPrice: 120000, features: ["১ এপিসোড", "৪K শুটিং", "পোস্ট প্রোডাকশন"] },
    { name: "মিনি সিরিজ", price: 300000, originalPrice: 450000, features: ["৩-৫ এপিসোড", "প্রফেশনাল কাস্ট", "মিউজিক"] },
    { name: "ফুল সিজন", price: 800000, originalPrice: 1200000, features: ["১০+ এপিসোড", "ফুল প্রোডাকশন", "মার্কেটিং সাপোর্ট"] },
  ], reviews: [{ name: "তানভীর মোকাম্মেল", rating: 5, date: "৮ মার্চ ২০২৬", comment: "ওয়েব সিরিজটি YouTube-এ ভাইরাল হয়েছে।" }], features: ["৪K শুটিং", "প্রফেশনাল কাস্ট", "VFX", "ডিস্ট্রিবিউশন সাপোর্ট"], availableCities: ["ঢাকা", "চট্টগ্রাম"] },
  { slug: "short-film", title: "শর্ট ফিল্ম", titleEn: "Short Film", description: "ক্রিয়েটিভ শর্ট ফিল্ম প্রোডাকশন। ফেস্টিভ্যাল সাবমিশন ও অনলাইন রিলিজ।", image: "/images/placeholder.svg", rating: 4.7, totalReviews: 150, totalOrders: 400, packages: [
    { name: "বেসিক", price: 30000, originalPrice: 50000, features: ["৫-১০ মিনিট", "বেসিক ক্রু", "পোস্ট প্রোডাকশন"] },
    { name: "স্ট্যান্ডার্ড", price: 80000, originalPrice: 120000, features: ["১০-২০ মিনিট", "সিনেমাটিক", "মিউজিক স্কোর"] },
    { name: "ফেস্টিভ্যাল গ্রেড", price: 200000, originalPrice: 300000, features: ["৪K HDR", "DCP ফরম্যাট", "সাবটাইটেল", "ফেস্টিভ্যাল সাবমিশন"] },
  ], reviews: [{ name: "রিদওয়ান ইসলাম", rating: 5, date: "৯ মার্চ ২০২৬", comment: "শর্ট ফিল্মটি ফিল্ম ফেস্টিভ্যালে নির্বাচিত হয়েছে।" }], features: ["ক্রিয়েটিভ ডিরেকশন", "সিনেমাটোগ্রাফি", "সাউন্ড ডিজাইন", "কালার গ্রেডিং"], availableCities: ["ঢাকা", "চট্টগ্রাম"] },
  { slug: "documentary", title: "ডকুমেন্টারি", titleEn: "Documentary", description: "ডকুমেন্টারি ফিল্ম প্রোডাকশন। সামাজিক, পরিবেশ, ইতিহাস বিষয়ক।", image: "/images/placeholder.svg", rating: 4.8, totalReviews: 90, totalOrders: 200, packages: [
    { name: "শর্ট ডক", price: 50000, originalPrice: 80000, features: ["১০-১৫ মিনিট", "রিসার্চ", "ইন্টারভিউ"] },
    { name: "মিড-লেংথ", price: 150000, originalPrice: 220000, features: ["৩০-৪৫ মিনিট", "মাল্টি লোকেশন", "ভয়েসওভার"] },
    { name: "ফিচার ডক", price: 400000, originalPrice: 600000, features: ["৬০+ মিনিট", "ইন্টারন্যাশনাল স্ট্যান্ডার্ড", "ফেস্টিভ্যাল সাবমিশন"] },
  ], reviews: [{ name: "শামিম চৌধুরী", rating: 5, date: "১১ মার্চ ২০২৬", comment: "ডকুমেন্টারি দারুণ হয়েছে।" }], features: ["রিসার্চ", "সিনেমাটোগ্রাফি", "ভয়েসওভার", "সাবটাইটেল"], availableCities: ["ঢাকা", "চট্টগ্রাম"] },
  { slug: "music-video", title: "মিউজিক ভিডিও", titleEn: "Music Video", description: "প্রফেশনাল মিউজিক ভিডিও প্রোডাকশন। পপ, রক, ক্লাসিক্যাল সব জনরায়।", image: "/images/placeholder.svg", rating: 4.7, totalReviews: 220, totalOrders: 800, packages: [
    { name: "বেসিক", price: 30000, originalPrice: 50000, features: ["লিরিক ভিডিও", "অ্যানিমেশন", "২ দিনে ডেলিভারি"] },
    { name: "পারফরম্যান্স", price: 80000, originalPrice: 120000, features: ["লাইভ শুটিং", "১ লোকেশন", "কালার গ্রেডিং"] },
    { name: "সিনেমাটিক", price: 200000, originalPrice: 300000, features: ["স্টোরি বেইসড", "মাল্টি লোকেশন", "VFX", "ড্রোন"] },
  ], reviews: [{ name: "আরিফ আজাদ", rating: 5, date: "১২ মার্চ ২০২৬", comment: "মিউজিক ভিডিওর কোয়ালিটি ইন্টারন্যাশনাল মানের।" }], features: ["৪K শুটিং", "কালার গ্রেডিং", "VFX", "মাল্টি লোকেশন"], availableCities: ["ঢাকা", "চট্টগ্রাম"] },
  { slug: "music-production", title: "মিউজিক প্রোডাকশন", titleEn: "Music Production", description: "গান রেকর্ডিং, মিক্সিং, মাস্টারিং ও মিউজিক কম্পোজিশন।", image: "/images/placeholder.svg", rating: 4.8, totalReviews: 180, totalOrders: 650, packages: [
    { name: "রেকর্ডিং", price: 5000, originalPrice: 8000, features: ["স্টুডিও রেকর্ডিং", "৩ ঘণ্টা", "বেসিক মিক্স"] },
    { name: "ফুল প্রোডাকশন", price: 20000, originalPrice: 30000, features: ["কম্পোজিশন", "রেকর্ডিং", "মিক্সিং+মাস্টারিং"] },
    { name: "অ্যালবাম", price: 80000, originalPrice: 120000, features: ["৮-১০ গান", "ফুল প্রোডাকশন", "আর্টওয়ার্ক", "ডিস্ট্রিবিউশন"] },
  ], reviews: [{ name: "শাফিন আহমেদ", rating: 5, date: "৭ মার্চ ২০২৬", comment: "গানের প্রোডাকশন কোয়ালিটি অসাধারণ।" }], features: ["প্রফেশনাল স্টুডিও", "মিক্সিং+মাস্টারিং", "কম্পোজিশন", "ডিস্ট্রিবিউশন"], availableCities: ["ঢাকা", "চট্টগ্রাম"] },
  { slug: "voice-artist", title: "ভয়েস আর্টিস্ট", titleEn: "Voice Artist", description: "ভয়েসওভার, ডাবিং, অডিওবুক ও IVR রেকর্ডিং সার্ভিস।", image: "/images/placeholder.svg", rating: 4.6, totalReviews: 250, totalOrders: 1200, packages: [
    { name: "শর্ট ভয়েসওভার", price: 2000, originalPrice: 3500, features: ["১ মিনিট পর্যন্ত", "২টি রিভিশন", "MP3/WAV"] },
    { name: "কমার্শিয়াল", price: 5000, originalPrice: 8000, features: ["৫ মিনিট", "প্রফেশনাল আর্টিস্ট", "ব্যাকগ্রাউন্ড মিউজিক"] },
    { name: "অডিওবুক", price: 15000, originalPrice: 22000, features: ["৩০+ মিনিট", "প্রুফলিস্টনিং", "মাস্টারিং"] },
  ], reviews: [{ name: "সুমন রায়", rating: 5, date: "৬ মার্চ ২০২৬", comment: "অসাধারণ ভয়েস। ক্লায়েন্ট খুব পছন্দ করেছে।" }], features: ["প্রফেশনাল আর্টিস্ট", "স্টুডিও রেকর্ডিং", "দ্রুত ডেলিভারি", "মাল্টি ল্যাঙ্গুয়েজ"], availableCities: ["ঢাকা", "চট্টগ্রাম", "রাজশাহী", "সিলেট"] },
  { slug: "product-photography", title: "প্রোডাক্ট ফটোগ্রাফি", titleEn: "Product Photography", description: "ই-কমার্স ও ক্যাটালগের জন্য প্রফেশনাল প্রোডাক্ট ফটোগ্রাফি।", image: "/images/placeholder.svg", rating: 4.7, totalReviews: 320, totalOrders: 1800, packages: [
    { name: "বেসিক", price: 100, originalPrice: 200, features: ["প্রতি প্রোডাক্ট", "হোয়াইট ব্যাকগ্রাউন্ড", "২ অ্যাঙ্গেল"] },
    { name: "স্ট্যান্ডার্ড", price: 300, originalPrice: 500, features: ["প্রতি প্রোডাক্ট", "৫ অ্যাঙ্গেল", "রিটাচিং", "মডেল শট"] },
    { name: "প্রিমিয়াম", price: 500, originalPrice: 800, features: ["লাইফস্টাইল শট", "৩৬০° ভিউ", "ভিডিও ক্লিপ", "সোশ্যাল মিডিয়া রেডি"] },
  ], reviews: [{ name: "রাফি চৌধুরী", rating: 5, date: "৯ মার্চ ২০২৬", comment: "প্রোডাক্ট ফটো অসাধারণ হয়েছে। সেলস বেড়েছে।" }], features: ["প্রফেশনাল স্টুডিও", "রিটাচিং", "দ্রুত ডেলিভারি", "ই-কমার্স রেডি"], availableCities: ["ঢাকা", "চট্টগ্রাম"] },

  // --- Education ---
  { slug: "home-tutor", title: "হোম টিউটর", titleEn: "Home Tutor", description: "যোগ্য ও অভিজ্ঞ হোম টিউটর সার্ভিস। সকল ক্লাস ও বিষয়ের জন্য।", image: "/images/placeholder.svg", rating: 4.6, totalReviews: 1200, totalOrders: 8500, packages: [
    { name: "প্রাইমারি", price: 3000, originalPrice: 4500, features: ["ক্লাস ১-৫", "সাপ্তাহিক ৩ দিন", "সকল বিষয়"] },
    { name: "হাই স্কুল", price: 5000, originalPrice: 7000, features: ["ক্লাস ৬-১০", "সাপ্তাহিক ৪ দিন", "SSC প্রিপারেশন"] },
    { name: "কলেজ/ভর্তি", price: 8000, originalPrice: 12000, features: ["HSC/ভর্তি পরীক্ষা", "সাপ্তাহিক ৫ দিন", "এক্সপার্ট টিউটর"] },
  ], reviews: [{ name: "নাসরিন জাহান", rating: 5, date: "১৪ মার্চ ২০২৬", comment: "ছেলের রেজাল্ট অনেক ভালো হয়েছে টিউটরের কল্যাণে।" }], features: ["ভেরিফাইড টিউটর", "ফ্রি ডেমো ক্লাস", "প্রগ্রেস রিপোর্ট", "রিপ্লেসমেন্ট"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট"] },
  { slug: "online-coaching", title: "অনলাইন কোচিং", titleEn: "Online Coaching", description: "ঘরে বসে অনলাইন কোচিং। লাইভ ক্লাস, রেকর্ডেড ভিডিও ও প্র্যাকটিস টেস্ট।", image: "/images/placeholder.svg", rating: 4.5, totalReviews: 850, totalOrders: 5500, packages: [
    { name: "মাসিক বেসিক", price: 1500, originalPrice: 2500, features: ["সাপ্তাহিক ৩ ক্লাস", "রেকর্ডেড ভিডিও", "অনলাইন নোট"] },
    { name: "মাসিক স্ট্যান্ডার্ড", price: 3000, originalPrice: 4500, features: ["সাপ্তাহিক ৫ ক্লাস", "মক টেস্ট", "ডাউট ক্লিয়ারিং"] },
    { name: "প্রিমিয়াম", price: 5000, originalPrice: 8000, features: ["আনলিমিটেড ক্লাস", "১:১ সেশন", "পার্সোনালাইজড প্ল্যান"] },
  ], reviews: [{ name: "ফারজানা আক্তার", rating: 5, date: "১২ মার্চ ২০২৬", comment: "অনলাইন ক্লাসের মান অনেক ভালো।" }], features: ["লাইভ ক্লাস", "রেকর্ডেড ভিডিও", "মক টেস্ট", "১:১ মেন্টরিং"], availableCities: ["ঢাকা", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "বরিশাল", "রংপুর", "ময়মনসিংহ"] },
  { slug: "quran-tutor", title: "কোরআন শিক্ষা", titleEn: "Quran Tutor", description: "অভিজ্ঞ হাফেজ/ক্বারী দ্বারা কোরআন শিক্ষা। তাজবিদ, হিফজ ও তাফসির।", image: "/images/placeholder.svg", rating: 4.8, totalReviews: 680, totalOrders: 4200, packages: [
    { name: "নাজেরা", price: 2000, originalPrice: 3000, features: ["কোরআন পড়া শেখা", "সাপ্তাহিক ৩ দিন", "তাজবিদ"] },
    { name: "হিফজ", price: 4000, originalPrice: 6000, features: ["মুখস্থ করা", "সাপ্তাহিক ৫ দিন", "প্রতিদিন ১ ঘণ্টা"] },
    { name: "তাফসির ও আরবি", price: 5000, originalPrice: 7500, features: ["অর্থসহ শিক্ষা", "আরবি ভাষা", "ইসলামিক স্টাডিজ"] },
  ], reviews: [{ name: "মুহাম্মদ আলী", rating: 5, date: "১০ মার্চ ২০২৬", comment: "উস্তাদ খুব ভালো পড়ান। বাচ্চারা সুন্দরভাবে শিখছে।" }], features: ["অভিজ্ঞ হাফেজ", "তাজবিদ শিক্ষা", "অনলাইন/অফলাইন", "শিশু ও প্রাপ্তবয়স্ক"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "বরিশাল", "রংপুর", "ময়মনসিংহ"] },

  // --- Employment ---
  { slug: "job-placement", title: "চাকরি প্রদান", titleEn: "Job Placement", description: "যোগ্য কর্মী নিয়োগ ও চাকরি প্রাপ্তিতে সহায়তা। কর্পোরেট ও ব্যক্তিগত।", image: "/images/placeholder.svg", rating: 4.5, totalReviews: 420, totalOrders: 2200, packages: [
    { name: "বেসিক সার্চ", price: 2000, originalPrice: 3500, features: ["CV তৈরি", "চাকরি মেচিং", "৫টি ইন্টারভিউ কল"] },
    { name: "প্রিমিয়াম", price: 5000, originalPrice: 8000, features: ["কাস্টম CV", "কোম্পানি রেফারেল", "ইন্টারভিউ কোচিং"] },
    { name: "এক্সিকিউটিভ", price: 15000, originalPrice: 22000, features: ["হেডহান্টিং", "স্যালারি নেগোসিয়েশন", "ক্যারিয়ার কনসাল্টিং"] },
  ], reviews: [{ name: "সাইফুল ইসলাম", rating: 5, date: "১৩ মার্চ ২০২৬", comment: "২ সপ্তাহের মধ্যে ভালো চাকরি পেয়েছি।" }], features: ["চাকরি মেচিং", "CV তৈরি", "ইন্টারভিউ কোচিং", "ক্যারিয়ার গাইডেন্স"], availableCities: ["ঢাকা", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট"] },
  { slug: "overseas-job", title: "বিদেশে চাকরি", titleEn: "Overseas Job", description: "বিদেশে কাজের সুযোগ। ভিসা প্রসেসিং, এজেন্সি সাপোর্ট ও ট্রেনিং।", image: "/images/placeholder.svg", rating: 4.4, totalReviews: 350, totalOrders: 1500, packages: [
    { name: "কনসালটেশন", price: 5000, originalPrice: 8000, features: ["দেশ ও কাজ নির্বাচন", "ডকুমেন্ট চেক", "গাইডেন্স"] },
    { name: "ভিসা প্রসেসিং", price: 25000, originalPrice: 40000, features: ["ভিসা অ্যাপ্লিকেশন", "ডকুমেন্ট তৈরি", "ইন্টারভিউ প্রস্তুতি"] },
    { name: "ফুল প্যাকেজ", price: 80000, originalPrice: 120000, features: ["ভিসা+ট্রেনিং", "ল্যাঙ্গুয়েজ কোর্স", "এয়ারপোর্ট অ্যাসিস্ট"] },
  ], reviews: [{ name: "রবিউল ইসলাম", rating: 4, date: "১০ মার্চ ২০২৬", comment: "সৌদি আরবে চাকরি পেতে সাহায্য করেছে।" }], features: ["ভিসা সাপোর্ট", "ট্রেনিং", "ল্যাঙ্গুয়েজ কোর্স", "এয়ারপোর্ট অ্যাসিস্ট"], availableCities: ["ঢাকা", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "বরিশাল"] },
  { slug: "skilled-worker", title: "দক্ষ শ্রমিক", titleEn: "Skilled Worker", description: "প্রশিক্ষিত ও দক্ষ শ্রমিক সরবরাহ। নির্মাণ, ফ্যাক্টরি ও শিল্প কাজের জন্য।", image: "/images/placeholder.svg", rating: 4.4, totalReviews: 280, totalOrders: 1600, packages: [
    { name: "দৈনিক", price: 800, originalPrice: 1200, features: ["প্রতি শ্রমিক/দিন", "ভেরিফাইড", "সুপারভাইজড"] },
    { name: "সাপ্তাহিক", price: 4500, originalPrice: 6500, features: ["৬ দিন", "দক্ষ শ্রমিক", "টুলস সহ"] },
    { name: "প্রজেক্ট ভিত্তিক", price: 15000, originalPrice: 22000, features: ["টিম সাপ্লাই", "সুপারভাইজর সহ", "কোয়ালিটি চেক"] },
  ], reviews: [{ name: "আনিসুর রহমান", rating: 4, date: "৮ মার্চ ২০২৬", comment: "ফ্যাক্টরিতে দক্ষ শ্রমিক পাঠিয়েছে। কাজ ভালো।" }], features: ["ভেরিফাইড শ্রমিক", "দক্ষ ও প্রশিক্ষিত", "সুপারভাইজড", "রিপ্লেসমেন্ট"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা"] },
  { slug: "daily-labor", title: "দৈনিক শ্রমিক", titleEn: "Daily Labor", description: "দৈনিক ভিত্তিতে শ্রমিক সরবরাহ। বাসা, অফিস বা প্রজেক্টের কাজে।", image: "/images/placeholder.svg", rating: 4.3, totalReviews: 350, totalOrders: 2500, packages: [
    { name: "সিঙ্গেল", price: 600, originalPrice: 800, features: ["১ শ্রমিক", "৮ ঘণ্টা", "সাধারণ কাজ"] },
    { name: "টিম (৩ জন)", price: 1500, originalPrice: 2200, features: ["৩ শ্রমিক", "৮ ঘণ্টা", "লোডিং/আনলোডিং"] },
    { name: "বড় টিম", price: 3000, originalPrice: 4500, features: ["৫-১০ শ্রমিক", "সুপারভাইজর সহ", "ভারী কাজ"] },
  ], reviews: [{ name: "শরিফুল ইসলাম", rating: 4, date: "১১ মার্চ ২০২৬", comment: "বাসা শিফটিংয়ে শ্রমিকরা ভালো কাজ করেছে।" }], features: ["দ্রুত সরবরাহ", "ভেরিফাইড", "সুপারভাইজড", "সাশ্রয়ী"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট"] },

  // --- Legal ---
  { slug: "legal-consultation", title: "আইনি পরামর্শ", titleEn: "Legal Consultation", description: "অভিজ্ঞ আইনজীবীর কাছ থেকে আইনি পরামর্শ। পারিবারিক, ব্যবসায়িক ও ফৌজদারি।", image: "/images/placeholder.svg", rating: 4.7, totalReviews: 320, totalOrders: 1500, packages: [
    { name: "ফোন কনসালটেশন", price: 500, originalPrice: 800, features: ["৩০ মিনিট", "ফোনে পরামর্শ", "ফলো-আপ"] },
    { name: "অফিস ভিজিট", price: 2000, originalPrice: 3000, features: ["১ ঘণ্টা", "বিস্তারিত পরামর্শ", "ডকুমেন্ট রিভিউ"] },
    { name: "ফুল কেস", price: 10000, originalPrice: 15000, features: ["কেস হ্যান্ডলিং", "কোর্ট রিপ্রেজেন্টেশন", "ফলো-আপ"] },
  ], reviews: [{ name: "মোঃ হানিফ", rating: 5, date: "১৩ মার্চ ২০২৬", comment: "জমির মামলায় সঠিক পরামর্শ পেয়েছি।" }], features: ["অভিজ্ঞ আইনজীবী", "গোপনীয়তা", "ফলো-আপ", "অনলাইন/অফলাইন"], availableCities: ["ঢাকা", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "বরিশাল"] },
  { slug: "document-drafting", title: "ডকুমেন্ট ড্রাফটিং", titleEn: "Document Drafting", description: "আইনি ডকুমেন্ট তৈরি। চুক্তিপত্র, উকিলনামা, পাওয়ার অব অ্যাটর্নি।", image: "/images/placeholder.svg", rating: 4.6, totalReviews: 250, totalOrders: 1200, packages: [
    { name: "সিম্পল ডকুমেন্ট", price: 1500, originalPrice: 2500, features: ["চুক্তিপত্র/এফিডেভিট", "৪৮ ঘণ্টায়", "১ রিভিশন"] },
    { name: "বিজনেস ডকুমেন্ট", price: 5000, originalPrice: 8000, features: ["পার্টনারশিপ/কোম্পানি", "লিগ্যাল রিভিউ", "৩ রিভিশন"] },
    { name: "কমপ্লেক্স ড্রাফটিং", price: 15000, originalPrice: 22000, features: ["একাধিক ডকুমেন্ট", "নোটারি সহ", "আনলিমিটেড রিভিশন"] },
  ], reviews: [{ name: "আব্দুল্লাহ আল মামুন", rating: 5, date: "৯ মার্চ ২০২৬", comment: "ব্যবসার চুক্তিপত্র সুন্দরভাবে তৈরি করে দিয়েছে।" }], features: ["অভিজ্ঞ আইনজীবী", "দ্রুত ডেলিভারি", "নোটারি সার্ভিস", "গোপনীয়তা"], availableCities: ["ঢাকা", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট"] },

  // --- Security ---
  { slug: "security-guard", title: "সিকিউরিটি গার্ড", titleEn: "Security Guard", description: "প্রশিক্ষিত সিকিউরিটি গার্ড সার্ভিস। বাসা, অফিস, ফ্যাক্টরি ও ইভেন্টের জন্য।", image: "/images/placeholder.svg", rating: 4.5, totalReviews: 380, totalOrders: 2200, packages: [
    { name: "দৈনিক", price: 1200, originalPrice: 1800, features: ["প্রতি গার্ড/দিন", "১২ ঘণ্টা শিফট", "ইউনিফর্মড"] },
    { name: "মাসিক", price: 15000, originalPrice: 22000, features: ["প্রতি গার্ড/মাস", "ফুল টাইম", "সুপারভিশন"] },
    { name: "এলিট", price: 25000, originalPrice: 35000, features: ["প্রশিক্ষিত এক্স-আর্মি", "CCTV মনিটরিং", "এমার্জেন্সি রেসপন্স"] },
  ], reviews: [{ name: "জাবেদ আহমেদ", rating: 5, date: "১০ মার্চ ২০২৬", comment: "ফ্যাক্টরির সিকিউরিটি গার্ডরা খুব দায়িত্বশীল।" }], features: ["ভেরিফাইড গার্ড", "ইউনিফর্মড", "প্রশিক্ষিত", "২৪/৭ সার্ভিস"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা"] },
  { slug: "event-security", title: "ইভেন্ট সিকিউরিটি", titleEn: "Event Security", description: "ইভেন্ট, কনসার্ট ও জমায়েতের জন্য সিকিউরিটি ম্যানেজমেন্ট।", image: "/images/placeholder.svg", rating: 4.6, totalReviews: 180, totalOrders: 800, packages: [
    { name: "ছোট ইভেন্ট", price: 10000, originalPrice: 15000, features: ["৫ গার্ড", "৮ ঘণ্টা", "ক্রাউড কন্ট্রোল"] },
    { name: "মিডিয়াম", price: 25000, originalPrice: 35000, features: ["১০ গার্ড", "সুপারভাইজর", "ওয়াকিটকি"] },
    { name: "লার্জ ইভেন্ট", price: 60000, originalPrice: 90000, features: ["২০+ গার্ড", "কমান্ড সেন্টার", "CCTV", "এমার্জেন্সি প্ল্যান"] },
  ], reviews: [{ name: "ইকবাল হোসেন", rating: 5, date: "১১ মার্চ ২০২৬", comment: "কনসার্টে কোনো সমস্যা ছাড়াই সিকিউরিটি পরিচালিত হয়েছে।" }], features: ["ক্রাউড ম্যানেজমেন্ট", "VIP প্রোটেকশন", "ওয়াকিটকি", "এমার্জেন্সি প্ল্যান"], availableCities: ["ঢাকা", "চট্টগ্রাম", "রাজশাহী", "সিলেট"] },
  { slug: "fire-alarm-system", title: "ফায়ার অ্যালার্ম সিস্টেম", titleEn: "Fire Alarm System", description: "ফায়ার অ্যালার্ম, স্মোক ডিটেক্টর ও ফায়ার সেফটি সিস্টেম ইনস্টলেশন।", image: "/images/placeholder.svg", rating: 4.7, totalReviews: 220, totalOrders: 1200, packages: [
    { name: "হোম সেটআপ", price: 5000, originalPrice: 8000, features: ["স্মোক ডিটেক্টর", "২-৩ রুম", "ইনস্টলেশন"] },
    { name: "অফিস সেটআপ", price: 15000, originalPrice: 22000, features: ["ফুল অ্যালার্ম সিস্টেম", "৫-১০ জোন", "ইমার্জেন্সি লাইট"] },
    { name: "কমার্শিয়াল", price: 50000, originalPrice: 75000, features: ["ফুল ফায়ার সেফটি", "স্প্রিংকলার", "সেন্ট্রাল মনিটরিং", "সার্টিফিকেশন"] },
  ], reviews: [{ name: "মাসুদ রানা", rating: 5, date: "৭ মার্চ ২০২৬", comment: "ফ্যাক্টরিতে ফায়ার সেফটি সিস্টেম ইনস্টল করিয়েছি। দারুণ কাজ।" }], features: ["সার্টিফাইড ইনস্টলেশন", "রেগুলার মেইনটেন্যান্স", "২৪/৭ মনিটরিং", "ইমার্জেন্সি রেসপন্স"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী"] },
  { slug: "fire-extinguisher", title: "ফায়ার এক্সটিংগুইশার", titleEn: "Fire Extinguisher", description: "ফায়ার এক্সটিংগুইশার বিক্রি, রিফিলিং ও মেইনটেন্যান্স সার্ভিস।", image: "/images/placeholder.svg", rating: 4.5, totalReviews: 180, totalOrders: 950, packages: [
    { name: "নতুন কেনা", price: 2000, originalPrice: 3000, features: ["ABC পাউডার", "৫ কেজি", "ইনস্টলেশন ফ্রি"] },
    { name: "রিফিলিং", price: 800, originalPrice: 1200, features: ["রিফিল + চেকআপ", "পিকআপ ও ডেলিভারি", "সার্টিফিকেট"] },
    { name: "বাল্ক অর্ডার", price: 8000, originalPrice: 12000, features: ["৫+ ইউনিট", "ইনস্টলেশন", "ট্রেনিং", "বার্ষিক মেইনটেন্যান্স"] },
  ], reviews: [{ name: "হাবিব উল্লাহ", rating: 4, date: "৯ মার্চ ২০২৬", comment: "অফিসের সব ফায়ার এক্সটিংগুইশার রিফিল করিয়েছি।" }], features: ["BDS সার্টিফাইড", "রিফিলিং সার্ভিস", "ট্রেনিং", "বার্ষিক চেকআপ"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা"] },

  // --- Construction ---
  { slug: "building-construction", title: "ভবন নির্মাণ", titleEn: "Building Construction", description: "আবাসিক ও বাণিজ্যিক ভবন নির্মাণ সার্ভিস। ডিজাইন থেকে সমাপ্তি পর্যন্ত।", image: "/images/placeholder.svg", rating: 4.7, totalReviews: 180, totalOrders: 450, packages: [
    { name: "কনসালটেশন", price: 5000, originalPrice: 8000, features: ["সাইট ভিজিট", "এস্টিমেশন", "ডিজাইন পরামর্শ"] },
    { name: "ডিজাইন", price: 50000, originalPrice: 80000, features: ["আর্কিটেকচারাল ড্রয়িং", "স্ট্রাকচারাল ডিজাইন", "ইলেকট্রিক্যাল+প্লাম্বিং"] },
    { name: "ফুল কনস্ট্রাকশন", price: 1500, originalPrice: 2200, features: ["প্রতি স্কয়ার ফুট", "মটেরিয়াল+লেবার", "সুপারভিশন", "ওয়ারেন্টি"] },
  ], reviews: [{ name: "মোঃ ফারুক", rating: 5, date: "১৪ মার্চ ২০২৬", comment: "বাড়ি নির্মাণ সময়মতো সম্পন্ন হয়েছে। মান ভালো।" }], features: ["লাইসেন্সড কন্ট্রাক্টর", "কোয়ালিটি মটেরিয়াল", "সুপারভিশন", "ওয়ারেন্টি"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা"] },
  { slug: "renovation", title: "রেনোভেশন", titleEn: "Renovation", description: "বাসা ও অফিস রেনোভেশন। কিচেন, বাথরুম, ফ্লোরিং রিমডেলিং।", image: "/images/placeholder.svg", rating: 4.6, totalReviews: 320, totalOrders: 1800, packages: [
    { name: "ছোট রেনোভেশন", price: 20000, originalPrice: 30000, features: ["সিঙ্গেল রুম", "পেইন্টিং+টাইলস", "৫ দিনে সম্পন্ন"] },
    { name: "মাঝারি", price: 80000, originalPrice: 120000, features: ["কিচেন/বাথরুম", "ফুল রিমডেলিং", "ফিক্সচার+ফিটিংস"] },
    { name: "ফুল হোম", price: 300000, originalPrice: 450000, features: ["সম্পূর্ণ বাসা", "ডিজাইন+এক্সিকিউশন", "ইন্টেরিয়র সহ"] },
  ], reviews: [{ name: "তানিয়া সুলতানা", rating: 5, date: "১২ মার্চ ২০২৬", comment: "বাথরুম রেনোভেশন দারুণ হয়েছে। নতুনের মতো লাগছে।" }], features: ["ফ্রি এস্টিমেশন", "ডিজাইন সাপোর্ট", "কোয়ালিটি মটেরিয়াল", "টাইমলি ডেলিভারি"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী"] },
  { slug: "lift-installation", title: "লিফট ইনস্টলেশন", titleEn: "Lift Installation", description: "প্যাসেঞ্জার ও কার্গো লিফট ইনস্টলেশন সার্ভিস।", image: "/images/placeholder.svg", rating: 4.7, totalReviews: 120, totalOrders: 350, packages: [
    { name: "ছোট লিফট", price: 500000, originalPrice: 700000, features: ["৪ জন ক্যাপাসিটি", "৫ ফ্লোর পর্যন্ত", "ইনস্টলেশন+ওয়ারেন্টি"] },
    { name: "স্ট্যান্ডার্ড", price: 1000000, originalPrice: 1500000, features: ["৮ জন", "১০ ফ্লোর", "অটো ডোর", "ইমার্জেন্সি সিস্টেম"] },
    { name: "কমার্শিয়াল", price: 2500000, originalPrice: 3500000, features: ["১৫+ জন", "২০ ফ্লোর", "হাই স্পিড", "ফুল অটোমেশন"] },
  ], reviews: [{ name: "আজমল হোসেন", rating: 5, date: "৮ মার্চ ২০২৬", comment: "লিফট ইনস্টলেশন প্রফেশনালভাবে সম্পন্ন হয়েছে।" }], features: ["সার্টিফাইড ইনস্টলেশন", "সেফটি সিস্টেম", "ওয়ারেন্টি", "মেইনটেন্যান্স"], availableCities: ["ঢাকা", "চট্টগ্রাম"] },
  { slug: "lift-maintenance", title: "লিফট মেইনটেন্যান্স", titleEn: "Lift Maintenance", description: "লিফটের নিয়মিত রক্ষণাবেক্ষণ ও মেরামত সার্ভিস।", image: "/images/placeholder.svg", rating: 4.6, totalReviews: 180, totalOrders: 800, packages: [
    { name: "ত্রৈমাসিক", price: 5000, originalPrice: 8000, features: ["৩ মাসে ১ বার", "চেকআপ+ক্লিনিং", "রিপোর্ট"] },
    { name: "মাসিক", price: 8000, originalPrice: 12000, features: ["মাসিক চেকআপ", "মাইনর রিপেয়ার", "২৪/৭ ইমার্জেন্সি"] },
    { name: "বার্ষিক AMC", price: 60000, originalPrice: 90000, features: ["বার্ষিক চুক্তি", "আনলিমিটেড সার্ভিস", "পার্টস ডিসকাউন্ট", "প্রায়োরিটি সাপোর্ট"] },
  ], reviews: [{ name: "শাহেদ আলম", rating: 5, date: "১০ মার্চ ২০২৬", comment: "নিয়মিত মেইনটেন্যান্সের ফলে লিফট সবসময় ভালো চলছে।" }], features: ["সার্টিফাইড টেকনিশিয়ান", "২৪/৭ ইমার্জেন্সি", "পার্টস স্টক", "AMC সুবিধা"], availableCities: ["ঢাকা", "চট্টগ্রাম"] },
  { slug: "bathroom-waterproofing", title: "বাথরুম ওয়াটারপ্রুফিং", titleEn: "Bathroom Waterproofing", description: "বাথরুম, ছাদ ও বেসমেন্ট ওয়াটারপ্রুফিং সার্ভিস।", image: "/images/placeholder.svg", rating: 4.5, totalReviews: 250, totalOrders: 1400, packages: [
    { name: "ছোট বাথরুম", price: 5000, originalPrice: 8000, features: ["৫০ স্কয়ার ফুট পর্যন্ত", "প্রাইমার+কোটিং", "৫ বছর ওয়ারেন্টি"] },
    { name: "বড় বাথরুম", price: 10000, originalPrice: 15000, features: ["১০০ স্কয়ার ফুট", "প্রিমিয়াম মটেরিয়াল", "৭ বছর ওয়ারেন্টি"] },
    { name: "ছাদ ওয়াটারপ্রুফিং", price: 30000, originalPrice: 45000, features: ["৫০০ স্কয়ার ফুট", "হিট+ওয়াটারপ্রুফিং", "১০ বছর ওয়ারেন্টি"] },
  ], reviews: [{ name: "খোরশেদ আলম", rating: 5, date: "৭ মার্চ ২০২৬", comment: "বাথরুমের লিকেজ সমস্যা সম্পূর্ণ সমাধান হয়ে গেছে।" }], features: ["প্রিমিয়াম মটেরিয়াল", "লং টার্ম ওয়ারেন্টি", "প্রফেশনাল টিম", "ফ্রি ইন্সপেকশন"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী"] },

  // --- Appliance (additional) ---
  { slug: "fridge-service", title: "ফ্রিজ সার্ভিসিং", titleEn: "Fridge Service", description: "ফ্রিজ রিপেয়ার, গ্যাস রিফিল ও সার্ভিসিং। সকল ব্র্যান্ড।", image: "/images/placeholder.svg", rating: 4.6, totalReviews: 450, totalOrders: 2800, packages: [
    { name: "চেকআপ", price: 500, originalPrice: 800, features: ["সমস্যা চিহ্নিতকরণ", "হোম ভিজিট", "ফ্রি কনসালটেশন"] },
    { name: "সার্ভিসিং", price: 1500, originalPrice: 2200, features: ["গ্যাস রিফিল", "ক্লিনিং", "পারফরম্যান্স চেক"] },
    { name: "মেজর রিপেয়ার", price: 3500, originalPrice: 5000, features: ["কম্প্রেসর চেঞ্জ", "থার্মোস্ট্যাট", "৬ মাস ওয়ারেন্টি"] },
  ], reviews: [{ name: "মনিরুল ইসলাম", rating: 5, date: "১১ মার্চ ২০২৬", comment: "ফ্রিজের গ্যাস রিফিল করিয়েছি। এখন ভালো কাজ করছে।" }], features: ["সকল ব্র্যান্ড", "হোম সার্ভিস", "ওয়ারেন্টি", "অরিজিনাল পার্টস"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট"] },
  { slug: "generator-service", title: "জেনারেটর সার্ভিস", titleEn: "Generator Service", description: "জেনারেটর ইনস্টলেশন, সার্ভিসিং ও রিপেয়ার।", image: "/images/placeholder.svg", rating: 4.5, totalReviews: 220, totalOrders: 1200, packages: [
    { name: "সার্ভিসিং", price: 2000, originalPrice: 3000, features: ["তেল পরিবর্তন", "ফিল্টার চেক", "পারফরম্যান্স টেস্ট"] },
    { name: "রিপেয়ার", price: 5000, originalPrice: 8000, features: ["সমস্যা সমাধান", "পার্টস রিপ্লেস", "৩ মাস ওয়ারেন্টি"] },
    { name: "ইনস্টলেশন", price: 15000, originalPrice: 22000, features: ["নতুন ইনস্টল", "ওয়্যারিং", "ATS সেটআপ", "ট্রেনিং"] },
  ], reviews: [{ name: "জাহাঙ্গীর আলম", rating: 4, date: "৮ মার্চ ২০২৬", comment: "জেনারেটর সার্ভিসিং ভালো হয়েছে।" }], features: ["সকল ব্র্যান্ড", "ইমার্জেন্সি সার্ভিস", "ওয়ারেন্টি", "AMC সুবিধা"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম"] },
  { slug: "ips-ups-service", title: "IPS/UPS সার্ভিস", titleEn: "IPS/UPS Service", description: "IPS, UPS ও ব্যাটারি ইনস্টলেশন, রিপেয়ার ও মেইনটেন্যান্স।", image: "/images/placeholder.svg", rating: 4.5, totalReviews: 280, totalOrders: 1500, packages: [
    { name: "চেকআপ", price: 500, originalPrice: 800, features: ["সমস্যা চিহ্নিতকরণ", "ব্যাটারি টেস্ট", "ফ্রি কনসালটেশন"] },
    { name: "সার্ভিসিং", price: 1500, originalPrice: 2500, features: ["ক্লিনিং", "ব্যাটারি ওয়াটার", "কানেকশন চেক"] },
    { name: "ব্যাটারি রিপ্লেস", price: 5000, originalPrice: 7500, features: ["নতুন ব্যাটারি", "ইনস্টলেশন", "৬ মাস ওয়ারেন্টি"] },
  ], reviews: [{ name: "আকবর হোসেন", rating: 4, date: "৯ মার্চ ২০২৬", comment: "IPS-এর ব্যাটারি বদলে দিয়েছে। এখন ভালো ব্যাকআপ পাচ্ছি।" }], features: ["হোম সার্ভিস", "সকল ব্র্যান্ড", "ওয়ারেন্টি", "ফ্রি চেকআপ"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী"] },
  { slug: "mobile-battery", title: "মোবাইল ব্যাটারি", titleEn: "Mobile Battery", description: "মোবাইল ফোনের ব্যাটারি রিপ্লেসমেন্ট সার্ভিস।", image: "/images/placeholder.svg", rating: 4.5, totalReviews: 520, totalOrders: 3500, packages: [
    { name: "নরমাল ব্যাটারি", price: 800, originalPrice: 1200, features: ["কম্প্যাটিবল ব্যাটারি", "ইনস্টলেশন", "১ মাস ওয়ারেন্টি"] },
    { name: "অরিজিনাল", price: 2000, originalPrice: 3000, features: ["অরিজিনাল ব্যাটারি", "ইনস্টলেশন", "৬ মাস ওয়ারেন্টি"] },
    { name: "প্রিমিয়াম", price: 3500, originalPrice: 5000, features: ["হাই ক্যাপাসিটি", "iPhone/Samsung", "১ বছর ওয়ারেন্টি"] },
  ], reviews: [{ name: "তানিম হাসান", rating: 4, date: "১০ মার্চ ২০২৬", comment: "আইফোনের ব্যাটারি চেঞ্জ করিয়েছি। এখন সারাদিন চলে।" }], features: ["৩০ মিনিটে সার্ভিস", "ওয়ারেন্টি", "হোম সার্ভিস", "সকল ব্র্যান্ড"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী"] },
  { slug: "mobile-screen", title: "মোবাইল স্ক্রিন", titleEn: "Mobile Screen", description: "মোবাইল ফোনের ভাঙা ডিসপ্লে রিপ্লেসমেন্ট সার্ভিস।", image: "/images/placeholder.svg", rating: 4.6, totalReviews: 680, totalOrders: 4500, packages: [
    { name: "কপি স্ক্রিন", price: 1500, originalPrice: 2500, features: ["কম্প্যাটিবল স্ক্রিন", "ইনস্টলেশন", "১ মাস ওয়ারেন্টি"] },
    { name: "অরিজিনাল", price: 4000, originalPrice: 6000, features: ["OEM স্ক্রিন", "টাচ+ডিসপ্লে", "৬ মাস ওয়ারেন্টি"] },
    { name: "OLED/AMOLED", price: 8000, originalPrice: 12000, features: ["অরিজিনাল OLED", "Samsung/iPhone", "১ বছর ওয়ারেন্টি"] },
  ], reviews: [{ name: "জুবায়ের আহমেদ", rating: 5, date: "১২ মার্চ ২০২৬", comment: "Samsung-এর স্ক্রিন চেঞ্জ করিয়েছি। নতুনের মতো হয়ে গেছে।" }], features: ["৪৫ মিনিটে সার্ভিস", "অরিজিনাল পার্টস", "ওয়ারেন্টি", "হোম সার্ভিস"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী"] },

  // --- Solar ---
  { slug: "solar-installation", title: "সোলার ইনস্টলেশন", titleEn: "Solar Installation", description: "সোলার প্যানেল ইনস্টলেশন সার্ভিস। বাসা, অফিস ও শিল্প প্রতিষ্ঠানের জন্য।", image: "/images/placeholder.svg", rating: 4.7, totalReviews: 280, totalOrders: 1200, packages: [
    { name: "হোম বেসিক", price: 35000, originalPrice: 50000, features: ["৫০০W প্যানেল", "ব্যাটারি+ইনভার্টার", "ইনস্টলেশন"] },
    { name: "হোম স্ট্যান্ডার্ড", price: 80000, originalPrice: 120000, features: ["১ KW", "লিথিয়াম ব্যাটারি", "নেট মিটারিং"] },
    { name: "কমার্শিয়াল", price: 300000, originalPrice: 450000, features: ["৫ KW+", "গ্রিড টাই", "মনিটরিং সিস্টেম", "১০ বছর ওয়ারেন্টি"] },
  ], reviews: [{ name: "আবু সাঈদ", rating: 5, date: "১৩ মার্চ ২০২৬", comment: "সোলার সিস্টেম লাগানোর পর বিদ্যুৎ বিল অনেক কমেছে।" }], features: ["টায়ার-১ প্যানেল", "লং ওয়ারেন্টি", "নেট মিটারিং", "মনিটরিং অ্যাপ"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট"] },
  { slug: "solar-maintenance", title: "সোলার মেইনটেন্যান্স", titleEn: "Solar Maintenance", description: "সোলার প্যানেল ক্লিনিং, চেকআপ ও রিপেয়ার সার্ভিস।", image: "/images/placeholder.svg", rating: 4.5, totalReviews: 180, totalOrders: 800, packages: [
    { name: "ক্লিনিং", price: 1500, originalPrice: 2500, features: ["প্যানেল ক্লিনিং", "পারফরম্যান্স চেক", "রিপোর্ট"] },
    { name: "চেকআপ+রিপেয়ার", price: 3000, originalPrice: 5000, features: ["ফুল চেকআপ", "মাইনর রিপেয়ার", "ওয়্যারিং চেক"] },
    { name: "বার্ষিক AMC", price: 8000, originalPrice: 12000, features: ["ত্রৈমাসিক ভিজিট", "ক্লিনিং+চেকআপ", "প্রায়োরিটি সাপোর্ট"] },
  ], reviews: [{ name: "মতিউর রহমান", rating: 4, date: "৮ মার্চ ২০২৬", comment: "মেইনটেন্যান্সের পর সোলার আউটপুট বেড়েছে।" }], features: ["পারফরম্যান্স অপটিমাইজ", "ক্লিনিং", "রিপেয়ার", "AMC সুবিধা"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী"] },

  // --- Agriculture ---
  { slug: "agri-consulting", title: "কৃষি পরামর্শ", titleEn: "Agri Consulting", description: "কৃষি বিশেষজ্ঞদের পরামর্শ। ফসল, মাটি, সার ও কীটনাশক।", image: "/images/placeholder.svg", rating: 4.5, totalReviews: 220, totalOrders: 1100, packages: [
    { name: "ফোন পরামর্শ", price: 300, originalPrice: 500, features: ["৩০ মিনিট", "ফসল সমস্যা", "ফলো-আপ"] },
    { name: "ফিল্ড ভিজিট", price: 2000, originalPrice: 3000, features: ["সরেজমিনে পরিদর্শন", "মাটি পরীক্ষা", "রিপোর্ট"] },
    { name: "সিজনাল প্ল্যান", price: 5000, originalPrice: 8000, features: ["সিজনভিত্তিক পরিকল্পনা", "সার ও সেচ গাইড", "নিয়মিত ফলো-আপ"] },
  ], reviews: [{ name: "আব্দুস সালাম", rating: 5, date: "১০ মার্চ ২০২৬", comment: "কৃষি পরামর্শে ফলনে বড় পার্থক্য এসেছে।" }], features: ["অভিজ্ঞ কৃষিবিদ", "মাটি পরীক্ষা", "ফলো-আপ", "আধুনিক পদ্ধতি"], availableCities: ["ঢাকা", "গাজীপুর", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "বরিশাল", "রংপুর", "ময়মনসিংহ"] },
  { slug: "livestock-care", title: "প্রাণিসার্ভিস", titleEn: "Livestock Care", description: "গবাদি পশু ও পোল্ট্রির চিকিৎসা, টিকাদান ও পরামর্শ সার্ভিস।", image: "/images/placeholder.svg", rating: 4.5, totalReviews: 180, totalOrders: 900, packages: [
    { name: "চেকআপ", price: 500, originalPrice: 800, features: ["ভেটেরিনারি ভিজিট", "সাধারণ চেকআপ", "প্রেসক্রিপশন"] },
    { name: "টিকাদান", price: 300, originalPrice: 500, features: ["প্রতি প্রাণী", "ভ্যাকসিনেশন", "রেকর্ড কার্ড"] },
    { name: "ফার্ম ম্যানেজমেন্ট", price: 5000, originalPrice: 8000, features: ["মাসিক ভিজিট", "ফিড গাইড", "ডিজিজ প্রিভেনশন"] },
  ], reviews: [{ name: "মাসুদুর রহমান", rating: 4, date: "৯ মার্চ ২০২৬", comment: "গরুর চিকিৎসায় দ্রুত সার্ভিস পেয়েছি।" }], features: ["অভিজ্ঞ ভেটেরিনারি", "হোম ভিজিট", "ভ্যাকসিনেশন", "ফার্ম কনসাল্টিং"], availableCities: ["ঢাকা", "গাজীপুর", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "বরিশাল", "রংপুর"] },
  { slug: "garden-maintenance", title: "গার্ডেন মেইনটেন্যান্স", titleEn: "Garden Maintenance", description: "বাগান পরিচর্যা সার্ভিস। ছাদবাগান, লন ও ফুলের বাগান।", image: "/images/placeholder.svg", rating: 4.4, totalReviews: 280, totalOrders: 1500, packages: [
    { name: "সিঙ্গেল ভিজিট", price: 500, originalPrice: 800, features: ["ট্রিমিং", "পানি দেওয়া", "সার প্রয়োগ"] },
    { name: "মাসিক", price: 2000, originalPrice: 3000, features: ["সাপ্তাহিক ভিজিট", "ফুল কেয়ার", "কীটনাশক"] },
    { name: "ফুল সেটআপ", price: 8000, originalPrice: 12000, features: ["বাগান ডিজাইন", "গাছ লাগানো", "ইরিগেশন সেটআপ"] },
  ], reviews: [{ name: "রোকেয়া সুলতানা", rating: 5, date: "১১ মার্চ ২০২৬", comment: "ছাদবাগান অসাধারণ হয়েছে।" }], features: ["অভিজ্ঞ মালী", "অর্গানিক কেয়ার", "কীটনাশক", "ডিজাইন সাপোর্ট"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী"] },
  { slug: "landscape-design", title: "ল্যান্ডস্কেপ ডিজাইন", titleEn: "Landscape Design", description: "বাড়ি, অফিস ও রিসোর্টের জন্য ল্যান্ডস্কেপ ডিজাইন ও এক্সিকিউশন।", image: "/images/placeholder.svg", rating: 4.7, totalReviews: 150, totalOrders: 600, packages: [
    { name: "কনসাল্টেশন", price: 3000, originalPrice: 5000, features: ["সাইট ভিজিট", "ডিজাইন কনসেপ্ট", "কোটেশন"] },
    { name: "স্মল প্রজেক্ট", price: 25000, originalPrice: 40000, features: ["ছোট বাগান", "ওয়াকওয়ে", "লাইটিং"] },
    { name: "ফুল প্রজেক্ট", price: 100000, originalPrice: 150000, features: ["ফুল ল্যান্ডস্কেপ", "ওয়াটার ফিচার", "অটো ইরিগেশন", "মেইনটেন্যান্স"] },
  ], reviews: [{ name: "আরিফুল ইসলাম", rating: 5, date: "১৩ মার্চ ২০২৬", comment: "বাড়ির সামনের বাগান অসাধারণ হয়েছে।" }], features: ["৩D ডিজাইন", "প্ল্যান্ট সিলেকশন", "ইরিগেশন", "মেইনটেন্যান্স"], availableCities: ["ঢাকা", "চট্টগ্রাম", "রাজশাহী"] },

  // --- Travel ---
  { slug: "air-ticket", title: "এয়ার টিকেট", titleEn: "Air Ticket", description: "দেশীয় ও আন্তর্জাতিক এয়ার টিকেট বুকিং। সেরা দামে ফ্লাইট।", image: "/images/placeholder.svg", rating: 4.6, totalReviews: 520, totalOrders: 3500, packages: [
    { name: "ডোমেস্টিক", price: 500, originalPrice: 800, features: ["দেশীয় ফ্লাইট", "বেস্ট প্রাইস", "ই-টিকেট"] },
    { name: "ইন্টারন্যাশনাল", price: 1000, originalPrice: 1500, features: ["আন্তর্জাতিক ফ্লাইট", "ভিসা সাপোর্ট", "ট্রাভেল ইন্স্যুরেন্স"] },
    { name: "গ্রুপ বুকিং", price: 2000, originalPrice: 3000, features: ["১০+ জন", "স্পেশাল রেট", "ডেডিকেটেড এজেন্ট"] },
  ], reviews: [{ name: "কামাল হোসেন", rating: 5, date: "১২ মার্চ ২০২৬", comment: "সবচেয়ে কম দামে দুবাইয়ের টিকেট পেয়েছি।" }], features: ["বেস্ট প্রাইস", "ই-টিকেট", "২৪/৭ সাপোর্ট", "রিফান্ড সাপোর্ট"], availableCities: ["ঢাকা", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট"] },
  { slug: "visa-processing", title: "ভিসা প্রসেসিং", titleEn: "Visa Processing", description: "সকল দেশের ভিসা আবেদন ও প্রসেসিং সার্ভিস।", image: "/images/placeholder.svg", rating: 4.5, totalReviews: 380, totalOrders: 2200, packages: [
    { name: "ডকুমেন্ট চেক", price: 1000, originalPrice: 1500, features: ["ডকুমেন্ট রিভিউ", "চেকলিস্ট", "গাইডেন্স"] },
    { name: "ফুল প্রসেসিং", price: 5000, originalPrice: 8000, features: ["আবেদন তৈরি", "অ্যাপয়েন্টমেন্ট বুকিং", "ডকুমেন্ট সাবমিশন"] },
    { name: "প্রিমিয়াম", price: 15000, originalPrice: 22000, features: ["VIP প্রসেসিং", "ইন্টারভিউ কোচিং", "ট্রাভেল ইন্স্যুরেন্স", "ইমিগ্রেশন সাপোর্ট"] },
  ], reviews: [{ name: "শাহিন আলম", rating: 5, date: "৯ মার্চ ২০২৬", comment: "কানাডা ভিসা পেতে অনেক সাহায্য পেয়েছি।" }], features: ["সকল দেশ", "এক্সপার্ট গাইডেন্স", "ডকুমেন্ট সাপোর্ট", "ফলো-আপ"], availableCities: ["ঢাকা", "চট্টগ্রাম", "সিলেট"] },
  { slug: "tour-package", title: "ট্যুর প্যাকেজ", titleEn: "Tour Package", description: "দেশীয় ও আন্তর্জাতিক ট্যুর প্যাকেজ। হোটেল, ট্রান্সপোর্ট ও গাইড সহ।", image: "/images/placeholder.svg", rating: 4.7, totalReviews: 450, totalOrders: 2800, packages: [
    { name: "দেশীয় ট্যুর", price: 5000, originalPrice: 8000, features: ["প্রতি জন", "২ রাত ৩ দিন", "হোটেল+ট্রান্সপোর্ট"] },
    { name: "প্রিমিয়াম দেশীয়", price: 12000, originalPrice: 18000, features: ["প্রতি জন", "৩ রাত ৪ দিন", "রিসোর্ট+গাইড+মিল"] },
    { name: "ইন্টারন্যাশনাল", price: 50000, originalPrice: 75000, features: ["প্রতি জন", "৫ রাত ৬ দিন", "ফ্লাইট+হোটেল+ভিসা"] },
  ], reviews: [{ name: "নিশাত জাহান", rating: 5, date: "১৪ মার্চ ২০২৬", comment: "কক্সবাজার ট্যুর অসাধারণ ছিল। সব কিছু পারফেক্ট।" }], features: ["সব ইনক্লুডেড", "এক্সপার্ট গাইড", "হোটেল বুকিং", "ট্রান্সপোর্ট"], availableCities: ["ঢাকা", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "বরিশাল", "রংপুর"] },

  // --- Tailoring ---
  { slug: "ladies-tailoring", title: "লেডিস টেইলারিং", titleEn: "Ladies Tailoring", description: "লেডিস পোশাক সেলাই সার্ভিস। শাড়ি ব্লাউজ, সালোয়ার কামিজ, ওয়েস্টার্ন।", image: "/images/placeholder.svg", rating: 4.6, totalReviews: 450, totalOrders: 2800, packages: [
    { name: "বেসিক সেলাই", price: 500, originalPrice: 800, features: ["সালোয়ার কামিজ", "সিম্পল ডিজাইন", "৫ দিনে ডেলিভারি"] },
    { name: "ডিজাইনার", price: 1500, originalPrice: 2500, features: ["কাস্টম ডিজাইন", "এমব্রয়ডারি", "ফিটিং গ্যারান্টি"] },
    { name: "প্রিমিয়াম", price: 3000, originalPrice: 5000, features: ["বিয়ের পোশাক", "হেভি ওয়ার্ক", "একাধিক ফিটিং"] },
  ], reviews: [{ name: "নুসরাত ফারিয়া", rating: 5, date: "১১ মার্চ ২০২৬", comment: "বিয়ের পোশাক অসাধারণ সেলাই করেছে।" }], features: ["কাস্টম ডিজাইন", "হোম পিকআপ", "ফিটিং গ্যারান্টি", "দ্রুত সার্ভিস"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা"] },
  { slug: "gents-tailoring", title: "জেন্টস টেইলারিং", titleEn: "Gents Tailoring", description: "পুরুষদের পোশাক সেলাই। শার্ট, প্যান্ট, স্যুট, পাঞ্জাবি।", image: "/images/placeholder.svg", rating: 4.6, totalReviews: 380, totalOrders: 2200, packages: [
    { name: "বেসিক", price: 600, originalPrice: 900, features: ["শার্ট/প্যান্ট", "সিম্পল ডিজাইন", "৫ দিনে ডেলিভারি"] },
    { name: "ফর্মাল", price: 2000, originalPrice: 3000, features: ["ফর্মাল শার্ট+প্যান্ট", "প্রিমিয়াম ফিনিশিং", "ফিটিং গ্যারান্টি"] },
    { name: "স্যুট", price: 5000, originalPrice: 8000, features: ["টু-পিস/থ্রি-পিস", "কাস্টম ডিজাইন", "একাধিক ফিটিং"] },
  ], reviews: [{ name: "সাকিব আল হাসান", rating: 5, date: "১০ মার্চ ২০২৬", comment: "স্যুট দারুণ ফিটিং হয়েছে।" }], features: ["কাস্টম ফিট", "প্রিমিয়াম ফ্যাব্রিক", "হোম পিকআপ", "ফিটিং গ্যারান্টি"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী"] },
  { slug: "alteration", title: "অল্টারেশন", titleEn: "Alteration", description: "পোশাক মেরামত ও অল্টারেশন সার্ভিস। সাইজ অ্যাডজাস্ট, জিপ বদল।", image: "/images/placeholder.svg", rating: 4.4, totalReviews: 520, totalOrders: 3500, packages: [
    { name: "সিম্পল", price: 150, originalPrice: 250, features: ["প্রতি পিস", "সাইজ অ্যাডজাস্ট", "২ দিনে"] },
    { name: "মাঝারি", price: 400, originalPrice: 600, features: ["জিপ/বোতাম বদল", "লাইনিং", "৩ দিনে"] },
    { name: "কমপ্লেক্স", price: 800, originalPrice: 1200, features: ["মেজর অল্টারেশন", "রিডিজাইন", "৫ দিনে"] },
  ], reviews: [{ name: "মিনা আক্তার", rating: 4, date: "৮ মার্চ ২০২৬", comment: "পুরোনো শাড়ির ব্লাউজ নতুন করে বানিয়ে দিয়েছে।" }], features: ["দ্রুত সার্ভিস", "হোম পিকআপ", "সকল পোশাক", "সাশ্রয়ী"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা"] },

  // --- Additional BD-specific Services ---
  { slug: "cctv-installation", title: "সিসিটিভি ইনস্টলেশন", titleEn: "CCTV Installation", description: "বাসা, অফিস, দোকান ও ফ্যাক্টরিতে সিসিটিভি ক্যামেরা ইনস্টলেশন, মনিটরিং ও মেইনটেন্যান্স সার্ভিস।", image: "/images/placeholder.svg", rating: 4.7, totalReviews: 520, totalOrders: 3200, packages: [
    { name: "হোম প্যাকেজ", price: 8000, originalPrice: 12000, features: ["২টি ক্যামেরা", "৫০০GB DVR", "ইনস্টলেশন", "মোবাইলে লাইভ ভিউ"] },
    { name: "বিজনেস", price: 18000, originalPrice: 25000, features: ["৪টি ক্যামেরা", "১TB DVR", "নাইট ভিশন", "রিমোট মনিটরিং"] },
    { name: "প্রিমিয়াম", price: 35000, originalPrice: 50000, features: ["৮টি HD ক্যামেরা", "২TB NVR", "AI মোশন ডিটেকশন", "২৪/৭ ক্লাউড স্টোরেজ"] },
  ], reviews: [{ name: "আনোয়ার হোসেন", rating: 5, date: "১২ মার্চ ২০২৬", comment: "দোকানে সিসিটিভি লাগিয়েছি। মোবাইলে সব দেখতে পারি।" }], features: ["HD/4K ক্যামেরা", "মোবাইল অ্যাপ", "নাইট ভিশন", "ক্লাউড স্টোরেজ", "ওয়ারেন্টি"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "রংপুর", "কুমিল্লা"] },

  { slug: "water-purifier", title: "ওয়াটার পিউরিফায়ার", titleEn: "Water Purifier", description: "ওয়াটার পিউরিফায়ার ইনস্টলেশন, সার্ভিসিং, ফিল্টার চেঞ্জ ও রিপেয়ার সার্ভিস। RO, UV, UF সকল প্রকার।", image: "/images/placeholder.svg", rating: 4.6, totalReviews: 680, totalOrders: 4500, packages: [
    { name: "ফিল্টার চেঞ্জ", price: 500, originalPrice: 800, features: ["ফিল্টার রিপ্লেসমেন্ট", "পারফরম্যান্স চেক", "৩০ মিনিট সার্ভিস"] },
    { name: "ফুল সার্ভিসিং", price: 1200, originalPrice: 1800, features: ["ফিল্টার+মেমব্রেন চেক", "ফ্লাশিং", "TDS টেস্ট", "৩ মাস ওয়ারেন্টি"] },
    { name: "নতুন ইনস্টলেশন", price: 8000, originalPrice: 12000, features: ["RO পিউরিফায়ার", "ইনস্টলেশন", "১ বছর ফ্রি সার্ভিসিং", "ওয়ারেন্টি"] },
  ], reviews: [{ name: "শাহীন বেগম", rating: 5, date: "১১ মার্চ ২০২৬", comment: "ওয়াটার পিউরিফায়ার সার্ভিসিং দ্রুত ও ভালো হয়েছে।" }], features: ["সকল ব্র্যান্ড", "ফ্রি TDS টেস্ট", "অরিজিনাল ফিল্টার", "হোম সার্ভিস"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "রংপুর", "বরিশাল", "ময়মনসিংহ", "কুমিল্লা"] },

  { slug: "water-tank-cleaning", title: "ওয়াটার ট্যাংক ক্লিনিং", titleEn: "Water Tank Cleaning", description: "বাসা ও অ্যাপার্টমেন্টের ওভারহেড ও আন্ডারগ্রাউন্ড ওয়াটার ট্যাংক পরিষ্কার ও জীবাণুমুক্ত করার সার্ভিস।", image: "/images/placeholder.svg", rating: 4.5, totalReviews: 420, totalOrders: 2800, packages: [
    { name: "ছোট ট্যাংক", price: 1500, originalPrice: 2500, features: ["৫০০ লিটার পর্যন্ত", "ক্লিনিং + স্যানিটাইজিং", "১ ঘণ্টা সার্ভিস"] },
    { name: "মাঝারি ট্যাংক", price: 2500, originalPrice: 4000, features: ["১০০০-২০০০ লিটার", "ডিসইনফেকশন", "পাইপ ফ্লাশিং"] },
    { name: "বিল্ডিং ট্যাংক", price: 5000, originalPrice: 8000, features: ["৫০০০+ লিটার", "ওভারহেড+আন্ডারগ্রাউন্ড", "ওয়াটার টেস্ট রিপোর্ট", "৬ মাসের গ্যারান্টি"] },
  ], reviews: [{ name: "মোঃ আলাউদ্দিন", rating: 5, date: "১০ মার্চ ২০২৬", comment: "ট্যাংক ক্লিনিংয়ের পর পানির গুণমান অনেক ভালো হয়েছে।" }], features: ["প্রফেশনাল ক্লিনিং", "জীবাণুমুক্ত", "ওয়াটার টেস্ট", "নিয়মিত সার্ভিস"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট"] },

  { slug: "tiles-marble", title: "টাইলস ও মার্বেল ওয়ার্ক", titleEn: "Tiles & Marble Work", description: "ফ্লোর টাইলস, ওয়াল টাইলস, মার্বেল ও গ্রানাইট ফিটিং, পলিশিং ও রিপেয়ার সার্ভিস।", image: "/images/placeholder.svg", rating: 4.6, totalReviews: 380, totalOrders: 2200, packages: [
    { name: "ছোট কাজ", price: 3000, originalPrice: 5000, features: ["৫০ স্কয়ার ফুট পর্যন্ত", "টাইলস ফিটিং", "গ্রাউটিং"] },
    { name: "রুম ফ্লোরিং", price: 12000, originalPrice: 18000, features: ["১৫০ স্কয়ার ফুট", "লেভেলিং + ফিটিং", "মটেরিয়াল গাইডেন্স"] },
    { name: "ফুল হোম", price: 35000, originalPrice: 50000, features: ["সম্পূর্ণ বাসা", "প্রিমিয়াম ফিনিশিং", "মার্বেল পলিশিং", "ওয়ারেন্টি"] },
  ], reviews: [{ name: "বেলাল হোসেন", rating: 5, date: "৯ মার্চ ২০২৬", comment: "বাথরুমের টাইলস ফিটিং দারুণ হয়েছে।" }], features: ["অভিজ্ঞ রাজমিস্ত্রি", "ডিজাইন পরামর্শ", "মটেরিয়াল গাইড", "ওয়ারেন্টি"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট"] },

  { slug: "welding-grill", title: "ওয়েল্ডিং ও গ্রিল", titleEn: "Welding & Grill", description: "লোহার গ্রিল, গেট, রেলিং তৈরি ও ওয়েল্ডিং রিপেয়ার সার্ভিস। গ্লাস ও এলুমিনিয়াম কাজও করা হয়।", image: "/images/placeholder.svg", rating: 4.5, totalReviews: 350, totalOrders: 2000, packages: [
    { name: "ছোট রিপেয়ার", price: 500, originalPrice: 800, features: ["ওয়েল্ডিং রিপেয়ার", "ছোট গ্রিল ফিক্স", "হোম ভিজিট"] },
    { name: "নতুন গ্রিল", price: 3000, originalPrice: 5000, features: ["জানালা/দরজা গ্রিল", "ডিজাইন অনুযায়ী", "মটেরিয়াল সহ"] },
    { name: "গেট ও রেলিং", price: 10000, originalPrice: 15000, features: ["মেইন গেট", "সিঁড়ির রেলিং", "কাস্টম ডিজাইন", "পেইন্টিং সহ"] },
  ], reviews: [{ name: "আশরাফুল ইসলাম", rating: 4, date: "৭ মার্চ ২০২৬", comment: "বাসার গ্রিল দারুণ বানিয়ে দিয়েছে। দামও যুক্তিসঙ্গত।" }], features: ["কাস্টম ডিজাইন", "মটেরিয়াল সহ", "হোম সার্ভিস", "পেইন্টিং"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "রংপুর", "কুমিল্লা"] },

  { slug: "glass-aluminum", title: "গ্লাস ও এলুমিনিয়াম", titleEn: "Glass & Aluminum", description: "থাই গ্লাস, মিরর, শাওয়ার গ্লাস, এলুমিনিয়াম দরজা-জানালা তৈরি ও ফিটিং সার্ভিস।", image: "/images/placeholder.svg", rating: 4.6, totalReviews: 280, totalOrders: 1500, packages: [
    { name: "ছোট কাজ", price: 2000, originalPrice: 3000, features: ["গ্লাস ফিটিং", "মিরর ইনস্টল", "হোম ভিজিট"] },
    { name: "দরজা/জানালা", price: 8000, originalPrice: 12000, features: ["এলুমিনিয়াম ফ্রেম", "থাই গ্লাস", "ফিটিং সহ"] },
    { name: "ফুল প্রজেক্ট", price: 25000, originalPrice: 35000, features: ["সম্পূর্ণ বাসা/অফিস", "শাওয়ার পার্টিশন", "কাস্টম ডিজাইন", "ওয়ারেন্টি"] },
  ], reviews: [{ name: "তৌফিক আহমেদ", rating: 5, date: "১৩ মার্চ ২০২৬", comment: "বাথরুমে শাওয়ার গ্লাস লাগিয়েছি। দারুণ ফিনিশিং।" }], features: ["থাই গ্লাস", "এলুমিনিয়াম ফ্রেম", "কাস্টম ডিজাইন", "ফিটিং সহ"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা"] },

  { slug: "septic-tank", title: "সেপটিক ট্যাংক ক্লিনিং", titleEn: "Septic Tank Cleaning", description: "সেপটিক ট্যাংক ও ড্রেইন পরিষ্কার সার্ভিস। ভ্যাকুয়াম ট্রাক দ্বারা দ্রুত ও স্বাস্থ্যসম্মত সার্ভিস।", image: "/images/placeholder.svg", rating: 4.4, totalReviews: 320, totalOrders: 2100, packages: [
    { name: "স্মল ট্যাংক", price: 3000, originalPrice: 5000, features: ["১০০০ লিটার পর্যন্ত", "ভ্যাকুয়াম ক্লিনিং", "১ ঘণ্টা সার্ভিস"] },
    { name: "মিডিয়াম", price: 5000, originalPrice: 8000, features: ["৩০০০ লিটার", "ফুল ক্লিনিং", "ড্রেইন চেক"] },
    { name: "লার্জ/বিল্ডিং", price: 10000, originalPrice: 15000, features: ["৫০০০+ লিটার", "ভ্যাকুয়াম ট্রাক", "ফ্লাশিং", "ডিওডোরাইজিং"] },
  ], reviews: [{ name: "মোঃ আলমগীর", rating: 4, date: "৬ মার্চ ২০২৬", comment: "দ্রুত সার্ভিস দিয়েছে। কোনো দুর্গন্ধ ছাড়াই কাজ শেষ।" }], features: ["ভ্যাকুয়াম ট্রাক", "জীবাণুমুক্তকরণ", "ড্রেইন ক্লিনিং", "ইমার্জেন্সি সার্ভিস"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট"] },

  { slug: "mosquito-net", title: "মশার নেট ও স্ক্রিন", titleEn: "Mosquito Net & Screen", description: "দরজা-জানালায় মশার নেট, ম্যাগনেটিক স্ক্রিন ও ইনসেক্ট স্ক্রিন ফিটিং সার্ভিস।", image: "/images/placeholder.svg", rating: 4.5, totalReviews: 420, totalOrders: 2800, packages: [
    { name: "সিঙ্গেল জানালা", price: 600, originalPrice: 900, features: ["১টি জানালা", "নাইলন নেট", "ফ্রেম সহ ফিটিং"] },
    { name: "রুম প্যাকেজ", price: 2000, originalPrice: 3000, features: ["৩-৪টি জানালা", "প্রিমিয়াম নেট", "দরজার স্ক্রিন"] },
    { name: "ফুল হোম", price: 5000, originalPrice: 8000, features: ["সম্পূর্ণ বাসা", "ম্যাগনেটিক স্ক্রিন", "স্টেইনলেস ফ্রেম", "১ বছর ওয়ারেন্টি"] },
  ], reviews: [{ name: "রুবিনা আক্তার", rating: 5, date: "১৪ মার্চ ২০২৬", comment: "মশার নেট লাগানোর পর ঘরে একটাও মশা ঢোকে না।" }], features: ["কাস্টম সাইজ", "ম্যাগনেটিক অপশন", "দীর্ঘস্থায়ী", "হোম ফিটিং"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "রংপুর", "বরিশাল", "ময়মনসিংহ", "কুমিল্লা"] },

  // --- Government & Documentation Services ---
  { slug: "passport-nid", title: "পাসপোর্ট ও NID সার্ভিস", titleEn: "Passport & NID Service", description: "পাসপোর্ট নবায়ন, NID সংশোধন, জন্ম নিবন্ধন ও সরকারি কাগজপত্র প্রক্রিয়াকরণ সহায়তা।", image: "/images/placeholder.svg", rating: 4.7, totalReviews: 1800, totalOrders: 12000, packages: [
    { name: "বেসিক", price: 1500, originalPrice: 2500, features: ["NID সংশোধন আবেদন", "ফর্ম ফিলাপ", "সাবমিশন সাপোর্ট"] },
    { name: "স্ট্যান্ডার্ড", price: 3000, originalPrice: 5000, features: ["পাসপোর্ট আবেদন/নবায়ন", "ডকুমেন্ট প্রস্তুতি", "অ্যাপয়েন্টমেন্ট বুকিং"] },
    { name: "প্রিমিয়াম", price: 5000, originalPrice: 8000, features: ["জরুরি পাসপোর্ট", "পুলিশ ভেরিফিকেশন ফলোআপ", "ডেলিভারি সাপোর্ট"] },
  ], reviews: [{ name: "মোঃ কামরুল ইসলাম", rating: 5, date: "১৮ মার্চ ২০২৬", comment: "পাসপোর্ট নবায়ন খুব সহজে হয়ে গেছে। ধন্যবাদ।" }], features: ["অনলাইন আবেদন সাপোর্ট", "ডকুমেন্ট চেকলিস্ট", "ফলোআপ ট্র্যাকিং", "হোম কালেকশন"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "বরিশাল", "রংপুর", "ময়মনসিংহ", "কুমিল্লা"] },

  { slug: "birth-certificate", title: "জন্ম নিবন্ধন", titleEn: "Birth Certificate", description: "জন্ম নিবন্ধন, সংশোধন ও ডুপ্লিকেট সনদ প্রাপ্তিতে সহায়তা।", image: "/images/placeholder.svg", rating: 4.6, totalReviews: 950, totalOrders: 6500, packages: [
    { name: "নতুন নিবন্ধন", price: 500, originalPrice: 800, features: ["ফর্ম পূরণ", "অনলাইন আবেদন", "ট্র্যাকিং"] },
    { name: "সংশোধন", price: 1000, originalPrice: 1500, features: ["তথ্য সংশোধন", "ডকুমেন্ট প্রস্তুতি", "ফলোআপ"] },
    { name: "জরুরি সার্ভিস", price: 2000, originalPrice: 3000, features: ["দ্রুত প্রক্রিয়াকরণ", "ডুপ্লিকেট ইস্যু", "ইংরেজি কপি"] },
  ], reviews: [{ name: "নাসরিন আক্তার", rating: 5, date: "১৫ মার্চ ২০২৬", comment: "বাচ্চার জন্ম নিবন্ধন দ্রুত হয়ে গেছে।" }], features: ["অনলাইন আবেদন", "হোম কালেকশন", "দ্রুত ডেলিভারি", "সংশোধন সাপোর্ট"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "বরিশাল", "রংপুর", "ময়মনসিংহ", "কুমিল্লা"] },

  // --- Printing & Stationery ---
  { slug: "printing-binding", title: "প্রিন্টিং ও বাইন্ডিং", titleEn: "Printing & Binding", description: "ডকুমেন্ট প্রিন্ট, ফটোকপি, স্পাইরাল বাইন্ডিং, লেমিনেটিং ও ব্যানার প্রিন্ট।", image: "/images/placeholder.svg", rating: 4.5, totalReviews: 680, totalOrders: 4500, packages: [
    { name: "বেসিক", price: 200, originalPrice: 350, features: ["৫০ পেজ প্রিন্ট", "স্পাইরাল বাইন্ড", "পিকআপ ডেলিভারি"] },
    { name: "স্ট্যান্ডার্ড", price: 800, originalPrice: 1200, features: ["২০০ পেজ", "হার্ড বাইন্ডিং", "লেমিনেটিং", "কালার প্রিন্ট"] },
    { name: "বাল্ক/কমার্শিয়াল", price: 3000, originalPrice: 5000, features: ["৫০০+ পেজ", "অফসেট প্রিন্ট", "ব্যানার/ফেস্টুন", "ভিজিটিং কার্ড"] },
  ], reviews: [{ name: "সাদিকুল ইসলাম", rating: 4, date: "১২ মার্চ ২০২৬", comment: "প্রজেক্ট রিপোর্ট প্রিন্ট ও বাইন্ডিং চমৎকার হয়েছে।" }], features: ["হোম ডেলিভারি", "কালার/ব্ল্যাক-হোয়াইট", "বাল্ক ডিসকাউন্ট", "জরুরি সার্ভিস"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "বরিশাল", "রংপুর", "ময়মনসিংহ"] },

  // --- Custom Furniture ---
  { slug: "custom-furniture", title: "কাস্টম ফার্নিচার", titleEn: "Custom Furniture", description: "কাঠ ও বোর্ডের কাস্টম ফার্নিচার তৈরি। আলমারি, খাট, টেবিল, কিচেন ক্যাবিনেট।", image: "/images/placeholder.svg", rating: 4.7, totalReviews: 850, totalOrders: 4800, packages: [
    { name: "সিঙ্গেল আইটেম", price: 5000, originalPrice: 8000, features: ["১টি ফার্নিচার", "ডিজাইন কনসালটেশন", "ম্যাটেরিয়াল সিলেকশন"] },
    { name: "রুম প্যাকেজ", price: 25000, originalPrice: 40000, features: ["৩-৫টি আইটেম", "ফ্রি ডিজাইন", "ইনস্টলেশন", "১ বছর ওয়ারেন্টি"] },
    { name: "ফুল হোম", price: 80000, originalPrice: 120000, features: ["সম্পূর্ণ বাসার ফার্নিচার", "3D ডিজাইন", "প্রিমিয়াম ম্যাটেরিয়াল", "২ বছর ওয়ারেন্টি"] },
  ], reviews: [{ name: "আনিসুর রহমান", rating: 5, date: "১৬ মার্চ ২০২৬", comment: "কিচেন ক্যাবিনেট অসাধারণ হয়েছে। কারিগরি দক্ষতা দেখে মুগ্ধ।" }], features: ["কাস্টম ডিজাইন", "প্রিমিয়াম কাঠ", "হোম ডেলিভারি", "ওয়ারেন্টি"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "বরিশাল", "রংপুর", "ময়মনসিংহ"] },

  // --- Standalone Catering ---
  { slug: "catering-service", title: "ক্যাটারিং সার্ভিস", titleEn: "Catering Service", description: "বাড়ির অনুষ্ঠান, অফিস মিটিং, পার্টি ও যেকোনো ইভেন্টের জন্য ক্যাটারিং সার্ভিস।", image: "/images/placeholder.svg", rating: 4.6, totalReviews: 1100, totalOrders: 7200, packages: [
    { name: "স্মল ইভেন্ট", price: 8000, originalPrice: 12000, features: ["৫০ জন পর্যন্ত", "৫ আইটেম মেনু", "সার্ভিং সহ"] },
    { name: "মিডিয়াম ইভেন্ট", price: 20000, originalPrice: 30000, features: ["১০০ জন", "৮ আইটেম", "ডেকোরেশন", "সার্ভার"] },
    { name: "লার্জ ইভেন্ট", price: 50000, originalPrice: 75000, features: ["৩০০+ জন", "১২+ আইটেম", "লাইভ কুকিং", "ফুল ম্যানেজমেন্ট"] },
  ], reviews: [{ name: "ফাতেমা খাতুন", rating: 5, date: "১৭ মার্চ ২০২৬", comment: "বাড়ির মিলাদে ক্যাটারিং নিয়েছিলাম। সবাই খুব প্রশংসা করেছে।" }], features: ["কাস্টম মেনু", "হালাল গ্যারান্টি", "টাইমলি সার্ভিস", "ক্লিনআপ সহ"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "বরিশাল", "রংপুর", "ময়মনসিংহ", "কুমিল্লা"] },

  // --- Fitness ---
  { slug: "personal-trainer", title: "পার্সোনাল ট্রেইনার", titleEn: "Personal Trainer", description: "বাসায় বা জিমে পার্সোনাল ফিটনেস ট্রেইনার। ডায়েট প্ল্যান ও ওয়ার্কআউট গাইডেন্স।", image: "/images/placeholder.svg", rating: 4.7, totalReviews: 520, totalOrders: 3200, packages: [
    { name: "বেসিক", price: 3000, originalPrice: 5000, features: ["মাসে ১২ সেশন", "ওয়ার্কআউট প্ল্যান", "প্রগ্রেস ট্র্যাকিং"] },
    { name: "স্ট্যান্ডার্ড", price: 6000, originalPrice: 9000, features: ["মাসে ২০ সেশন", "ডায়েট প্ল্যান", "হোম ভিজিট", "ওজন ব্যবস্থাপনা"] },
    { name: "প্রিমিয়াম", price: 12000, originalPrice: 18000, features: ["ডেইলি সেশন", "নিউট্রিশন কাউন্সেলিং", "বডি ট্রান্সফর্মেশন", "অনলাইন সাপোর্ট"] },
  ], reviews: [{ name: "তানভীর হোসেন", rating: 5, date: "১৯ মার্চ ২০২৬", comment: "৩ মাসে ১০ কেজি ওজন কমেছে। ট্রেইনার অনেক সাপোর্টিভ।" }], features: ["সার্টিফাইড ট্রেইনার", "কাস্টম প্ল্যান", "হোম/জিম অপশন", "ডায়েট গাইড"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট"] },

  // --- Photography (General) ---
  { slug: "photography-service", title: "ফটোগ্রাফি সার্ভিস", titleEn: "Photography Service", description: "পোর্ট্রেট, ফ্যামিলি, গ্র্যাজুয়েশন, প্রি-ওয়েডিং ও ইভেন্ট ফটোগ্রাফি।", image: "/images/placeholder.svg", rating: 4.8, totalReviews: 780, totalOrders: 5200, packages: [
    { name: "বেসিক শুট", price: 3000, originalPrice: 5000, features: ["১ ঘণ্টা শুট", "৫০+ ফটো", "১০ এডিটেড", "ডিজিটাল কপি"] },
    { name: "স্ট্যান্ডার্ড", price: 8000, originalPrice: 12000, features: ["৩ ঘণ্টা", "২০০+ ফটো", "৩০ এডিটেড", "অ্যালবাম"] },
    { name: "প্রিমিয়াম", price: 20000, originalPrice: 30000, features: ["ফুল ডে শুট", "৫০০+ ফটো", "১০০ এডিটেড", "প্রিন্ট অ্যালবাম", "ভিডিও ক্লিপ"] },
  ], reviews: [{ name: "সাবরিনা ইসলাম", rating: 5, date: "২০ মার্চ ২০২৬", comment: "গ্র্যাজুয়েশন ফটো অসাধারণ হয়েছে!!" }], features: ["প্রফেশনাল ক্যামেরা", "আউটডোর/ইনডোর", "ড্রোন শুট", "এক্সপ্রেস ডেলিভারি"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "বরিশাল", "রংপুর", "ময়মনসিংহ", "কুমিল্লা"] },

  // --- Pet Care ---
  { slug: "pet-care", title: "পেট কেয়ার", titleEn: "Pet Care", description: "পোষা প্রাণীর গ্রুমিং, ভ্যাক্সিনেশন, ট্রেনিং ও ভেটেরিনারি কেয়ার সার্ভিস।", image: "/images/placeholder.svg", rating: 4.6, totalReviews: 380, totalOrders: 2100, packages: [
    { name: "গ্রুমিং", price: 1500, originalPrice: 2500, features: ["বাথ ও ব্রাশ", "নেইল ক্লিপিং", "ইয়ার ক্লিনিং"] },
    { name: "হেলথ চেকআপ", price: 2500, originalPrice: 4000, features: ["ভেট ভিজিট", "ভ্যাক্সিনেশন", "ডি-ওয়ার্মিং", "হেলথ কার্ড"] },
    { name: "প্রিমিয়াম কেয়ার", price: 5000, originalPrice: 8000, features: ["গ্রুমিং+চেকআপ", "ট্রেনিং সেশন", "ডায়েট প্ল্যান", "মাসিক ফলোআপ"] },
  ], reviews: [{ name: "রাফসান চৌধুরী", rating: 5, date: "১৮ মার্চ ২০২৬", comment: "আমার বিড়ালের গ্রুমিং ও ভ্যাক্সিন দিয়েছে। খুবই প্রফেশনাল।" }], features: ["হোম ভিজিট", "সার্টিফাইড ভেট", "জরুরি সার্ভিস", "পেট ফুড ডেলিভারি"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম"] },

  // --- Mobile Recharge & Bill Pay ---
  { slug: "bill-pay", title: "বিল পে ও রিচার্জ", titleEn: "Bill Pay & Recharge", description: "বিদ্যুৎ, গ্যাস, পানি, ইন্টারনেট বিল ও মোবাইল রিচার্জ সার্ভিস।", image: "/images/placeholder.svg", rating: 4.4, totalReviews: 2200, totalOrders: 15000, packages: [
    { name: "বেসিক", price: 20, originalPrice: 50, features: ["মোবাইল রিচার্জ", "যেকোনো অপারেটর", "ইনস্ট্যান্ট"] },
    { name: "বিল পেমেন্ট", price: 30, originalPrice: 50, features: ["বিদ্যুৎ/গ্যাস/পানি", "ইন্টারনেট বিল", "রিসিপ্ট সহ"] },
    { name: "বাল্ক সার্ভিস", price: 100, originalPrice: 200, features: ["মাসিক অটো-পে", "মাল্টিপল বিল", "রিমাইন্ডার", "ডিসকাউন্ট"] },
  ], reviews: [{ name: "মোঃ শফিকুল", rating: 4, date: "২০ মার্চ ২০২৬", comment: "বাসার সব বিল এক জায়গা থেকে দিতে পারি। খুবই সুবিধাজনক।" }], features: ["ইনস্ট্যান্ট প্রসেস", "সকল অপারেটর", "বিল রিমাইন্ডার", "ক্যাশব্যাক অফার"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "বরিশাল", "রংপুর", "ময়মনসিংহ", "কুমিল্লা"] },

  // --- Property & Real Estate ---
  { slug: "flat-rent", title: "ফ্ল্যাট ভাড়া", titleEn: "Flat Rent", description: "বাসা/ফ্ল্যাট ভাড়ার জন্য ভেরিফাইড লিস্টিং। পরিবার, ব্যাচেলর ও অফিসের জন্য।", image: "/images/placeholder.svg", rating: 4.6, totalReviews: 2500, totalOrders: 18000, packages: [
    { name: "বেসিক সার্চ", price: 500, originalPrice: 1000, features: ["১০টি লিস্টিং", "লোকেশন ফিল্টার", "ফোন নম্বর"] },
    { name: "প্রিমিয়াম সার্চ", price: 1500, originalPrice: 2500, features: ["আনলিমিটেড লিস্টিং", "ভেরিফাইড ওনার", "ভিজিট শিডিউল"] },
    { name: "ব্রোকার সার্ভিস", price: 5000, originalPrice: 8000, features: ["ডেডিকেটেড এজেন্ট", "নেগোসিয়েশন", "চুক্তিপত্র সাপোর্ট", "শিফটিং ডিসকাউন্ট"] },
  ], reviews: [{ name: "আবদুল্লাহ আল মামুন", rating: 5, date: "২০ মার্চ ২০২৬", comment: "মিরপুরে ভালো ফ্ল্যাট পেয়ে গেছি। সত্যিই সময় বাঁচিয়ে দিয়েছে।" }], features: ["ভেরিফাইড লিস্টিং", "ভার্চুয়াল ট্যুর", "লোকেশন ম্যাপ", "ওনার ডাইরেক্ট"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "বরিশাল", "রংপুর", "ময়মনসিংহ", "কুমিল্লা"] },

  { slug: "property-buy-sell", title: "জমি ও প্রপার্টি ক্রয়-বিক্রয়", titleEn: "Property Buy & Sell", description: "জমি, ফ্ল্যাট, বাড়ি ও কমার্শিয়াল প্রপার্টি ক্রয়-বিক্রয় সার্ভিস।", image: "/images/placeholder.svg", rating: 4.5, totalReviews: 1200, totalOrders: 5500, packages: [
    { name: "লিস্টিং", price: 1000, originalPrice: 2000, features: ["বিজ্ঞাপন পোস্ট", "ফটো আপলোড", "৩০ দিন লাইভ"] },
    { name: "প্রিমিয়াম লিস্টিং", price: 3000, originalPrice: 5000, features: ["ফিচার্ড পোস্ট", "ফটো+ভিডিও", "৬০ দিন", "বুস্টেড ভিউ"] },
    { name: "ফুল সার্ভিস", price: 15000, originalPrice: 25000, features: ["ডেডিকেটেড এজেন্ট", "লিগ্যাল চেক", "রেজিস্ট্রেশন সাপোর্ট", "নেগোসিয়েশন"] },
  ], reviews: [{ name: "রফিকুল ইসলাম", rating: 4, date: "১৮ মার্চ ২০২৬", comment: "সাভারে জমি কিনেছি। ডকুমেন্ট ভেরিফিকেশন সার্ভিস খুবই ভালো ছিল।" }], features: ["ডকুমেন্ট ভেরিফিকেশন", "মার্কেট ভ্যালুয়েশন", "লিগ্যাল সাপোর্ট", "রেজিস্ট্রেশন"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "বরিশাল", "রংপুর", "ময়মনসিংহ", "কুমিল্লা"] },

  // --- Blood & Emergency ---
  { slug: "blood-bank", title: "ব্লাড ব্যাংক ও ডোনার", titleEn: "Blood Bank & Donor", description: "জরুরি রক্তের প্রয়োজনে ব্লাড ব্যাংক ও স্বেচ্ছাসেবী ডোনার খুঁজুন।", image: "/images/placeholder.svg", rating: 4.9, totalReviews: 3200, totalOrders: 25000, packages: [
    { name: "ডোনার সার্চ", price: 0, originalPrice: 0, features: ["ডোনার খুঁজুন", "ব্লাড গ্রুপ ফিল্টার", "লোকেশন ভিত্তিক", "ফ্রি সার্ভিস"] },
    { name: "ব্লাড ব্যাংক", price: 1500, originalPrice: 2000, features: ["ব্যাগ রক্ত সংগ্রহ", "স্ক্রিনিং টেস্ট", "হোম কালেকশন"] },
    { name: "প্লেটলেট/প্লাজমা", price: 3000, originalPrice: 5000, features: ["প্লেটলেট অ্যাফেরেসিস", "ফ্রেশ ফ্রোজেন প্লাজমা", "জরুরি ডেলিভারি"] },
  ], reviews: [{ name: "ড. শামীম আহমেদ", rating: 5, date: "২১ মার্চ ২০২৬", comment: "রাত ২টায় AB- রক্ত দরকার ছিল। ৩০ মিনিটে ডোনার পেয়ে গেছি।" }], features: ["২৪/৭ সার্ভিস", "সকল ব্লাড গ্রুপ", "ভেরিফাইড ডোনার", "জরুরি সাপোর্ট"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "বরিশাল", "রংপুর", "ময়মনসিংহ", "কুমিল্লা"] },

  { slug: "oxygen-cylinder", title: "অক্সিজেন সিলিন্ডার", titleEn: "Oxygen Cylinder", description: "মেডিকেল অক্সিজেন সিলিন্ডার ভাড়া ও রিফিল সার্ভিস। হোম ডেলিভারি।", image: "/images/placeholder.svg", rating: 4.8, totalReviews: 650, totalOrders: 4200, packages: [
    { name: "স্মল সিলিন্ডার", price: 3000, originalPrice: 4500, features: ["১০ লিটার", "রেগুলেটর সহ", "ডেলিভারি ফ্রি"] },
    { name: "মিডিয়াম", price: 5000, originalPrice: 7000, features: ["২০ লিটার", "ফ্লো মিটার", "মাস্ক ও ক্যানুলা"] },
    { name: "লার্জ/ICU", price: 8000, originalPrice: 12000, features: ["৪০ লিটার", "কনসেনট্রেটর অপশন", "২৪/৭ রিফিল", "টেকনিশিয়ান সাপোর্ট"] },
  ], reviews: [{ name: "নূরুল আমিন", rating: 5, date: "১৯ মার্চ ২০২৬", comment: "করোনা পরবর্তী সময়ে অক্সিজেন দরকার ছিল। দ্রুত পৌঁছে দিয়েছে।" }], features: ["হোম ডেলিভারি", "২৪/৭ রিফিল", "মেডিকেল গ্রেড", "টেকনিশিয়ান সাপোর্ট"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট"] },

  // --- Daily Essentials Delivery ---
  { slug: "gas-cylinder", title: "গ্যাস সিলিন্ডার ডেলিভারি", titleEn: "Gas Cylinder Delivery", description: "রান্নার গ্যাস সিলিন্ডার হোম ডেলিভারি। LP গ্যাস রিফিল ও নতুন সংযোগ।", image: "/images/placeholder.svg", rating: 4.5, totalReviews: 1800, totalOrders: 14000, packages: [
    { name: "রিফিল (১২ কেজি)", price: 1250, originalPrice: 1400, features: ["১২ কেজি সিলিন্ডার", "হোম ডেলিভারি", "সেইম ডে"] },
    { name: "রিফিল (২৫ কেজি)", price: 2200, originalPrice: 2500, features: ["২৫ কেজি সিলিন্ডার", "হোম ডেলিভারি", "ওজন গ্যারান্টি"] },
    { name: "নতুন সংযোগ", price: 4500, originalPrice: 6000, features: ["সিলিন্ডার+চুলা+পাইপ", "ইনস্টলেশন", "সেফটি চেক", "১ বছর সার্ভিস"] },
  ], reviews: [{ name: "মোসাম্মৎ রেহানা", rating: 4, date: "২১ মার্চ ২০২৬", comment: "ফোন দিলেই ২ ঘণ্টায় গ্যাস পৌঁছে যায়।" }], features: ["হোম ডেলিভারি", "ওজন গ্যারান্টি", "সেফটি চেক", "অটো-রিমাইন্ডার"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "বরিশাল", "রংপুর", "ময়মনসিংহ", "কুমিল্লা"] },

  { slug: "jar-water", title: "জার ওয়াটার ডেলিভারি", titleEn: "Jar Water Delivery", description: "বিশুদ্ধ খাবার পানি জার ডেলিভারি। ফিল্টার্ড ও মিনারেল ওয়াটার।", image: "/images/placeholder.svg", rating: 4.4, totalReviews: 1500, totalOrders: 12000, packages: [
    { name: "সিঙ্গেল জার", price: 40, originalPrice: 60, features: ["২০ লিটার জার", "সেইম ডে ডেলিভারি", "ফিল্টার্ড ওয়াটার"] },
    { name: "উইকলি (৪ জার)", price: 140, originalPrice: 200, features: ["সপ্তাহে ৪ জার", "শিডিউল ডেলিভারি", "জার এক্সচেঞ্জ"] },
    { name: "মাসিক (১৬ জার)", price: 500, originalPrice: 700, features: ["মাসে ১৬ জার", "ফ্রি ডিসপেনসার", "মিনারেল ওয়াটার", "অটো ডেলিভারি"] },
  ], reviews: [{ name: "সালমা বেগম", rating: 4, date: "২০ মার্চ ২০২৬", comment: "প্রতিদিন সময়মতো পানি পৌঁছে দেয়। খুবই নির্ভরযোগ্য।" }], features: ["BSTI অনুমোদিত", "সময়মতো ডেলিভারি", "জার এক্সচেঞ্জ", "সাবস্ক্রিপশন"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "বরিশাল", "রংপুর", "ময়মনসিংহ"] },

  // --- Gift & Flower ---
  { slug: "flower-delivery", title: "ফ্লাওয়ার ডেলিভারি", titleEn: "Flower Delivery", description: "তাজা ফুলের বুকে, ফুলের ঝুড়ি ও ডেকোরেশন। জন্মদিন, বিয়ে ও অনুষ্ঠানের জন্য।", image: "/images/placeholder.svg", rating: 4.7, totalReviews: 920, totalOrders: 6800, packages: [
    { name: "বুকে", price: 500, originalPrice: 800, features: ["রেড রোজ বুকে", "১২ পিস", "কার্ড ফ্রি"] },
    { name: "প্রিমিয়াম বুকে", price: 1500, originalPrice: 2500, features: ["মিক্সড ফ্লাওয়ার", "২৪+ পিস", "ডেকোরেটিভ র‍্যাপিং", "চকলেট কম্বো"] },
    { name: "ইভেন্ট ডেকোর", price: 5000, originalPrice: 8000, features: ["স্টেজ ডেকোরেশন", "গেট ফ্লাওয়ার", "টেবিল সেন্টারপিস", "কাস্টম ডিজাইন"] },
  ], reviews: [{ name: "তানজিনা আক্তার", rating: 5, date: "২১ মার্চ ২০২৬", comment: "বোনের জন্মদিনে সারপ্রাইজ বুকে পাঠিয়েছি। খুবই সুন্দর ছিল!" }], features: ["তাজা ফুল গ্যারান্টি", "সেইম ডে ডেলিভারি", "কাস্টম বুকে", "গিফট কার্ড"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "বরিশাল", "রংপুর", "ময়মনসিংহ"] },

  { slug: "gift-delivery", title: "গিফট ডেলিভারি", titleEn: "Gift Delivery", description: "জন্মদিন, বিবাহ বার্ষিকী, ভ্যালেন্টাইন ডে ও যেকোনো উপলক্ষে গিফট ডেলিভারি।", image: "/images/placeholder.svg", rating: 4.6, totalReviews: 750, totalOrders: 5500, packages: [
    { name: "স্মল গিফট", price: 800, originalPrice: 1200, features: ["গিফট বক্স", "চকলেট/টেডি", "কার্ড", "র‍্যাপিং"] },
    { name: "প্রিমিয়াম গিফট", price: 2500, originalPrice: 4000, features: ["কাস্টম হ্যাম্পার", "পারফিউম/ঘড়ি", "প্রিমিয়াম র‍্যাপিং", "ভিডিও মেসেজ"] },
    { name: "কর্পোরেট গিফট", price: 5000, originalPrice: 8000, features: ["বাল্ক অর্ডার", "ব্র্যান্ডেড আইটেম", "কাস্টম প্যাকেজিং", "ডেলিভারি ম্যানেজমেন্ট"] },
  ], reviews: [{ name: "শামীমা নাসরিন", rating: 5, date: "১৯ মার্চ ২০২৬", comment: "হাজব্যান্ডের জন্মদিনে সারপ্রাইজ গিফট পাঠিয়েছি। অসাধারণ প্রেজেন্টেশন!!" }], features: ["সারপ্রাইজ ডেলিভারি", "কাস্টম প্যাকেজিং", "সেইম ডে", "ভিডিও কনফার্মেশন"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "বরিশাল", "রংপুর", "ময়মনসিংহ", "কুমিল্লা"] },

  { slug: "cake-delivery", title: "কেক ও বেকারি", titleEn: "Cake & Bakery", description: "কাস্টম কেক, কাপকেক, পেস্ট্রি ও বেকারি আইটেম অর্ডার ও ডেলিভারি।", image: "/images/placeholder.svg", rating: 4.7, totalReviews: 1100, totalOrders: 8500, packages: [
    { name: "রেগুলার কেক", price: 500, originalPrice: 800, features: ["১ পাউন্ড", "ভ্যানিলা/চকলেট", "বেসিক ডেকোরেশন"] },
    { name: "কাস্টম কেক", price: 1500, originalPrice: 2500, features: ["২ পাউন্ড", "কাস্টম ডিজাইন", "ফটো কেক অপশন", "নাম লেখা"] },
    { name: "প্রিমিয়াম/ওয়েডিং", price: 5000, originalPrice: 8000, features: ["৫+ পাউন্ড", "মাল্টি-টায়ার", "ফন্ড্যান্ট ডেকোর", "ফ্রি ডেলিভারি"] },
  ], reviews: [{ name: "নুসরাত জাহান", rating: 5, date: "২০ মার্চ ২০২৬", comment: "মেয়ের জন্মদিনের ইউনিকর্ন কেক অসাধারণ হয়েছে!" }], features: ["কাস্টম ডিজাইন", "এগলেস অপশন", "সেইম ডে ডেলিভারি", "হাইজেনিক"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "বরিশাল", "রংপুর", "ময়মনসিংহ", "কুমিল্লা"] },

  // --- Business & Tax Services ---
  { slug: "tax-return", title: "ট্যাক্স রিটার্ন ফাইলিং", titleEn: "Tax Return Filing", description: "আয়কর রিটার্ন দাখিল, TIN সার্টিফিকেট ও ট্যাক্স কনসালটেশন সার্ভিস।", image: "/images/placeholder.svg", rating: 4.7, totalReviews: 680, totalOrders: 3500, packages: [
    { name: "জিরো রিটার্ন", price: 1000, originalPrice: 1500, features: ["জিরো ট্যাক্স রিটার্ন", "TIN রেজিস্ট্রেশন", "ই-ফাইলিং"] },
    { name: "ইনডিভিডুয়াল", price: 3000, originalPrice: 5000, features: ["ব্যক্তিগত রিটার্ন", "ইনকাম স্টেটমেন্ট", "ডকুমেন্ট প্রস্তুতি", "অনলাইন সাবমিশন"] },
    { name: "বিজনেস রিটার্ন", price: 8000, originalPrice: 12000, features: ["কোম্পানি রিটার্ন", "VAT রিটার্ন", "অডিট সাপোর্ট", "কনসালটেশন"] },
  ], reviews: [{ name: "জাহাঙ্গীর আলম", rating: 5, date: "১৫ মার্চ ২০২৬", comment: "প্রথমবার রিটার্ন দাখিল করেছি। পুরো প্রক্রিয়া সহজ করে দিয়েছে।" }], features: ["ই-ফাইলিং", "TIN সার্টিফিকেট", "কনসালটেশন", "ডকুমেন্ট প্রস্তুতি"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "বরিশাল", "রংপুর", "ময়মনসিংহ", "কুমিল্লা"] },

  { slug: "trade-license", title: "ট্রেড লাইসেন্স ও কোম্পানি রেজি.", titleEn: "Trade License & Registration", description: "ট্রেড লাইসেন্স, কোম্পানি রেজিস্ট্রেশন, RJSC ফাইলিং ও ব্যবসায়িক লাইসেন্স সার্ভিস।", image: "/images/placeholder.svg", rating: 4.6, totalReviews: 420, totalOrders: 2200, packages: [
    { name: "ট্রেড লাইসেন্স", price: 3000, originalPrice: 5000, features: ["নতুন/নবায়ন", "ডকুমেন্ট প্রস্তুতি", "সিটি কর্পোরেশন ফাইলিং"] },
    { name: "কোম্পানি রেজিস্ট্রেশন", price: 15000, originalPrice: 25000, features: ["RJSC রেজিস্ট্রেশন", "মেমোর‍্যান্ডাম", "আর্টিকেলস", "TIN+BIN"] },
    { name: "ফুল বিজনেস সেটআপ", price: 30000, originalPrice: 50000, features: ["কোম্পানি+ট্রেড লাইসেন্স", "VAT রেজি.", "ব্যাংক অ্যাকাউন্ট", "কনসালটেশন"] },
  ], reviews: [{ name: "ফারহান তানভীর", rating: 5, date: "১৭ মার্চ ২০২৬", comment: "স্টার্টআপের সব লাইসেন্স এক জায়গা থেকে করিয়ে নিয়েছি।" }], features: ["দ্রুত প্রসেসিং", "লিগ্যাল কনসালটেশন", "ডকুমেন্ট ড্রাফটিং", "ফলোআপ"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "বরিশাল", "রংপুর", "ময়মনসিংহ"] },

  // --- Insurance ---
  { slug: "insurance-service", title: "ইন্স্যুরেন্স সার্ভিস", titleEn: "Insurance Service", description: "লাইফ, হেলথ, ভেহিকেল ও প্রপার্টি ইন্স্যুরেন্স পরিকল্পনা ও ক্লেইম সাপোর্ট।", image: "/images/placeholder.svg", rating: 4.5, totalReviews: 380, totalOrders: 1800, packages: [
    { name: "হেলথ ইন্স্যুরেন্স", price: 500, originalPrice: 800, features: ["প্ল্যান তুলনা", "অনলাইন আবেদন", "ক্লেইম সাপোর্ট"] },
    { name: "ভেহিকেল ইন্স্যুরেন্স", price: 800, originalPrice: 1200, features: ["থার্ড পার্টি/কম্প্রিহেনসিভ", "অনলাইন কোটেশন", "অ্যাক্সিডেন্ট ক্লেইম"] },
    { name: "লাইফ ইন্স্যুরেন্স", price: 1000, originalPrice: 1500, features: ["প্ল্যান কম্পেয়ার", "প্রিমিয়াম ক্যালকুলেটর", "এজেন্ট ভিজিট", "ক্লেইম অ্যাসিস্ট্যান্স"] },
  ], reviews: [{ name: "মোঃ সেলিম রেজা", rating: 4, date: "১৬ মার্চ ২০২৬", comment: "পরিবারের হেলথ ইন্স্যুরেন্স করিয়েছি। প্রসেস সহজ ছিল।" }], features: ["ফ্রি কনসালটেশন", "প্ল্যান কম্পেয়ার", "অনলাইন আবেদন", "ক্লেইম সাপোর্ট"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "বরিশাল", "রংপুর", "ময়মনসিংহ", "কুমিল্লা"] },

  // --- Appliance Rental ---
  { slug: "appliance-rental", title: "অ্যাপ্লায়েন্স ভাড়া", titleEn: "Appliance Rental", description: "এসি, ফ্রিজ, ওয়াশিং মেশিন, মাইক্রোওয়েভ ভাড়া নিন মাসিক ভিত্তিতে।", image: "/images/placeholder.svg", rating: 4.5, totalReviews: 480, totalOrders: 2800, packages: [
    { name: "ফ্যান/হিটার", price: 500, originalPrice: 800, features: ["মাসিক ভাড়া", "ইনস্টলেশন ফ্রি", "মেইনটেন্যান্স"] },
    { name: "ফ্রিজ/ওয়াশিং মেশিন", price: 1500, originalPrice: 2500, features: ["মাসিক ভাড়া", "ডেলিভারি+সেটআপ", "সার্ভিসিং ফ্রি"] },
    { name: "এসি রেন্টাল", price: 3000, originalPrice: 5000, features: ["মাসিক ভাড়া", "ইনস্টলেশন+গ্যাস", "রিপেয়ার ফ্রি", "সিজনাল ডিসকাউন্ট"] },
  ], reviews: [{ name: "ইমতিয়াজ আহমেদ", rating: 4, date: "১৮ মার্চ ২০২৬", comment: "ব্যাচেলর লাইফে ফ্রিজ ভাড়া নেওয়া সেরা সিদ্ধান্ত ছিল।" }], features: ["ফ্লেক্সিবল টার্ম", "ফ্রি মেইনটেন্যান্স", "ডেলিভারি+সেটআপ", "আপগ্রেড অপশন"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট"] },

  // --- Marriage & Matchmaking ---
  { slug: "marriage-media", title: "ম্যারেজ মিডিয়া", titleEn: "Marriage Media", description: "বিশ্বস্ত ম্যাচমেকিং সার্ভিস। বায়োডাটা ভেরিফিকেশন, পাত্র-পাত্রী খোঁজা ও পরিবার পরিচয়।", image: "/images/placeholder.svg", rating: 4.6, totalReviews: 2800, totalOrders: 15000, packages: [
    { name: "বেসিক প্রোফাইল", price: 500, originalPrice: 1000, features: ["বায়োডাটা রেজিস্ট্রেশন", "৫টি ম্যাচ", "প্রোফাইল ভিউ"] },
    { name: "প্রিমিয়াম", price: 3000, originalPrice: 5000, features: ["ভেরিফাইড প্রোফাইল", "২০+ ম্যাচ", "ফ্যামিলি মিটিং অ্যারেঞ্জ", "ডেডিকেটেড কাউন্সেলর"] },
    { name: "এক্সক্লুসিভ", price: 10000, originalPrice: 15000, features: ["প্রিমিয়াম ম্যাচমেকিং", "ব্যাকগ্রাউন্ড চেক", "ফ্যামিলি ভেরিফিকেশন", "আনলিমিটেড ম্যাচ", "বিবাহ পরামর্শ"] },
  ], reviews: [{ name: "মোঃ রাশেদুল ইসলাম", rating: 5, date: "১৫ মার্চ ২০২৬", comment: "এখান থেকেই আমার জীবনসঙ্গী খুঁজে পেয়েছি। আলহামদুলিল্লাহ।" }], features: ["ভেরিফাইড বায়োডাটা", "ফ্যামিলি ভেরিফিকেশন", "প্রাইভেসি গ্যারান্টি", "কাউন্সেলিং"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "বরিশাল", "রংপুর", "ময়মনসিংহ", "কুমিল্লা"] },

  // --- Bike & Vehicle Servicing ---
  { slug: "bike-servicing", title: "বাইক সার্ভিসিং", titleEn: "Bike Servicing", description: "বাইক সার্ভিসিং, অয়েল চেঞ্জ, টিউনআপ ও রিপেয়ার। হোম সার্ভিস অপশন।", image: "/images/placeholder.svg", rating: 4.6, totalReviews: 1500, totalOrders: 9500, packages: [
    { name: "বেসিক সার্ভিস", price: 500, originalPrice: 800, features: ["অয়েল চেঞ্জ", "এয়ার ফিল্টার ক্লিন", "চেইন লুব"] },
    { name: "ফুল সার্ভিস", price: 1500, originalPrice: 2500, features: ["ইঞ্জিন টিউনআপ", "ব্রেক অ্যাডজাস্ট", "ক্লাচ চেক", "ওয়াশ"] },
    { name: "ওভারহলিং", price: 5000, originalPrice: 8000, features: ["ইঞ্জিন ওভারহল", "পার্টস রিপ্লেস", "পেইন্ট টাচআপ", "৩ মাস ওয়ারেন্টি"] },
  ], reviews: [{ name: "সাইফুল ইসলাম", rating: 5, date: "১৮ মার্চ ২০২৬", comment: "বাসায় এসে বাইক সার্ভিস করে গেছে। খুবই প্রফেশনাল।" }], features: ["হোম সার্ভিস", "অরিজিনাল পার্টস", "ওয়ারেন্টি", "পিকআপ ড্রপ"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "বরিশাল", "রংপুর", "ময়মনসিংহ", "কুমিল্লা"] },

  { slug: "tyre-battery", title: "টায়ার ও ব্যাটারি সার্ভিস", titleEn: "Tyre & Battery Service", description: "গাড়ি ও বাইকের টায়ার পরিবর্তন, পাংচার রিপেয়ার ও ব্যাটারি সার্ভিস।", image: "/images/placeholder.svg", rating: 4.5, totalReviews: 820, totalOrders: 5500, packages: [
    { name: "পাংচার রিপেয়ার", price: 200, originalPrice: 350, features: ["রোডসাইড সার্ভিস", "টিউবলেস রিপেয়ার", "এয়ার চেক"] },
    { name: "টায়ার চেঞ্জ", price: 500, originalPrice: 800, features: ["টায়ার ফিটিং", "অ্যালাইনমেন্ট", "ব্যালেন্সিং"] },
    { name: "ব্যাটারি সার্ভিস", price: 1000, originalPrice: 1500, features: ["ব্যাটারি চেক", "জাম্প স্টার্ট", "ব্যাটারি রিপ্লেস", "হোম সার্ভিস"] },
  ], reviews: [{ name: "মাহমুদুল হাসান", rating: 4, date: "১৭ মার্চ ২০২৬", comment: "রাস্তায় পাংচার হয়ে গিয়েছিল, ২০ মিনিটে এসে ঠিক করে দিয়েছে।" }], features: ["রোডসাইড সার্ভিস", "২৪/৭ ইমার্জেন্সি", "অরিজিনাল পার্টস", "ওয়ারেন্টি"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "বরিশাল", "রংপুর", "ময়মনসিংহ"] },

  // --- Event Rentals ---
  { slug: "tent-pandal", title: "তাঁবু ও প্যান্ডেল ভাড়া", titleEn: "Tent & Pandal Rental", description: "বিয়ে, মিলাদ, জানাজা, মেলা ও যেকোনো অনুষ্ঠানের জন্য তাঁবু, শামিয়ানা ও প্যান্ডেল ভাড়া।", image: "/images/placeholder.svg", rating: 4.5, totalReviews: 950, totalOrders: 6200, packages: [
    { name: "স্মল ইভেন্ট", price: 3000, originalPrice: 5000, features: ["শামিয়ানা", "৫০ জন ক্যাপাসিটি", "চেয়ার-টেবিল"] },
    { name: "মিডিয়াম", price: 8000, originalPrice: 12000, features: ["ডেকোরেটিভ প্যান্ডেল", "১৫০ জন", "লাইটিং", "কার্পেট"] },
    { name: "লার্জ ইভেন্ট", price: 20000, originalPrice: 30000, features: ["প্রিমিয়াম প্যান্ডেল", "৫০০+ জন", "স্টেজ+গেট", "AC টেন্ট অপশন"] },
  ], reviews: [{ name: "আব্দুর রহিম", rating: 5, date: "১৬ মার্চ ২০২৬", comment: "মেয়ের বিয়েতে প্যান্ডেল নিয়েছিলাম। সবকিছু নিখুঁত ছিল।" }], features: ["সেটআপ ও রিমুভাল", "ডেকোরেশন", "লাইটিং", "চেয়ার-টেবিল"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "বরিশাল", "রংপুর", "ময়মনসিংহ", "কুমিল্লা"] },

  // --- Signboard & Banner ---
  { slug: "signboard-banner", title: "সাইনবোর্ড ও ব্যানার", titleEn: "Signboard & Banner", description: "দোকান, অফিস ও ইভেন্টের জন্য LED সাইনবোর্ড, নিয়ন সাইন, ব্যানার ও ফেস্টুন তৈরি।", image: "/images/placeholder.svg", rating: 4.6, totalReviews: 680, totalOrders: 4500, packages: [
    { name: "ভিনাইল ব্যানার", price: 500, originalPrice: 800, features: ["৩x৫ ফুট", "ফুল কালার প্রিন্ট", "আইলেট ফিনিশ"] },
    { name: "LED সাইনবোর্ড", price: 5000, originalPrice: 8000, features: ["৪x৮ ফুট পর্যন্ত", "LED ব্যাকলিট", "ইনস্টলেশন ফ্রি"] },
    { name: "নিয়ন/3D সাইন", price: 15000, originalPrice: 22000, features: ["কাস্টম ডিজাইন", "নিয়ন ফ্লেক্স/3D লেটার", "ওয়াটারপ্রুফ", "ওয়ারেন্টি"] },
  ], reviews: [{ name: "কামাল হোসেন", rating: 5, date: "১৪ মার্চ ২০২৬", comment: "দোকানের LED সাইনবোর্ড অসাধারণ হয়েছে। রাতে দারুণ দেখায়।" }], features: ["কাস্টম ডিজাইন", "ইনস্টলেশন", "ওয়াটারপ্রুফ", "ওয়ারেন্টি"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "বরিশাল", "রংপুর", "ময়মনসিংহ", "কুমিল্লা"] },

  // --- Remittance ---
  { slug: "money-transfer", title: "মানি ট্রান্সফার ও রেমিট্যান্স", titleEn: "Money Transfer & Remittance", description: "দেশে-বিদেশে টাকা পাঠানো ও গ্রহণ। ব্যাংক, বিকাশ, নগদ ও ওয়েস্টার্ন ইউনিয়ন।", image: "/images/placeholder.svg", rating: 4.5, totalReviews: 1500, totalOrders: 12000, packages: [
    { name: "দেশের ভেতর", price: 25, originalPrice: 50, features: ["বিকাশ/নগদ/রকেট", "ইনস্ট্যান্ট ট্রান্সফার", "যেকোনো অ্যামাউন্ট"] },
    { name: "বিদেশ থেকে গ্রহণ", price: 0, originalPrice: 0, features: ["রেমিট্যান্স কালেকশন", "ওয়েস্টার্ন ইউনিয়ন", "ব্যাংক ট্রান্সফার", "ফ্রি সার্ভিস"] },
    { name: "বিদেশে পাঠানো", price: 200, originalPrice: 500, features: ["ইন্টারন্যাশনাল ট্রান্সফার", "কম্পিটিটিভ রেট", "ট্র্যাকিং", "১-৩ দিনে ডেলিভারি"] },
  ], reviews: [{ name: "মোঃ আবু বকর", rating: 4, date: "১৯ মার্চ ২০২৬", comment: "মালয়েশিয়া থেকে বাড়িতে টাকা পাঠিয়েছি। রেট ভালো ছিল।" }], features: ["নিরাপদ ট্রান্সফার", "কম ফি", "দ্রুত ডেলিভারি", "রিয়েল-টাইম রেট"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "বরিশাল", "রংপুর", "ময়মনসিংহ", "কুমিল্লা"] },

  // --- Wellness ---
  { slug: "yoga-meditation", title: "ইয়োগা ও মেডিটেশন", titleEn: "Yoga & Meditation", description: "প্রশিক্ষিত ইন্সট্রাক্টরের সাথে ইয়োগা, মেডিটেশন ও মাইন্ডফুলনেস সেশন।", image: "/images/placeholder.svg", rating: 4.7, totalReviews: 420, totalOrders: 2800, packages: [
    { name: "বেসিক", price: 2000, originalPrice: 3500, features: ["মাসে ৮ সেশন", "গ্রুপ ক্লাস", "অনলাইন/অফলাইন"] },
    { name: "প্রাইভেট", price: 5000, originalPrice: 8000, features: ["মাসে ১২ সেশন", "ওয়ান-টু-ওয়ান", "হোম ভিজিট", "কাস্টম প্ল্যান"] },
    { name: "প্রিমিয়াম ওয়েলনেস", price: 10000, originalPrice: 15000, features: ["ডেইলি সেশন", "ইয়োগা+মেডিটেশন+ব্রিদিং", "নিউট্রিশন গাইড", "মেন্টাল হেলথ সাপোর্ট"] },
  ], reviews: [{ name: "ফারজানা রহমান", rating: 5, date: "২০ মার্চ ২০২৬", comment: "৩ মাসে স্ট্রেস অনেক কমেছে। ইন্সট্রাক্টর খুবই দক্ষ।" }], features: ["সার্টিফাইড ইন্সট্রাক্টর", "হোম/অনলাইন", "সকল বয়সের জন্য", "মেন্টাল হেলথ"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট"] },

  // --- Funeral & Religious ---
  { slug: "janaza-service", title: "জানাজা ও দাফন সার্ভিস", titleEn: "Janaza & Burial Service", description: "জানাজার আয়োজন, গোসল, কাফন, কবর খনন ও দাফন সংক্রান্ত সকল সার্ভিস।", image: "/images/placeholder.svg", rating: 4.9, totalReviews: 350, totalOrders: 2200, packages: [
    { name: "বেসিক সার্ভিস", price: 3000, originalPrice: 5000, features: ["গোসল ও কাফন", "জানাজা আয়োজন", "কবর প্রস্তুতি"] },
    { name: "ফুল সার্ভিস", price: 8000, originalPrice: 12000, features: ["সম্পূর্ণ আয়োজন", "এম্বুল্যান্স", "গোরস্থান বুকিং", "খাবার ব্যবস্থা"] },
    { name: "প্রিমিয়াম", price: 15000, originalPrice: 20000, features: ["ফুল ম্যানেজমেন্ট", "দূরবর্তী পরিবহন", "কবরের স্থায়ী নির্মাণ", "কুরআন খতম"] },
  ], reviews: [{ name: "মোঃ আনোয়ার হোসেন", rating: 5, date: "১০ মার্চ ২০২৬", comment: "কঠিন সময়ে সবকিছু সুন্দরভাবে সামলে দিয়েছে। জাযাকাল্লাহ।" }], features: ["২৪/৭ সার্ভিস", "ইসলামিক রীতি অনুযায়ী", "দ্রুত সার্ভিস", "সম্মানজনক ব্যবস্থাপনা"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "বরিশাল", "রংপুর", "ময়মনসিংহ", "কুমিল্লা"] },

  // --- Driving School ---
  { slug: "driving-school", title: "ড্রাইভিং স্কুল ও ট্রেনিং", titleEn: "Driving School & Training", description: "গাড়ি, বাইক ও হেভি ভেহিকেল ড্রাইভিং প্রশিক্ষণ এবং লাইসেন্স সহায়তা।", image: "/images/placeholder.svg", rating: 4.6, totalReviews: 820, totalOrders: 5500, packages: [
    { name: "বাইক কোর্স", price: 3000, originalPrice: 5000, features: ["১০ দিনের কোর্স", "বাইক সরবরাহ", "সার্টিফিকেট"] },
    { name: "কার কোর্স", price: 8000, originalPrice: 12000, features: ["৩০ দিনের কোর্স", "গাড়ি সরবরাহ", "লাইসেন্স সহায়তা", "হাইওয়ে প্র্যাকটিস"] },
    { name: "প্রিমিয়াম", price: 15000, originalPrice: 20000, features: ["৪৫ দিনের কোর্স", "কার+বাইক উভয়", "ডিফেন্সিভ ড্রাইভিং", "BRTA লাইসেন্স পূর্ণ সহায়তা"] },
  ], reviews: [{ name: "রাফি ইসলাম", rating: 5, date: "১৫ মার্চ ২০২৬", comment: "মাত্র ২০ দিনে গাড়ি চালানো শিখেছি। ইন্সট্রাক্টর অনেক ধৈর্যশীল।" }], features: ["BRTA অনুমোদিত", "অভিজ্ঞ ইন্সট্রাক্টর", "নিজস্ব গাড়ি", "লাইসেন্স সাপোর্ট"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "রংপুর", "ময়মনসিংহ", "কুমিল্লা"] },

  // --- Hajj & Umrah ---
  { slug: "hajj-umrah", title: "হজ্জ ও ওমরাহ সার্ভিস", titleEn: "Hajj & Umrah Services", description: "সম্পূর্ণ হজ্জ ও ওমরাহ প্যাকেজ — ভিসা, ফ্লাইট, হোটেল ও গাইড সহ।", image: "/images/placeholder.svg", rating: 4.8, totalReviews: 1200, totalOrders: 8000, packages: [
    { name: "ওমরাহ ইকোনমি", price: 120000, originalPrice: 150000, features: ["ভিসা প্রসেসিং", "রিটার্ন ফ্লাইট", "শেয়ার্ড হোটেল", "গ্রুপ গাইড"] },
    { name: "ওমরাহ প্রিমিয়াম", price: 200000, originalPrice: 250000, features: ["ভিসা+ফ্লাইট", "৫-স্টার হোটেল", "প্রাইভেট গাইড", "জিয়ারত ট্যুর", "ল্যান্ড ট্রান্সপোর্ট"] },
    { name: "হজ্জ ফুল প্যাকেজ", price: 550000, originalPrice: 700000, features: ["সরকারি রেজিস্ট্রেশন", "ফ্লাইট+হোটেল+খাবার", "ট্রেনিং প্রোগ্রাম", "মিনা-আরাফাত তাবু", "২৪/৭ মেডিকেল সাপোর্ট"] },
  ], reviews: [{ name: "হাজী আব্দুর রহিম", rating: 5, date: "১ মার্চ ২০২৬", comment: "আলহামদুলিল্লাহ, সবকিছু চমৎকারভাবে আয়োজন করা হয়েছিল।" }], features: ["সরকার অনুমোদিত", "অভিজ্ঞ গাইড", "মেডিকেল সাপোর্ট", "ট্রেনিং প্রোগ্রাম"], availableCities: ["ঢাকা", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "বরিশাল", "রংপুর", "ময়মনসিংহ"] },

  // --- Mehendi Service ---
  { slug: "mehendi-service", title: "মেহেদী সার্ভিস", titleEn: "Mehendi / Henna Service", description: "বিয়ে, গায়ে হলুদ ও বিভিন্ন অনুষ্ঠানের জন্য প্রফেশনাল মেহেদী আর্টিস্ট।", image: "/images/placeholder.svg", rating: 4.7, totalReviews: 950, totalOrders: 6000, packages: [
    { name: "বেসিক", price: 1500, originalPrice: 2500, features: ["দুই হাত", "সিম্পল ডিজাইন", "ন্যাচারাল মেহেদী"] },
    { name: "স্ট্যান্ডার্ড", price: 3500, originalPrice: 5000, features: ["দুই হাত+পা", "ইন্ট্রিকেট ডিজাইন", "প্রিমিয়াম মেহেদী", "হোম ভিজিট"] },
    { name: "ব্রাইডাল প্যাকেজ", price: 8000, originalPrice: 12000, features: ["ফুল হাত ও পা", "অ্যারাবিক/ইন্ডিয়ান ডিজাইন", "গ্লিটার ও স্টোন", "৩-৪ ঘণ্টা সেশন", "টাচ-আপ ফ্রি"] },
  ], reviews: [{ name: "তাসনিম আক্তার", rating: 5, date: "২৫ ফেব্রুয়ারি ২০২৬", comment: "গায়ে হলুদে অসাধারণ ডিজাইন করেছে। সবাই খুব প্রশংসা করেছে।" }], features: ["প্রফেশনাল আর্টিস্ট", "অর্গানিক মেহেদী", "হোম সার্ভিস", "কাস্টম ডিজাইন"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "কুমিল্লা"] },

  // --- Bridal Makeup ---
  { slug: "bridal-makeup", title: "ব্রাইডাল মেকআপ", titleEn: "Bridal Makeup", description: "বিয়ের দিনের জন্য প্রফেশনাল ব্রাইডাল মেকআপ, হেয়ার স্টাইলিং ও শাড়ি ড্রেপিং।", image: "/images/placeholder.svg", rating: 4.8, totalReviews: 1100, totalOrders: 7000, packages: [
    { name: "বেসিক ব্রাইডাল", price: 8000, originalPrice: 12000, features: ["ফুল ফেস মেকআপ", "হেয়ার স্টাইলিং", "শাড়ি ড্রেপিং"] },
    { name: "প্রিমিয়াম ব্রাইডাল", price: 20000, originalPrice: 30000, features: ["HD মেকআপ", "এয়ারব্রাশ ফিনিশ", "হেয়ার স্টাইলিং", "জুয়েলারি সেটিং", "শাড়ি/লেহেঙ্গা ড্রেপিং"] },
    { name: "সিগনেচার প্যাকেজ", price: 40000, originalPrice: 55000, features: ["সেলিব্রিটি মেকআপ আর্টিস্ট", "ট্রায়াল সেশন ফ্রি", "গায়ে হলুদ+বিয়ে+রিসেপশন", "ফ্যামিলি মেকআপ ডিসকাউন্ট", "ফটোশুট রেডি"] },
  ], reviews: [{ name: "সাদিয়া জাহান", rating: 5, date: "২০ ফেব্রুয়ারি ২০২৬", comment: "জীবনের সেরা দিনে সেরা মেকআপ পেয়েছি। আর্টিস্ট অসাধারণ!" }], features: ["সার্টিফাইড আর্টিস্ট", "ব্র্যান্ডেড প্রোডাক্ট", "হোম সার্ভিস", "ট্রায়াল অপশন"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "কুমিল্লা", "বরিশাল"] },

  // --- Locksmith ---
  { slug: "locksmith", title: "তালা ও চাবি সার্ভিস", titleEn: "Locksmith Service", description: "দরজা, গাড়ি ও সেফের তালা খোলা, মেরামত ও ডুপ্লিকেট চাবি তৈরি।", image: "/images/placeholder.svg", rating: 4.5, totalReviews: 600, totalOrders: 4500, packages: [
    { name: "বেসিক", price: 300, originalPrice: 500, features: ["তালা খোলা", "ডুপ্লিকেট চাবি ১টি", "সাধারণ তালা"] },
    { name: "স্ট্যান্ডার্ড", price: 800, originalPrice: 1200, features: ["তালা খোলা/পরিবর্তন", "ডুপ্লিকেট চাবি ৩টি", "ডিজিটাল লক সাপোর্ট"] },
    { name: "ইমার্জেন্সি", price: 1500, originalPrice: 2000, features: ["২৪/৭ সার্ভিস", "গাড়ি/সেফ লক", "স্মার্ট লক ইনস্টলেশন", "৩০ মিনিটে হাজির"] },
  ], reviews: [{ name: "মো: কামরুল হাসান", rating: 5, date: "১২ মার্চ ২০২৬", comment: "রাত ১২টায় তালা আটকে গিয়েছিল, ২০ মিনিটে এসে খুলে দিয়েছে।" }], features: ["২৪/৭ ইমার্জেন্সি", "দ্রুত সার্ভিস", "সকল ধরনের তালা", "গ্যারান্টি সহ"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "কুমিল্লা", "রংপুর", "ময়মনসিংহ"] },

  // --- Gym & Fitness ---
  { slug: "gym-fitness", title: "জিম ও ফিটনেস", titleEn: "Gym & Fitness", description: "পার্সোনাল ট্রেনিং, হোম জিম সেটআপ এবং ফিটনেস কনসালটেশন।", image: "/images/placeholder.svg", rating: 4.6, totalReviews: 700, totalOrders: 4000, packages: [
    { name: "বেসিক কনসালটেশন", price: 1000, originalPrice: 1500, features: ["ফিটনেস অ্যাসেসমেন্ট", "ডায়েট চার্ট", "১ মাসের প্ল্যান"] },
    { name: "পার্সোনাল ট্রেনিং", price: 5000, originalPrice: 8000, features: ["মাসে ১২ সেশন", "কাস্টম ওয়ার্কআউট", "নিউট্রিশন গাইড", "প্রোগ্রেস ট্র্যাকিং"] },
    { name: "হোম জিম সেটআপ", price: 25000, originalPrice: 35000, features: ["ইকুইপমেন্ট সিলেকশন", "ইনস্টলেশন", "৩ মাস ট্রেনিং", "মেইনটেন্যান্স গাইড"] },
  ], reviews: [{ name: "শাকিব আহমেদ", rating: 5, date: "৫ মার্চ ২০২৬", comment: "৩ মাসে ১০ কেজি ওজন কমেছে। ট্রেইনার অনেক মোটিভেটিং।" }], features: ["সার্টিফাইড ট্রেইনার", "হোম/জিম সেশন", "ডায়েট প্ল্যান", "প্রোগ্রেস ট্র্যাকিং"], availableCities: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট"] },
];

export const getServiceBySlug = (slug: string): ServiceData | undefined => {
  return allServices.find((s) => s.slug === slug);
};

export const getServicesByCity = (city: string): ServiceData[] => {
  return allServices.filter((s) => s.availableCities.includes(city));
};
