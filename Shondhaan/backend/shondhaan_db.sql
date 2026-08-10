-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jul 04, 2026 at 03:36 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `yess-service`
--

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `name_en` varchar(255) DEFAULT NULL,
  `icon` varchar(255) DEFAULT NULL,
  `color_key` varchar(50) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`id`, `name`, `name_en`, `icon`, `color_key`, `is_active`, `created_at`, `updated_at`) VALUES
('090ad249-7a3f-480e-8b18-1bad966a4019', 'লোকবল ও শ্রমিক সরবরাহ', 'Manpower Supply', 'https://jsofjjymcbdllzsuomzp.supabase.co/storage/v1/object/public/cms-images/categories/icon-manpower.png', 'amber', 1, '2026-07-04 09:17:43', '2026-07-04 09:17:43'),
('122f6627-bb0e-4888-b4bc-ac3907b11c68', 'কম্পিউটার ও ল্যাপটপ', 'Computer & Laptop', 'https://jsofjjymcbdllzsuomzp.supabase.co/storage/v1/object/public/cms-images/categories/icon-computer.png', '#9333ea', 1, '2026-07-04 09:17:43', '2026-07-04 09:17:43'),
('16ff2c4c-5eb2-4ce8-ac9f-0c8f476c69ca', 'সিসিটিভি ও সিকিউরিটি', 'CCTV & Security', 'https://jsofjjymcbdllzsuomzp.supabase.co/storage/v1/object/public/cms-images/categories/icon-cctv.png', 'slate', 1, '2026-07-04 09:17:43', '2026-07-04 09:17:43'),
('1b0d03de-62b0-4a2e-b4b0-893700f5b00f', 'ইন্টেরিয়র ডিজাইন', 'Interior Design', 'https://jsofjjymcbdllzsuomzp.supabase.co/storage/v1/object/public/cms-images/categories/icon-interior.png', 'pink', 1, '2026-07-04 09:17:43', '2026-07-04 09:17:43'),
('218ed5a2-a6d3-4303-8caa-59dbac21f285', 'সন্ধান কেনাবেচা', 'Yes Kenabecha', 'https://jsofjjymcbdllzsuomzp.supabase.co/storage/v1/object/public/cms-images/categories%2Fcat-kenabecha.png', 'yellow', 1, '2026-07-04 09:17:43', '2026-07-04 09:17:43'),
('2310bd18-b335-443e-ba96-3e103a3733ea', 'টিউশন ও কোচিং', 'Tuition & Coaching', 'https://jsofjjymcbdllzsuomzp.supabase.co/storage/v1/object/public/cms-images/categories/icon-tuition.png', 'emerald', 1, '2026-07-04 09:17:43', '2026-07-04 09:17:43'),
('278621fa-28dd-47bb-8093-770d77b75959', 'অ্যাম্বুলেন্স সার্ভিস', 'Ambulance Service', 'https://jsofjjymcbdllzsuomzp.supabase.co/storage/v1/object/public/cms-images/categories/icon-ambulance.png', 'red', 1, '2026-07-04 09:17:43', '2026-07-04 09:17:43'),
('2c3e5372-612f-4a9d-95ac-0c5eafdf042a', 'মোবাইল রিপেয়ার', 'Mobile Repair', 'https://jsofjjymcbdllzsuomzp.supabase.co/storage/v1/object/public/cms-images/categories/icon-mobile.png', 'fuchsia', 1, '2026-07-04 09:17:43', '2026-07-04 09:17:43'),
('3248c3c6-ef26-4378-8531-4e7675bb7f4f', 'রেন্ট এ কার', 'Rent a Car', 'https://jsofjjymcbdllzsuomzp.supabase.co/storage/v1/object/public/cms-images/categories/icon-car-rent.png', 'emerald', 1, '2026-07-04 09:17:43', '2026-07-04 09:17:43'),
('36e8b451-4f56-4632-b7c0-ef662dabf43d', 'ফ্রিজ ও ওয়াশিং মেশিন', 'Fridge & Washing Machine', 'https://jsofjjymcbdllzsuomzp.supabase.co/storage/v1/object/public/cms-images/categories/icon-fridge.png', 'cyan', 1, '2026-07-04 09:17:43', '2026-07-04 09:17:43'),
('3b4dc685-13a8-4c34-a67d-66bf928b020d', 'সোলার প্যানেল', 'Solar Panel', 'https://jsofjjymcbdllzsuomzp.supabase.co/storage/v1/object/public/cms-images/categories/icon-solar.png', 'yellow', 1, '2026-07-04 09:17:43', '2026-07-04 09:17:43'),
('3ea11d3b-3a48-4c5c-9f5f-bc464a9768f5', 'সন্ধান মার্ট', 'Yes Mart', 'https://jsofjjymcbdllzsuomzp.supabase.co/storage/v1/object/public/cms-images/categories%2Fcat-mart.png', '#16a34a', 1, '2026-07-04 09:17:43', '2026-07-04 09:17:43'),
('44f4323f-627d-4122-a351-ba8ed0918c3e', 'গ্রিল ও ওয়েল্ডিং', 'Grill & Welding', 'https://jsofjjymcbdllzsuomzp.supabase.co/storage/v1/object/public/cms-images/categories/icon-welding.png', 'zinc', 1, '2026-07-04 09:17:43', '2026-07-04 09:17:43'),
('47dca6dc-e02e-49ff-88ec-5409c5750f0e', 'ডাক্তার ও টেলিমেডিসিন', 'Doctor & Telemedicine', 'https://jsofjjymcbdllzsuomzp.supabase.co/storage/v1/object/public/cms-images/categories/icon-doctor.png', 'teal', 1, '2026-07-04 09:17:43', '2026-07-04 09:17:43'),
('4c69c3b1-1a50-442b-8cbb-167b55952ea7', 'কুরিয়ার ও ডেলিভারি', 'Courier & Delivery', 'https://jsofjjymcbdllzsuomzp.supabase.co/storage/v1/object/public/cms-images/categories/icon-courier.png', 'blue', 1, '2026-07-04 09:17:43', '2026-07-04 09:17:43'),
('5997b9ff-1daf-46f1-938a-fa6e3e5f6bb1', 'ইভেন্ট ম্যানেজমেন্ট', 'Event Management', 'https://jsofjjymcbdllzsuomzp.supabase.co/storage/v1/object/public/cms-images/categories/icon-event.png', 'amber', 1, '2026-07-04 09:17:43', '2026-07-04 09:17:43'),
('60ee280a-964c-42f4-839c-e7cfdf232638', 'ওয়াটারপ্রুফিং', 'Waterproofing', 'https://jsofjjymcbdllzsuomzp.supabase.co/storage/v1/object/public/cms-images/categories/icon-waterproofing.png', 'sky', 1, '2026-07-04 09:17:43', '2026-07-04 09:17:43'),
('83a8965b-173a-483e-89e4-7c9c66d1bedc', 'ট্রাভেল ও ভিসা', 'Travel & Visa', 'https://jsofjjymcbdllzsuomzp.supabase.co/storage/v1/object/public/cms-images/categories/icon-travel.png', 'sky', 1, '2026-07-04 09:17:43', '2026-07-04 09:17:43'),
('847fd780-5631-4542-abc8-4e2e4d7f34e1', 'ক্যাটারিং', 'Catering', 'https://jsofjjymcbdllzsuomzp.supabase.co/storage/v1/object/public/cms-images/categories/icon-catering.png', 'rose', 1, '2026-07-04 09:17:43', '2026-07-04 09:17:43'),
('8db78da6-c60d-48ae-9648-9d8b6d2d4b1e', 'ফায়ার সেফটি', 'Fire Safety', 'https://jsofjjymcbdllzsuomzp.supabase.co/storage/v1/object/public/cms-images/categories/icon-fire.png', 'red', 1, '2026-07-04 09:17:43', '2026-07-04 09:17:43'),
('919ea627-86ec-4509-a68f-05f54ed8accf', 'বাগান ও ল্যান্ডস্কেপ', 'Garden & Landscape', 'https://jsofjjymcbdllzsuomzp.supabase.co/storage/v1/object/public/cms-images/categories/icon-garden.png', '#16a34a', 1, '2026-07-04 09:17:43', '2026-07-04 09:17:43'),
('9e39f66a-9a12-48e5-8d97-b05b700c8be1', 'চাকুরি ও রিক্রুটমেন্ট', 'Job & Recruitment', 'https://jsofjjymcbdllzsuomzp.supabase.co/storage/v1/object/public/cms-images/categories/icon-job.png', 'indigo', 1, '2026-07-04 09:17:43', '2026-07-04 09:17:43'),
('9f4c154f-3bcd-4a71-a4c2-6f803144d8e4', 'ডোমেস্টিক হেল্প', 'Domestic Help', 'https://jsofjjymcbdllzsuomzp.supabase.co/storage/v1/object/public/cms-images/categories/icon-domestic.png', '#78716c', 1, '2026-07-04 09:17:43', '2026-07-04 09:17:43'),
('9fe1374a-4e17-4a48-a44a-57ee7204ebb7', 'আইটি ও ওয়েব সার্ভিস', 'IT & Web Service', 'https://jsofjjymcbdllzsuomzp.supabase.co/storage/v1/object/public/cms-images/categories/icon-it.png', 'violet', 1, '2026-07-04 09:17:43', '2026-07-04 09:17:43'),
('a70c493a-4b8c-4b9a-a187-6e2e0081e1dd', 'টাইলস ও মোজাইক', 'Tiles & Mosaic', 'https://jsofjjymcbdllzsuomzp.supabase.co/storage/v1/object/public/cms-images/categories/icon-tiles.png', 'indigo', 1, '2026-07-04 09:17:43', '2026-07-04 09:17:43'),
('a9f8904e-a784-434c-a19a-235fede77da2', 'লন্ড্রি ও ড্রাইক্লিন', 'Laundry & Dry Clean', 'https://jsofjjymcbdllzsuomzp.supabase.co/storage/v1/object/public/cms-images/categories/icon-laundry.png', 'blue', 1, '2026-07-04 09:17:43', '2026-07-04 09:17:43'),
('ab6d9d7f-0008-4273-a781-14603c8641d4', 'সিকিউরিটি গার্ড সার্ভিস', 'Security Guard Service', 'https://jsofjjymcbdllzsuomzp.supabase.co/storage/v1/object/public/cms-images/categories/icon-security.png', '#374151', 1, '2026-07-04 09:17:43', '2026-07-04 09:17:43'),
('b0115353-d46b-4282-8b25-e31f5f5a4875', 'ফটোগ্রাফি ও ভিডিওগ্রাফি', 'Photography & Videography', 'https://jsofjjymcbdllzsuomzp.supabase.co/storage/v1/object/public/cms-images/categories/icon-photography.png', 'violet', 1, '2026-07-04 09:17:43', '2026-07-04 09:17:43'),
('b587b37a-aa6b-40d0-8f31-a33e00232978', 'কৃষি ও পশুপালন', 'Agriculture & Livestock', 'https://jsofjjymcbdllzsuomzp.supabase.co/storage/v1/object/public/cms-images/categories/icon-agriculture.png', 'lime', 1, '2026-07-04 09:17:43', '2026-07-04 09:17:43'),
('b750b925-39a9-4182-a810-1056df3740e9', 'কার্পেন্টার', 'Carpentry', 'https://jsofjjymcbdllzsuomzp.supabase.co/storage/v1/object/public/cms-images/categories/icon-carpentry.png', 'yellow', 1, '2026-07-04 09:17:43', '2026-07-04 09:17:43'),
('c1000001-0000-0000-0000-000000000001', 'এসি ও রেফ্রিজারেটর', 'AC & Refrigerator', 'https://jsofjjymcbdllzsuomzp.supabase.co/storage/v1/object/public/cms-images/categories/icon-ac.png', 'blue', 1, '2026-07-04 09:17:43', '2026-07-04 09:17:43'),
('c1000001-0000-0000-0000-000000000002', 'হোম ক্লিনিং', 'Home Cleaning', 'https://jsofjjymcbdllzsuomzp.supabase.co/storage/v1/object/public/cms-images/categories/icon-cleaning.png', 'emerald', 1, '2026-07-04 09:17:43', '2026-07-04 09:17:43'),
('c1000001-0000-0000-0000-000000000003', 'বিউটি ও সেলুন', 'Beauty & Salon', 'https://jsofjjymcbdllzsuomzp.supabase.co/storage/v1/object/public/cms-images/categories/icon-beauty.png', 'pink', 1, '2026-07-04 09:17:43', '2026-07-04 09:17:43'),
('c1000001-0000-0000-0000-000000000004', 'ইলেকট্রিক্যাল', 'Electrical', 'https://jsofjjymcbdllzsuomzp.supabase.co/storage/v1/object/public/cms-images/categories/icon-electrical.png', 'amber', 1, '2026-07-04 09:17:43', '2026-07-04 09:17:43'),
('c1000001-0000-0000-0000-000000000005', 'প্লাম্বিং ও স্যানিটারি', 'Plumbing & Sanitary', 'https://jsofjjymcbdllzsuomzp.supabase.co/storage/v1/object/public/cms-images/categories/icon-plumbing.png', 'teal', 1, '2026-07-04 09:17:43', '2026-07-04 09:17:43'),
('c1000001-0000-0000-0000-000000000006', 'পেইন্টিং', 'Painting', 'https://jsofjjymcbdllzsuomzp.supabase.co/storage/v1/object/public/cms-images/categories/icon-painting.png', 'violet', 1, '2026-07-04 09:17:43', '2026-07-04 09:17:43'),
('c1000001-0000-0000-0000-000000000007', 'হাউজ শিফটিং', 'House Shifting', 'https://jsofjjymcbdllzsuomzp.supabase.co/storage/v1/object/public/cms-images/categories/icon-shifting.png', 'orange', 1, '2026-07-04 09:17:43', '2026-07-04 09:17:43'),
('c1000001-0000-0000-0000-000000000008', 'অন ডিমান্ড ড্রাইভার', 'On Demand Driver', 'https://jsofjjymcbdllzsuomzp.supabase.co/storage/v1/object/public/cms-images/categories/icon-driver.png', 'slate', 1, '2026-07-04 09:17:43', '2026-07-04 09:17:43'),
('c1000001-0000-0000-0000-000000000009', 'অ্যাপ্লায়েন্স রিপেয়ার', 'Appliance Repair', 'https://jsofjjymcbdllzsuomzp.supabase.co/storage/v1/object/public/cms-images/categories/icon-appliance.png', 'red', 1, '2026-07-04 09:17:43', '2026-07-04 09:17:43'),
('c1000001-0000-0000-0000-000000000010', 'স্পা ও ওয়েলনেস', 'Spa & Wellness', 'https://jsofjjymcbdllzsuomzp.supabase.co/storage/v1/object/public/cms-images/categories/icon-spa.png', 'indigo', 1, '2026-07-04 09:17:43', '2026-07-04 09:17:43'),
('c1000001-0000-0000-0000-000000000011', 'পেস্ট কন্ট্রোল', 'Pest Control', 'https://jsofjjymcbdllzsuomzp.supabase.co/storage/v1/object/public/cms-images/categories/icon-pest-control.png', 'lime', 1, '2026-07-04 09:17:43', '2026-07-04 09:17:43'),
('c1000001-0000-0000-0000-000000000012', 'কার কেয়ার', 'Car Care', 'https://jsofjjymcbdllzsuomzp.supabase.co/storage/v1/object/public/cms-images/categories/icon-car-care.png', 'cyan', 1, '2026-07-04 09:17:43', '2026-07-04 09:17:43'),
('c1000001-0000-0000-0000-000000000013', 'ইলেকট্রনিক্স রিপেয়ার', 'Electronics Repair', 'https://jsofjjymcbdllzsuomzp.supabase.co/storage/v1/object/public/cms-images/categories/icon-electronics.png', 'sky', 1, '2026-07-04 09:17:43', '2026-07-04 09:17:43'),
('c1000001-0000-0000-0000-000000000014', 'নার্সিং কেয়ার', 'Nursing Care', 'https://jsofjjymcbdllzsuomzp.supabase.co/storage/v1/object/public/cms-images/categories/icon-nursing.png', 'rose', 1, '2026-07-04 09:17:43', '2026-07-04 09:17:43'),
('c1481b45-f6af-4ca6-a84a-4362bc56c8ae', 'নির্মাণ ও কনস্ট্রাকশন', 'Construction', 'https://jsofjjymcbdllzsuomzp.supabase.co/storage/v1/object/public/cms-images/categories/icon-construction.png', 'orange', 1, '2026-07-04 09:17:43', '2026-07-04 09:17:43'),
('c8e6fd41-6445-4f27-b048-aab5cec59636', 'লিফট ও এলিভেটর', 'Lift & Elevator', 'https://jsofjjymcbdllzsuomzp.supabase.co/storage/v1/object/public/cms-images/categories/icon-lift.png', '#4b5563', 1, '2026-07-04 09:17:43', '2026-07-04 09:17:43'),
('caa3fdfe-b5b3-40a3-92ff-c5313473fc11', 'দর্জি ও সেলাই', 'Tailoring', 'https://jsofjjymcbdllzsuomzp.supabase.co/storage/v1/object/public/cms-images/categories/icon-tailoring.png', 'teal', 1, '2026-07-04 09:17:43', '2026-07-04 09:17:43'),
('d37630ec-dfbd-4233-849b-dbdb79cf04b3', 'ট্রাক ও পরিবহন', 'Truck & Transport', 'https://jsofjjymcbdllzsuomzp.supabase.co/storage/v1/object/public/cms-images/categories/icon-truck.png', 'blue', 1, '2026-07-04 09:17:43', '2026-07-04 09:17:43'),
('d441eb6e-255b-4333-a338-93ef32b852dd', 'বাইক ও সাইকেল রেন্টাল', 'Bike & Cycle Rental', 'https://jsofjjymcbdllzsuomzp.supabase.co/storage/v1/object/public/cms-images/categories/icon-bike.png', 'cyan', 1, '2026-07-04 09:17:43', '2026-07-04 09:17:43'),
('d80e5b3b-adef-48ac-a845-2bddf79ae7d7', 'জেনারেটর ও আইপিএস', 'Generator & IPS', 'https://jsofjjymcbdllzsuomzp.supabase.co/storage/v1/object/public/cms-images/categories/icon-generator.png', 'orange', 1, '2026-07-04 09:17:43', '2026-07-04 09:17:43'),
('fbac423d-2628-4cb7-9edc-dda2f0c0e0dd', 'আইনি সার্ভিস', 'Legal Service', 'https://jsofjjymcbdllzsuomzp.supabase.co/storage/v1/object/public/cms-images/categories/icon-legal.png', 'stone', 1, '2026-07-04 09:17:43', '2026-07-04 09:17:43');

-- --------------------------------------------------------

--
-- Table structure for table `category_services`
--

CREATE TABLE `category_services` (
  `category_id` varchar(100) NOT NULL,
  `service_slug` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `category_services`
--

INSERT INTO `category_services` (`category_id`, `service_slug`) VALUES
('090ad249-7a3f-480e-8b18-1bad966a4019', 'daily-labor'),
('090ad249-7a3f-480e-8b18-1bad966a4019', 'skilled-worker'),
('122f6627-bb0e-4888-b4bc-ac3907b11c68', 'computer-repair'),
('122f6627-bb0e-4888-b4bc-ac3907b11c68', 'data-recovery'),
('122f6627-bb0e-4888-b4bc-ac3907b11c68', 'networking'),
('16ff2c4c-5eb2-4ce8-ac9f-0c8f476c69ca', 'access-control'),
('16ff2c4c-5eb2-4ce8-ac9f-0c8f476c69ca', 'cctv-installation'),
('1b0d03de-62b0-4a2e-b4b0-893700f5b00f', 'home-interior'),
('1b0d03de-62b0-4a2e-b4b0-893700f5b00f', 'interior-design'),
('1b0d03de-62b0-4a2e-b4b0-893700f5b00f', 'office-interior'),
('218ed5a2-a6d3-4303-8caa-59dbac21f285', 'buy-sell-electronics'),
('218ed5a2-a6d3-4303-8caa-59dbac21f285', 'buy-sell-furniture'),
('218ed5a2-a6d3-4303-8caa-59dbac21f285', 'buy-sell-vehicles'),
('218ed5a2-a6d3-4303-8caa-59dbac21f285', 'flat-rent'),
('218ed5a2-a6d3-4303-8caa-59dbac21f285', 'property-buy-sell'),
('2310bd18-b335-443e-ba96-3e103a3733ea', 'home-tutor'),
('2310bd18-b335-443e-ba96-3e103a3733ea', 'online-coaching'),
('2310bd18-b335-443e-ba96-3e103a3733ea', 'quran-tutor'),
('278621fa-28dd-47bb-8093-770d77b75959', 'ambulance-ac'),
('278621fa-28dd-47bb-8093-770d77b75959', 'icu-ambulance'),
('2c3e5372-612f-4a9d-95ac-0c5eafdf042a', 'mobile-battery'),
('2c3e5372-612f-4a9d-95ac-0c5eafdf042a', 'mobile-screen'),
('3248c3c6-ef26-4378-8531-4e7675bb7f4f', 'luxury-rent'),
('3248c3c6-ef26-4378-8531-4e7675bb7f4f', 'microbus-rent'),
('3248c3c6-ef26-4378-8531-4e7675bb7f4f', 'sedan-rent'),
('36e8b451-4f56-4632-b7c0-ef662dabf43d', 'fridge-service'),
('36e8b451-4f56-4632-b7c0-ef662dabf43d', 'washing-service'),
('3b4dc685-13a8-4c34-a67d-66bf928b020d', 'solar-installation'),
('3b4dc685-13a8-4c34-a67d-66bf928b020d', 'solar-maintenance'),
('3ea11d3b-3a48-4c5c-9f5f-bc464a9768f5', 'bill-pay'),
('3ea11d3b-3a48-4c5c-9f5f-bc464a9768f5', 'cake-delivery'),
('3ea11d3b-3a48-4c5c-9f5f-bc464a9768f5', 'fish-meat-market'),
('3ea11d3b-3a48-4c5c-9f5f-bc464a9768f5', 'gas-cylinder'),
('3ea11d3b-3a48-4c5c-9f5f-bc464a9768f5', 'grocery-delivery'),
('3ea11d3b-3a48-4c5c-9f5f-bc464a9768f5', 'jar-water'),
('3ea11d3b-3a48-4c5c-9f5f-bc464a9768f5', 'money-transfer'),
('3ea11d3b-3a48-4c5c-9f5f-bc464a9768f5', 'vegetables-fruits'),
('44f4323f-627d-4122-a351-ba8ed0918c3e', 'glass-aluminum'),
('44f4323f-627d-4122-a351-ba8ed0918c3e', 'iron-welding'),
('44f4323f-627d-4122-a351-ba8ed0918c3e', 'ss-grill'),
('44f4323f-627d-4122-a351-ba8ed0918c3e', 'welding-grill'),
('47dca6dc-e02e-49ff-88ec-5409c5750f0e', 'blood-bank'),
('47dca6dc-e02e-49ff-88ec-5409c5750f0e', 'diagnostic-center'),
('47dca6dc-e02e-49ff-88ec-5409c5750f0e', 'health-checkup'),
('47dca6dc-e02e-49ff-88ec-5409c5750f0e', 'home-doctor'),
('47dca6dc-e02e-49ff-88ec-5409c5750f0e', 'lab-test'),
('47dca6dc-e02e-49ff-88ec-5409c5750f0e', 'medicine-delivery'),
('47dca6dc-e02e-49ff-88ec-5409c5750f0e', 'online-doctor'),
('47dca6dc-e02e-49ff-88ec-5409c5750f0e', 'oxygen-cylinder'),
('47dca6dc-e02e-49ff-88ec-5409c5750f0e', 'personal-trainer'),
('47dca6dc-e02e-49ff-88ec-5409c5750f0e', 'pet-care'),
('47dca6dc-e02e-49ff-88ec-5409c5750f0e', 'yoga-meditation'),
('4c69c3b1-1a50-442b-8cbb-167b55952ea7', 'document-courier'),
('4c69c3b1-1a50-442b-8cbb-167b55952ea7', 'ecommerce-shipping'),
('4c69c3b1-1a50-442b-8cbb-167b55952ea7', 'parcel-delivery'),
('5997b9ff-1daf-46f1-938a-fa6e3e5f6bb1', 'birthday-event'),
('5997b9ff-1daf-46f1-938a-fa6e3e5f6bb1', 'commercial-production'),
('5997b9ff-1daf-46f1-938a-fa6e3e5f6bb1', 'concert-cultural'),
('5997b9ff-1daf-46f1-938a-fa6e3e5f6bb1', 'corporate-event'),
('5997b9ff-1daf-46f1-938a-fa6e3e5f6bb1', 'documentary'),
('5997b9ff-1daf-46f1-938a-fa6e3e5f6bb1', 'drama-production'),
('5997b9ff-1daf-46f1-938a-fa6e3e5f6bb1', 'event-mc'),
('5997b9ff-1daf-46f1-938a-fa6e3e5f6bb1', 'fair-management'),
('5997b9ff-1daf-46f1-938a-fa6e3e5f6bb1', 'flower-delivery'),
('5997b9ff-1daf-46f1-938a-fa6e3e5f6bb1', 'gift-delivery'),
('5997b9ff-1daf-46f1-938a-fa6e3e5f6bb1', 'marriage-media'),
('5997b9ff-1daf-46f1-938a-fa6e3e5f6bb1', 'music-production'),
('5997b9ff-1daf-46f1-938a-fa6e3e5f6bb1', 'music-video'),
('5997b9ff-1daf-46f1-938a-fa6e3e5f6bb1', 'short-film'),
('5997b9ff-1daf-46f1-938a-fa6e3e5f6bb1', 'sound-lighting'),
('5997b9ff-1daf-46f1-938a-fa6e3e5f6bb1', 'stage-decoration'),
('5997b9ff-1daf-46f1-938a-fa6e3e5f6bb1', 'tent-pandal'),
('5997b9ff-1daf-46f1-938a-fa6e3e5f6bb1', 'voice-artist'),
('5997b9ff-1daf-46f1-938a-fa6e3e5f6bb1', 'web-series'),
('5997b9ff-1daf-46f1-938a-fa6e3e5f6bb1', 'wedding-planning'),
('60ee280a-964c-42f4-839c-e7cfdf232638', 'bathroom-waterproofing'),
('60ee280a-964c-42f4-839c-e7cfdf232638', 'roof-waterproofing'),
('83a8965b-173a-483e-89e4-7c9c66d1bedc', 'air-ticket'),
('83a8965b-173a-483e-89e4-7c9c66d1bedc', 'hajj-umrah'),
('83a8965b-173a-483e-89e4-7c9c66d1bedc', 'tour-package'),
('83a8965b-173a-483e-89e4-7c9c66d1bedc', 'visa-processing'),
('847fd780-5631-4542-abc8-4e2e4d7f34e1', 'catering-service'),
('847fd780-5631-4542-abc8-4e2e4d7f34e1', 'party-catering'),
('847fd780-5631-4542-abc8-4e2e4d7f34e1', 'tiffin-service'),
('847fd780-5631-4542-abc8-4e2e4d7f34e1', 'wedding-catering'),
('8db78da6-c60d-48ae-9648-9d8b6d2d4b1e', 'fire-alarm-system'),
('8db78da6-c60d-48ae-9648-9d8b6d2d4b1e', 'fire-extinguisher'),
('919ea627-86ec-4509-a68f-05f54ed8accf', 'garden-maintenance'),
('919ea627-86ec-4509-a68f-05f54ed8accf', 'landscape-design'),
('9e39f66a-9a12-48e5-8d97-b05b700c8be1', 'job-placement'),
('9e39f66a-9a12-48e5-8d97-b05b700c8be1', 'overseas-job'),
('9f4c154f-3bcd-4a71-a4c2-6f803144d8e4', 'babysitter'),
('9f4c154f-3bcd-4a71-a4c2-6f803144d8e4', 'cook-service'),
('9f4c154f-3bcd-4a71-a4c2-6f803144d8e4', 'janaza-service'),
('9f4c154f-3bcd-4a71-a4c2-6f803144d8e4', 'locksmith'),
('9f4c154f-3bcd-4a71-a4c2-6f803144d8e4', 'maid-service'),
('9fe1374a-4e17-4a48-a44a-57ee7204ebb7', 'cyber-security'),
('9fe1374a-4e17-4a48-a44a-57ee7204ebb7', 'digital-marketing'),
('9fe1374a-4e17-4a48-a44a-57ee7204ebb7', 'domain-hosting'),
('9fe1374a-4e17-4a48-a44a-57ee7204ebb7', 'graphics-design'),
('9fe1374a-4e17-4a48-a44a-57ee7204ebb7', 'printing-binding'),
('9fe1374a-4e17-4a48-a44a-57ee7204ebb7', 'seo-service'),
('9fe1374a-4e17-4a48-a44a-57ee7204ebb7', 'signboard-banner'),
('9fe1374a-4e17-4a48-a44a-57ee7204ebb7', 'software-development'),
('9fe1374a-4e17-4a48-a44a-57ee7204ebb7', 'ui-ux-design'),
('9fe1374a-4e17-4a48-a44a-57ee7204ebb7', 'website-development'),
('a70c493a-4b8c-4b9a-a187-6e2e0081e1dd', 'mosaic-polish'),
('a70c493a-4b8c-4b9a-a187-6e2e0081e1dd', 'tiles-fitting'),
('a70c493a-4b8c-4b9a-a187-6e2e0081e1dd', 'tiles-marble'),
('a9f8904e-a784-434c-a19a-235fede77da2', 'dry-cleaning'),
('a9f8904e-a784-434c-a19a-235fede77da2', 'wash-iron'),
('ab6d9d7f-0008-4273-a781-14603c8641d4', 'event-security'),
('ab6d9d7f-0008-4273-a781-14603c8641d4', 'security-guard'),
('b0115353-d46b-4282-8b25-e31f5f5a4875', 'photography-service'),
('b0115353-d46b-4282-8b25-e31f5f5a4875', 'product-photography'),
('b0115353-d46b-4282-8b25-e31f5f5a4875', 'wedding-photography'),
('b587b37a-aa6b-40d0-8f31-a33e00232978', 'agri-consulting'),
('b587b37a-aa6b-40d0-8f31-a33e00232978', 'livestock-care'),
('b750b925-39a9-4182-a810-1056df3740e9', 'carpentry'),
('b750b925-39a9-4182-a810-1056df3740e9', 'custom-furniture'),
('b750b925-39a9-4182-a810-1056df3740e9', 'door-repair'),
('b750b925-39a9-4182-a810-1056df3740e9', 'furniture-repair'),
('c1000001-0000-0000-0000-000000000001', 'ac-service'),
('c1000001-0000-0000-0000-000000000001', 'fridge-repair'),
('c1000001-0000-0000-0000-000000000001', 'water-purifier'),
('c1000001-0000-0000-0000-000000000002', 'cleaning'),
('c1000001-0000-0000-0000-000000000002', 'septic-tank'),
('c1000001-0000-0000-0000-000000000002', 'sofa-cleaning'),
('c1000001-0000-0000-0000-000000000002', 'water-tank-cleaning'),
('c1000001-0000-0000-0000-000000000003', 'bridal-makeup'),
('c1000001-0000-0000-0000-000000000003', 'mehendi-service'),
('c1000001-0000-0000-0000-000000000003', 'mens-salon'),
('c1000001-0000-0000-0000-000000000003', 'salon'),
('c1000001-0000-0000-0000-000000000004', 'electrical'),
('c1000001-0000-0000-0000-000000000004', 'fan-service'),
('c1000001-0000-0000-0000-000000000004', 'wiring-service'),
('c1000001-0000-0000-0000-000000000005', 'bathroom-fitting'),
('c1000001-0000-0000-0000-000000000005', 'plumbing'),
('c1000001-0000-0000-0000-000000000005', 'water-pump'),
('c1000001-0000-0000-0000-000000000006', 'painting'),
('c1000001-0000-0000-0000-000000000006', 'wall-texture'),
('c1000001-0000-0000-0000-000000000007', 'office-shifting'),
('c1000001-0000-0000-0000-000000000007', 'shifting'),
('c1000001-0000-0000-0000-000000000008', 'driver'),
('c1000001-0000-0000-0000-000000000008', 'driving-school'),
('c1000001-0000-0000-0000-000000000008', 'monthly-driver'),
('c1000001-0000-0000-0000-000000000009', 'appliance-rental'),
('c1000001-0000-0000-0000-000000000009', 'appliance-repair'),
('c1000001-0000-0000-0000-000000000009', 'gas-stove'),
('c1000001-0000-0000-0000-000000000009', 'washing-machine'),
('c1000001-0000-0000-0000-000000000010', 'massage-therapy'),
('c1000001-0000-0000-0000-000000000010', 'spa'),
('c1000001-0000-0000-0000-000000000011', 'mosquito-net'),
('c1000001-0000-0000-0000-000000000011', 'pest-control'),
('c1000001-0000-0000-0000-000000000011', 'termite-control'),
('c1000001-0000-0000-0000-000000000012', 'car-ac-service'),
('c1000001-0000-0000-0000-000000000012', 'car-wash'),
('c1000001-0000-0000-0000-000000000012', 'tyre-battery'),
('c1000001-0000-0000-0000-000000000013', 'laptop-repair'),
('c1000001-0000-0000-0000-000000000013', 'mobile-repair'),
('c1000001-0000-0000-0000-000000000014', 'gym-fitness'),
('c1000001-0000-0000-0000-000000000014', 'nursing'),
('c1000001-0000-0000-0000-000000000014', 'nursing-care'),
('c1000001-0000-0000-0000-000000000014', 'physiotherapy'),
('c1481b45-f6af-4ca6-a84a-4362bc56c8ae', 'building-construction'),
('c1481b45-f6af-4ca6-a84a-4362bc56c8ae', 'renovation'),
('c8e6fd41-6445-4f27-b048-aab5cec59636', 'lift-installation'),
('c8e6fd41-6445-4f27-b048-aab5cec59636', 'lift-maintenance'),
('caa3fdfe-b5b3-40a3-92ff-c5313473fc11', 'alteration'),
('caa3fdfe-b5b3-40a3-92ff-c5313473fc11', 'gents-tailoring'),
('caa3fdfe-b5b3-40a3-92ff-c5313473fc11', 'ladies-tailoring'),
('d37630ec-dfbd-4233-849b-dbdb79cf04b3', 'covered-van'),
('d37630ec-dfbd-4233-849b-dbdb79cf04b3', 'pickup-van'),
('d37630ec-dfbd-4233-849b-dbdb79cf04b3', 'truck-rental'),
('d441eb6e-255b-4333-a338-93ef32b852dd', 'bike-rent'),
('d441eb6e-255b-4333-a338-93ef32b852dd', 'bike-servicing'),
('d441eb6e-255b-4333-a338-93ef32b852dd', 'cycle-rent'),
('d80e5b3b-adef-48ac-a845-2bddf79ae7d7', 'generator-service'),
('d80e5b3b-adef-48ac-a845-2bddf79ae7d7', 'ips-ups-service'),
('fbac423d-2628-4cb7-9edc-dda2f0c0e0dd', 'birth-certificate'),
('fbac423d-2628-4cb7-9edc-dda2f0c0e0dd', 'document-drafting'),
('fbac423d-2628-4cb7-9edc-dda2f0c0e0dd', 'insurance-service'),
('fbac423d-2628-4cb7-9edc-dda2f0c0e0dd', 'legal-consultation'),
('fbac423d-2628-4cb7-9edc-dda2f0c0e0dd', 'passport-nid'),
('fbac423d-2628-4cb7-9edc-dda2f0c0e0dd', 'tax-return'),
('fbac423d-2628-4cb7-9edc-dda2f0c0e0dd', 'trade-license');

-- --------------------------------------------------------

--
-- Table structure for table `cms_categories`
--

CREATE TABLE `cms_categories` (
  `id` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `name_en` varchar(255) DEFAULT NULL,
  `icon_url` text DEFAULT NULL,
  `color_gradient` varchar(255) DEFAULT 'from-blue-600 to-blue-800',
  `color_overlay` varchar(255) DEFAULT 'from-blue-900/80 to-blue-700/40',
  `color_chip_bg` varchar(255) DEFAULT 'bg-blue-500/15',
  `color_chip_text` varchar(255) DEFAULT 'text-blue-700',
  `color_accent` varchar(50) DEFAULT '#2563eb',
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cms_hero_banners`
--

CREATE TABLE `cms_hero_banners` (
  `id` varchar(100) NOT NULL,
  `title_bn` varchar(255) NOT NULL,
  `title_en` varchar(255) DEFAULT NULL,
  `subtitle_bn` text DEFAULT NULL,
  `subtitle_en` text DEFAULT NULL,
  `image_url` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cms_homepage_sections`
--

CREATE TABLE `cms_homepage_sections` (
  `id` varchar(100) NOT NULL,
  `section_key` varchar(160) NOT NULL,
  `title_bn` varchar(255) NOT NULL,
  `title_en` varchar(255) DEFAULT NULL,
  `service_slugs` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`service_slugs`)),
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cms_services`
--

CREATE TABLE `cms_services` (
  `id` varchar(100) NOT NULL,
  `slug` varchar(160) NOT NULL,
  `title` varchar(255) NOT NULL,
  `title_en` varchar(255) DEFAULT NULL,
  `image_url` text DEFAULT NULL,
  `description` text DEFAULT NULL,
  `rating` decimal(3,2) NOT NULL DEFAULT 0.00,
  `total_reviews` int(11) NOT NULL DEFAULT 0,
  `total_orders` int(11) NOT NULL DEFAULT 0,
  `features` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`features`)),
  `available_cities` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`available_cities`)),
  `category_id` varchar(100) DEFAULT NULL,
  `commission_percent` decimal(5,2) DEFAULT 10.00,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cms_service_packages`
--

CREATE TABLE `cms_service_packages` (
  `id` varchar(100) NOT NULL,
  `service_id` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `original_price` decimal(10,2) DEFAULT NULL,
  `features` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`features`)),
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cms_special_offers`
--

CREATE TABLE `cms_special_offers` (
  `id` varchar(100) NOT NULL,
  `title_bn` varchar(255) NOT NULL,
  `title_en` varchar(255) DEFAULT NULL,
  `discount_bn` varchar(255) NOT NULL,
  `discount_en` varchar(255) DEFAULT NULL,
  `description_bn` text DEFAULT NULL,
  `description_en` text DEFAULT NULL,
  `service_slug` varchar(160) DEFAULT NULL,
  `badge` varchar(50) DEFAULT NULL,
  `gradient` varchar(255) DEFAULT NULL,
  `border_color` varchar(255) DEFAULT NULL,
  `accent_color` varchar(255) DEFAULT NULL,
  `bg_accent` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `expires_at` datetime DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sellers`
--

CREATE TABLE `sellers` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `slug` varchar(255) DEFAULT NULL,
  `shop_name` varchar(255) DEFAULT NULL,
  `shop_type` varchar(50) DEFAULT NULL,
  `seller_name` varchar(255) DEFAULT 'Shondhaan Mart Seller',
  `seller_email` varchar(255) DEFAULT NULL,
  `seller_mobile` varchar(20) DEFAULT NULL,
  `seller_address` varchar(300) DEFAULT NULL,
  `seller_total_products` int(11) DEFAULT 0,
  `seller_verified` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sellers`
--

INSERT INTO `sellers` (`id`, `user_id`, `slug`, `shop_name`, `shop_type`, `seller_name`, `seller_email`, `seller_mobile`, `seller_address`, `seller_total_products`, `seller_verified`, `created_at`, `updated_at`) VALUES
(1, 2, 'rabeya-shop-2', 'Rabeya Shop', 'electronics', 'Rabeya Shop', 'hahajah319@asitrai.com', '01679440219', 'uttara,Dhaka', 0, 1, '2026-07-04 06:13:45', '2026-07-04 06:13:45');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `mobile` varchar(20) NOT NULL,
  `address` varchar(300) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `shop_name` varchar(255) DEFAULT NULL,
  `shop_type` varchar(50) DEFAULT NULL,
  `type` enum('super_admin','admin','service_admin','moderator','supervisor','finance','call_center','provider','representative','mart_vendor','mart_delivery','mart_cs','yessdeal_seller','employer','user') NOT NULL DEFAULT 'user',
  `email_verified` tinyint(1) NOT NULL DEFAULT 0,
  `otp_hash` varchar(64) DEFAULT NULL,
  `otp_expires_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `mobile`, `address`, `email`, `password`, `shop_name`, `shop_type`, `type`, `email_verified`, `otp_hash`, `otp_expires_at`, `created_at`, `updated_at`) VALUES
(1, 'Super Admin', '01700000001', NULL, 'superadmin@local.test', '026467df7dbf1060b170fecc5a712e64:3e758754b3dece7fb114c99cf1f9dd515055ae7ced13a55d9ffa8349d344573c8f27e537665f335ccb6bd5c47081779d1ea2660144ed03c10b90cdd211ee7fe9', NULL, NULL, 'super_admin', 1, NULL, NULL, '2026-07-02 06:10:22', '2026-07-04 11:56:32'),
(2, 'Rabeya Boshry', '01679440219', 'uttara,Dhaka', 'hahajah319@asitrai.com', 'b23f11d4aef9f6c94de320bac4ed195a:7693e611b377fa74f3be55efdb318adaf104f250fad73c020a79b9fefd872cb41dae3cc456a01e2d910b61951608f1f78897f765ef000b45a0ec0bf4fee1f513', 'Rabeya Shop', 'electronics', 'mart_vendor', 1, NULL, NULL, '2026-07-04 06:13:22', '2026-07-04 06:13:45'),
(3, 'Mohima Chowdhury', '01818974523', 'Mirpur,Dhaka', 'jiwokof521@lovadio.com', '678ecfdf8674db5658994bd705c6e586:18308ae926996e0ad8a98b5a4255efff9ac59b26d350724652cf9219797ae270c7a70aa2d407df40506ef43dd24fc670744874df93b5dce024651a55f70fb1ae', NULL, NULL, 'mart_delivery', 1, NULL, NULL, '2026-07-04 06:49:06', '2026-07-04 06:49:29'),
(4, 'farjana yeasmin sumaiya', '01818974524', NULL, 'farjanayessbd@gmail.com', '46d57770e86130877ded1dc1b49b8fbb:80e2f653ff287aaf6d9b3c26f54e53b1b10aefb802fddd1b1f3cb864769d276c2f6a0b357b4a463b5eb8374be560481d6f89c7fa6454ac8bab05561f81b7e9b7', NULL, NULL, 'user', 1, NULL, NULL, '2026-07-04 07:05:34', '2026-07-04 07:05:58');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `category_services`
--
ALTER TABLE `category_services`
  ADD PRIMARY KEY (`category_id`,`service_slug`);

--
-- Indexes for table `cms_categories`
--
ALTER TABLE `cms_categories`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `cms_hero_banners`
--
ALTER TABLE `cms_hero_banners`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `cms_homepage_sections`
--
ALTER TABLE `cms_homepage_sections`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `section_key` (`section_key`);

--
-- Indexes for table `cms_services`
--
ALTER TABLE `cms_services`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`),
  ADD KEY `idx_cms_services_category_id` (`category_id`);

--
-- Indexes for table `cms_service_packages`
--
ALTER TABLE `cms_service_packages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_cms_packages_service_id` (`service_id`);

--
-- Indexes for table `cms_special_offers`
--
ALTER TABLE `cms_special_offers`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `sellers`
--
ALTER TABLE `sellers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD UNIQUE KEY `slug` (`slug`),
  ADD KEY `idx_sellers_user_id` (`user_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `mobile` (`mobile`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `sellers`
--
ALTER TABLE `sellers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
