-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jul 11, 2026 at 05:07 PM
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
-- Database: `ymart_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `banners`
--

CREATE TABLE `banners` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `title_en` varchar(255) DEFAULT NULL,
  `subtitle` varchar(500) DEFAULT NULL,
  `subtitle_en` varchar(500) DEFAULT NULL,
  `image_url` varchar(500) NOT NULL,
  `link_url` varchar(500) DEFAULT NULL,
  `button_label` varchar(100) DEFAULT NULL,
  `button_label_en` varchar(100) DEFAULT NULL,
  `button_bg_color` varchar(20) DEFAULT '#ffffff',
  `button_text_color` varchar(20) DEFAULT '#0f172a',
  `is_active` tinyint(1) DEFAULT 1,
  `sort_order` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `banners`
--

INSERT INTO `banners` (`id`, `title`, `title_en`, `subtitle`, `subtitle_en`, `image_url`, `link_url`, `button_label`, `button_label_en`, `button_bg_color`, `button_text_color`, `is_active`, `sort_order`, `created_at`, `updated_at`) VALUES
(1, 'Molestiae tempore m', 'Est nihil nesciunt ', 'Ex expedita qui et n', 'Sed adipisci nisi ni', 'http://localhost:8081/uploads/banners/banner_1783507801027_218027039.png', 'Distinctio Quia ali', 'Soluta minim impedit', 'Ipsam occaecat assum', '#ffffff', '#1757ee', 1, 0, '2026-07-08 10:50:01', '2026-07-08 10:50:19');

-- --------------------------------------------------------

--
-- Table structure for table `bkash_settings`
--

CREATE TABLE `bkash_settings` (
  `id` int(11) NOT NULL,
  `bkash_app_key` varchar(255) NOT NULL,
  `bkash_app_secret` varchar(255) NOT NULL,
  `bkash_username` varchar(255) NOT NULL,
  `bkash_password` varchar(255) NOT NULL,
  `is_sandbox` tinyint(1) DEFAULT 1,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `name_en` varchar(255) DEFAULT NULL,
  `slug` varchar(255) DEFAULT NULL,
  `image_url` varchar(500) DEFAULT NULL,
  `icon_url` varchar(500) DEFAULT NULL,
  `sort_order` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`id`, `name`, `name_en`, `slug`, `image_url`, `icon_url`, `sort_order`, `created_at`, `updated_at`) VALUES
(1, 'Electronic devices', 'Electronic devices', 'electronic-devices', 'http://localhost:8081/uploads/mart-products/1782973282414-787103457.png', NULL, 0, '2026-07-02 06:05:08', '2026-07-02 06:21:24'),
(2, 'Electronics accessories', 'Electronics accessories', 'electronics-accessories', 'http://localhost:8081/uploads/mart-products/1782973760285-218221264.png', NULL, 0, '2026-07-02 06:05:08', '2026-07-02 06:29:22'),
(3, 'TV and home appliances', 'TV and home appliances', 'tv-home-appliances', 'http://localhost:8081/uploads/mart-products/1782973790798-502800285.webp', NULL, 0, '2026-07-02 06:05:08', '2026-07-02 06:29:53'),
(4, 'Health and beauty', 'Health and beauty', 'health-beauty', 'http://localhost:8081/uploads/mart-products/1782973821447-799663125.avif', NULL, 0, '2026-07-02 06:05:08', '2026-07-02 06:30:22'),
(5, 'Babies & toys', 'Babies & toys', 'babies-toys', 'http://localhost:8081/uploads/mart-products/1782973865011-616123416.jpg', NULL, 0, '2026-07-02 06:05:08', '2026-07-02 06:31:06'),
(6, 'Groceries & pets', 'Groceries & pets', 'groceries-pets', NULL, NULL, 0, '2026-07-02 06:05:08', '2026-07-02 06:05:08'),
(7, 'Home & lifestyle', 'Home & lifestyle', 'home-lifestyle', NULL, NULL, 0, '2026-07-02 06:05:08', '2026-07-02 06:05:08'),
(8, 'Womens fashion', 'Womens fashion', 'womens-fashion', NULL, NULL, 0, '2026-07-02 06:05:08', '2026-07-02 06:05:08'),
(9, 'Mens fashion', 'Mens fashion', 'mens-fashion', NULL, NULL, 0, '2026-07-02 06:05:08', '2026-07-02 06:05:08'),
(10, 'Watches, bags & jewellery', 'Watches, bags & jewellery', 'watches-bags-jewellery', NULL, NULL, 0, '2026-07-02 06:05:08', '2026-07-02 06:05:08'),
(11, 'Sports & outdoor', 'Sports & outdoor', 'sports-outdoor', NULL, NULL, 0, '2026-07-02 06:05:08', '2026-07-02 06:05:08'),
(12, 'Automotive & motorbike', 'Automotive & motorbike', 'automotive-motorbike', NULL, NULL, 0, '2026-07-02 06:05:08', '2026-07-02 06:05:08'),
(253, 'Veniam voluptatem', 'Minima facilis ipsam', 'Reprehenderit volup', 'http://localhost:8081/uploads/mart-products/1783507755209-537888933.png', NULL, 0, '2026-07-08 10:49:21', '2026-07-08 10:49:21');

-- --------------------------------------------------------

--
-- Table structure for table `coupons`
--

CREATE TABLE `coupons` (
  `id` int(11) NOT NULL,
  `seller_id` int(11) DEFAULT NULL,
  `code` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `discount_type` enum('percentage','fixed') NOT NULL DEFAULT 'fixed',
  `discount_value` decimal(10,2) NOT NULL DEFAULT 0.00,
  `min_order_amount` decimal(10,2) DEFAULT NULL,
  `max_discount_amount` decimal(10,2) DEFAULT NULL,
  `usage_limit` int(11) DEFAULT NULL,
  `used_count` int(11) NOT NULL DEFAULT 0,
  `starts_at` datetime DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `coupons`
--

INSERT INTO `coupons` (`id`, `seller_id`, `code`, `description`, `discount_type`, `discount_value`, `min_order_amount`, `max_discount_amount`, `usage_limit`, `used_count`, `starts_at`, `expires_at`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 1, 'SAVE100', NULL, 'percentage', 10.00, 500.00, NULL, NULL, 0, NULL, '2026-07-31 00:00:00', 1, '2026-07-04 06:08:34', '2026-07-04 06:08:34');

-- --------------------------------------------------------

--
-- Table structure for table `deliverymen`
--

CREATE TABLE `deliverymen` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `full_name` varchar(255) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `present_address` text DEFAULT NULL,
  `permanent_address` text DEFAULT NULL,
  `nid_number` varchar(50) DEFAULT NULL,
  `emergency_contact_name` varchar(255) DEFAULT NULL,
  `emergency_contact_phone` varchar(30) DEFAULT NULL,
  `vehicle_type` enum('bicycle','motorcycle','car','van','walking','other') DEFAULT 'motorcycle',
  `vehicle_registration_number` varchar(100) DEFAULT NULL,
  `driving_license_number` varchar(100) DEFAULT NULL,
  `service_district` varchar(100) DEFAULT NULL,
  `service_thana` varchar(100) DEFAULT NULL,
  `payout_method` enum('bank','bkash','nagad','rocket','cash','other') DEFAULT 'bkash',
  `payout_account_name` varchar(255) DEFAULT NULL,
  `payout_account_number` varchar(100) DEFAULT NULL,
  `bank_name` varchar(255) DEFAULT NULL,
  `bank_branch` varchar(255) DEFAULT NULL,
  `routing_number` varchar(100) DEFAULT NULL,
  `nid_front_url` varchar(500) DEFAULT NULL,
  `nid_back_url` varchar(500) DEFAULT NULL,
  `selfie_url` varchar(500) DEFAULT NULL,
  `driving_license_url` varchar(500) DEFAULT NULL,
  `vehicle_registration_url` varchar(500) DEFAULT NULL,
  `kyc_status` enum('draft','submitted','approved','rejected') DEFAULT 'draft',
  `verified` tinyint(1) DEFAULT 0,
  `kyc_admin_message` text DEFAULT NULL,
  `submitted_at` datetime DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `reviewed_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `deliverymen`
--

INSERT INTO `deliverymen` (`id`, `user_id`, `full_name`, `phone`, `email`, `date_of_birth`, `present_address`, `permanent_address`, `nid_number`, `emergency_contact_name`, `emergency_contact_phone`, `vehicle_type`, `vehicle_registration_number`, `driving_license_number`, `service_district`, `service_thana`, `payout_method`, `payout_account_name`, `payout_account_number`, `bank_name`, `bank_branch`, `routing_number`, `nid_front_url`, `nid_back_url`, `selfie_url`, `driving_license_url`, `vehicle_registration_url`, `kyc_status`, `verified`, `kyc_admin_message`, `submitted_at`, `reviewed_at`, `reviewed_by`, `created_at`, `updated_at`) VALUES
(1, 3, 'Mohima Chowdhury', '01818974523', 'jiwokof521@lovadio.com', NULL, 'mirpur,dhaka', NULL, '33167890', NULL, NULL, 'car', NULL, NULL, NULL, NULL, 'bkash', NULL, NULL, NULL, NULL, NULL, 'http://localhost:8081/uploads/delivery-kyc/delivery_kyc_1783147811771_gzc92r64sj.png', 'http://localhost:8081/uploads/delivery-kyc/delivery_kyc_1783147817694_9w8qntmurpn.png', 'http://localhost:8081/uploads/delivery-kyc/delivery_kyc_1783147827961_dlfehfh2irw.jpg', NULL, NULL, 'approved', 1, NULL, '2026-07-04 12:50:37', '2026-07-04 13:17:17', NULL, '2026-07-04 06:50:37', '2026-07-04 07:17:17');

-- --------------------------------------------------------

--
-- Table structure for table `delivery_areas`
--

CREATE TABLE `delivery_areas` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `district` varchar(100) NOT NULL,
  `thana` varchar(150) NOT NULL,
  `area` varchar(150) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `delivery_areas`
--

INSERT INTO `delivery_areas` (`id`, `user_id`, `district`, `thana`, `area`, `created_at`, `updated_at`) VALUES
(1, 3, 'ঢাকা', 'উত্তরা', 'উত্তরা', '2026-07-04 07:41:14', '2026-07-04 07:41:14'),
(2, 3, 'ঢাকা', 'মিরপুর', 'মিরপুর', '2026-07-04 07:41:14', '2026-07-04 07:41:14'),
(3, 3, 'ঢাকা', 'বনানী', 'বনানী', '2026-07-04 07:41:14', '2026-07-04 07:41:14');

-- --------------------------------------------------------

--
-- Table structure for table `delivery_requests`
--

CREATE TABLE `delivery_requests` (
  `id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `order_number` varchar(50) DEFAULT NULL,
  `seller_id` int(11) NOT NULL,
  `deliveryman_user_id` int(11) NOT NULL,
  `status` enum('pending','accepted','declined','cancelled','delivered') NOT NULL DEFAULT 'pending',
  `customer_name` varchar(255) DEFAULT NULL,
  `customer_phone` varchar(20) DEFAULT NULL,
  `shipping_address` text DEFAULT NULL,
  `shipping_division` varchar(100) DEFAULT NULL,
  `shipping_district` varchar(100) DEFAULT NULL,
  `shipping_thana` varchar(100) DEFAULT NULL,
  `total` decimal(10,2) DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `delivery_requests`
--

INSERT INTO `delivery_requests` (`id`, `order_id`, `order_number`, `seller_id`, `deliveryman_user_id`, `status`, `customer_name`, `customer_phone`, `shipping_address`, `shipping_division`, `shipping_district`, `shipping_thana`, `total`, `notes`, `created_at`, `updated_at`) VALUES
(1, 3, 'MRT-260704-CWHN4S-Y', 2, 3, 'pending', 'Rabeya Boshry', '01679440219', 'U, উত্তরা, ঢাকা, ঢাকা', 'ঢাকা', 'ঢাকা', 'উত্তরা', 30080.00, NULL, '2026-07-04 07:51:44', '2026-07-04 07:51:44');

-- --------------------------------------------------------

--
-- Table structure for table `mart_conversations`
--

CREATE TABLE `mart_conversations` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `seller_user_id` int(11) NOT NULL,
  `seller_id` int(11) NOT NULL,
  `user_name` varchar(255) DEFAULT NULL,
  `seller_name` varchar(255) DEFAULT NULL,
  `product_name` varchar(255) DEFAULT NULL,
  `product_image` varchar(500) DEFAULT NULL,
  `last_message` text DEFAULT NULL,
  `last_message_at` timestamp NULL DEFAULT NULL,
  `user_unread` int(11) NOT NULL DEFAULT 0,
  `seller_unread` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `mart_messages`
--

CREATE TABLE `mart_messages` (
  `id` int(11) NOT NULL,
  `conversation_id` int(11) NOT NULL,
  `sender_id` int(11) NOT NULL,
  `sender_role` enum('user','seller') NOT NULL,
  `message` text NOT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `nagad_settings`
--

CREATE TABLE `nagad_settings` (
  `id` int(11) NOT NULL,
  `nagad_merchant_id` varchar(255) NOT NULL,
  `nagad_public_key` text NOT NULL,
  `nagad_private_key` text NOT NULL,
  `is_sandbox` tinyint(1) DEFAULT 1,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `id` int(11) NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `order_number` varchar(50) DEFAULT NULL,
  `subtotal` decimal(10,2) DEFAULT 0.00,
  `shipping_fee` decimal(10,2) DEFAULT 0.00,
  `courier_fee` decimal(10,2) DEFAULT 0.00,
  `cod_fee` decimal(10,2) DEFAULT 0.00,
  `discount` decimal(10,2) DEFAULT 0.00,
  `total` decimal(10,2) DEFAULT 0.00,
  `coupon_code` varchar(100) DEFAULT NULL,
  `payment_method` varchar(50) DEFAULT 'cod',
  `payment_status` enum('unpaid','paid','refund_pending','refunded') NOT NULL DEFAULT 'unpaid',
  `order_status` enum('pending','processing','confirmed','shipped','delivered','cancelled','return_requested') NOT NULL DEFAULT 'pending',
  `customer_name` varchar(255) DEFAULT NULL,
  `customer_phone` varchar(20) DEFAULT NULL,
  `shipping_address` text DEFAULT NULL,
  `shipping_division` varchar(100) DEFAULT NULL,
  `shipping_district` varchar(100) DEFAULT NULL,
  `shipping_thana` varchar(100) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `cancel_reason` text DEFAULT NULL,
  `return_reason` text DEFAULT NULL,
  `estimated_delivery_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `orders`
--

INSERT INTO `orders` (`id`, `user_id`, `order_number`, `subtotal`, `shipping_fee`, `courier_fee`, `cod_fee`, `discount`, `total`, `coupon_code`, `payment_method`, `payment_status`, `order_status`, `customer_name`, `customer_phone`, `shipping_address`, `shipping_division`, `shipping_district`, `shipping_thana`, `notes`, `cancel_reason`, `return_reason`, `estimated_delivery_date`, `created_at`, `updated_at`) VALUES
(1, '4', 'MRT-260704-S401TT-X', 1300.00, 0.00, 90.00, 10.00, 0.00, 1400.00, NULL, 'cod', 'unpaid', 'pending', 'farjana yeasmin sumaiya', '01818974524', 'uttara, উত্তরা, ঢাকা, ঢাকা', 'ঢাকা', 'ঢাকা', 'উত্তরা', NULL, NULL, NULL, '2026-07-09', '2026-07-04 07:07:21', '2026-07-04 07:07:21'),
(2, '2', 'MRT-260704-C3994R-W', 30000.00, 0.00, 70.00, 10.00, 0.00, 30080.00, NULL, 'cod', 'unpaid', 'pending', 'Rabeya Boshry', '01679440219', 'UTTARA, উত্তরা, ঢাকা, ঢাকা', 'ঢাকা', 'ঢাকা', 'উত্তরা', NULL, NULL, NULL, '2026-07-09', '2026-07-04 07:50:53', '2026-07-04 07:50:53'),
(3, '2', 'MRT-260704-CWHN4S-Y', 30000.00, 0.00, 70.00, 10.00, 0.00, 30080.00, NULL, 'cod', 'unpaid', 'shipped', 'Rabeya Boshry', '01679440219', 'U, উত্তরা, ঢাকা, ঢাকা', 'ঢাকা', 'ঢাকা', 'উত্তরা', NULL, NULL, NULL, '2026-07-09', '2026-07-04 07:51:31', '2026-07-04 07:51:41');

-- --------------------------------------------------------

--
-- Table structure for table `orders_count`
--

CREATE TABLE `orders_count` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `order_count` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `order_items`
--

CREATE TABLE `order_items` (
  `id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `product_id` int(11) DEFAULT NULL,
  `seller_id` int(11) DEFAULT NULL,
  `product_name` varchar(255) NOT NULL,
  `product_image` varchar(500) DEFAULT NULL,
  `quantity` int(11) DEFAULT 1,
  `unit_price` decimal(10,2) DEFAULT 0.00,
  `total_price` decimal(10,2) DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `order_items`
--

INSERT INTO `order_items` (`id`, `order_id`, `product_id`, `seller_id`, `product_name`, `product_image`, `quantity`, `unit_price`, `total_price`, `created_at`) VALUES
(1, 1, 2, 8, 'গ্রুট', 'http://localhost:8081/uploads/mart-products/1783144541747-298643140.jpg', 2, 650.00, 1300.00, '2026-07-04 07:07:21'),
(2, 2, 4, 8, 'black dress', 'http://localhost:8081/uploads/mart-products/1783144762363-988248103.webp', 1, 30000.00, 30000.00, '2026-07-04 07:50:53'),
(3, 3, 5, 2, 'Microsoft Surface Pro 10 Core Ultra 5 135U 13\" 120Hz Touch Laptop', 'http://localhost:8081/uploads/mart-products/1783146476685-49381963.webp', 1, 30000.00, 30000.00, '2026-07-04 07:51:31');

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` int(11) NOT NULL,
  `seller_id` int(11) DEFAULT NULL,
  `category_id` int(11) DEFAULT NULL,
  `sub_category_id` int(11) DEFAULT NULL,
  `image` varchar(500) DEFAULT NULL,
  `gallery_urls` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`gallery_urls`)),
  `name_bn` varchar(500) NOT NULL,
  `name_en` varchar(500) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `sale_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `original_price` decimal(10,2) DEFAULT NULL,
  `stock` int(11) NOT NULL DEFAULT 0,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `unit` varchar(50) DEFAULT NULL,
  `featured` tinyint(1) NOT NULL DEFAULT 0,
  `sold_qty` int(11) NOT NULL DEFAULT 0,
  `discount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `is_freedelivery` tinyint(1) NOT NULL DEFAULT 0,
  `wishlist` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`id`, `seller_id`, `category_id`, `sub_category_id`, `image`, `gallery_urls`, `name_bn`, `name_en`, `description`, `sale_price`, `original_price`, `stock`, `status`, `unit`, `featured`, `sold_qty`, `discount`, `is_freedelivery`, `wishlist`, `created_at`, `updated_at`) VALUES
(1, 1, 5, NULL, 'http://localhost:8081/uploads/mart-products/1783144430765-706214776.jpg', '[]', 'টেডি', 'Teddy bear', NULL, 500.00, 500.00, 5, 'active', 'piece', 0, 0, 0.00, 0, 0, '2026-07-04 05:54:55', '2026-07-04 05:54:55'),
(2, 1, 5, NULL, 'http://localhost:8081/uploads/mart-products/1783144541747-298643140.jpg', '[\"http://localhost:8081/uploads/mart-products/1783144553242-221292704.jfif\",\"http://localhost:8081/uploads/mart-products/1783144558875-129071514.webp\"]', 'গ্রুট', 'groot', NULL, 650.00, 677.00, 4, 'active', 'piece', 0, 0, 27.00, 0, 0, '2026-07-04 05:57:20', '2026-07-04 05:57:20'),
(3, 1, 8, NULL, 'http://localhost:8081/uploads/mart-products/1783144676887-737837988.jpg', '[\"http://localhost:8081/uploads/mart-products/1783144683455-696267866.webp\"]', 'লাল গাউন', 'red gown', NULL, 15000.00, 20000.00, 4, 'active', 'piece', 0, 0, 5000.00, 0, 0, '2026-07-04 05:59:05', '2026-07-04 05:59:05'),
(4, 1, 8, NULL, 'http://localhost:8081/uploads/mart-products/1783144762363-988248103.webp', '[]', 'black dress', NULL, NULL, 30000.00, 35000.00, 3, 'active', 'piece', 0, 0, 5000.00, 0, 0, '2026-07-04 05:59:53', '2026-07-04 05:59:53'),
(5, 2, 2, 2, 'http://localhost:8081/uploads/mart-products/1783146476685-49381963.webp', '[]', 'Microsoft Surface Pro 10 Core Ultra 5 135U 13\" 120Hz Touch Laptop', NULL, NULL, 30000.00, 30000.00, 4, 'active', 'piece', 0, 0, 0.00, 0, 0, '2026-07-04 06:28:58', '2026-07-04 06:28:58');

-- --------------------------------------------------------

--
-- Table structure for table `product_questions`
--

CREATE TABLE `product_questions` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `seller_id` int(11) DEFAULT NULL,
  `question` text NOT NULL,
  `answer` text DEFAULT NULL,
  `answered_by` int(11) DEFAULT NULL,
  `answered_at` timestamp NULL DEFAULT NULL,
  `is_visible` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product_wishlists`
--

CREATE TABLE `product_wishlists` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `product_wishlists`
--

INSERT INTO `product_wishlists` (`id`, `user_id`, `product_id`, `created_at`) VALUES
(1, 4, 4, '2026-07-04 07:06:17'),
(2, 1, 4, '2026-07-04 07:16:56');

-- --------------------------------------------------------

--
-- Table structure for table `reviews`
--

CREATE TABLE `reviews` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `text_review` text DEFAULT NULL,
  `star_review` tinyint(3) UNSIGNED NOT NULL,
  `seller_reply` text DEFAULT NULL,
  `seller_reply_by` int(11) DEFAULT NULL,
  `seller_reply_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `rocket_settings`
--

CREATE TABLE `rocket_settings` (
  `id` int(11) NOT NULL,
  `rocket_merchant_id` varchar(255) NOT NULL,
  `rocket_api_key` varchar(255) NOT NULL,
  `rocket_api_secret` varchar(255) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
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
  `shop_popular` tinyint(1) DEFAULT 0,
  `seller_name` varchar(255) DEFAULT 'Yess Mart Seller',
  `seller_email` varchar(255) DEFAULT NULL,
  `seller_mobile` varchar(20) DEFAULT NULL,
  `seller_address` varchar(300) DEFAULT NULL,
  `seller_total_products` int(11) DEFAULT 0,
  `seller_verified` tinyint(1) DEFAULT 0,
  `banner_url` varchar(500) DEFAULT NULL,
  `profile_image_url` varchar(500) DEFAULT NULL,
  `store_carousel_media` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`store_carousel_media`)),
  `bank_name` varchar(255) DEFAULT NULL,
  `bank_account_name` varchar(255) DEFAULT NULL,
  `bank_account_number` varchar(100) DEFAULT NULL,
  `bank_branch` varchar(255) DEFAULT NULL,
  `routing_number` varchar(100) DEFAULT NULL,
  `mobile_banking_provider` varchar(50) DEFAULT NULL,
  `mobile_banking_number` varchar(20) DEFAULT NULL,
  `kyc_admin_message` text DEFAULT NULL,
  `nid_front_url` varchar(500) DEFAULT NULL,
  `nid_back_url` varchar(500) DEFAULT NULL,
  `trade_license_url` varchar(500) DEFAULT NULL,
  `tin_certificate_url` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sellers`
--

INSERT INTO `sellers` (`id`, `user_id`, `slug`, `shop_name`, `shop_type`, `shop_popular`, `seller_name`, `seller_email`, `seller_mobile`, `seller_address`, `seller_total_products`, `seller_verified`, `banner_url`, `profile_image_url`, `store_carousel_media`, `bank_name`, `bank_account_name`, `bank_account_number`, `bank_branch`, `routing_number`, `mobile_banking_provider`, `mobile_banking_number`, `kyc_admin_message`, `nid_front_url`, `nid_back_url`, `trade_license_url`, `tin_certificate_url`, `created_at`, `updated_at`) VALUES
(1, 8, 'tavi-8', 'tavi', NULL, 0, 'tavi', 'tanvirunislamanika@gmail.com', '01818974533', NULL, 0, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-07-04 05:53:33', '2026-07-04 05:53:33'),
(2, 2, 'rabeya-shop-2', 'Rabeya Shop', 'electronics', 1, 'Rabeya Shop', 'hahajah319@asitrai.com', '01679440219', 'uttara,Dhaka', 0, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'bKash', '01679440219', NULL, 'http://localhost:8081/uploads/kyc/kyc_1783145655498_rsje83c033e.png', 'http://localhost:8081/uploads/kyc/kyc_1783145659672_xeivqaonh9.png', NULL, NULL, '2026-07-04 06:13:45', '2026-07-04 06:45:28'),
(3, 6, 'sumaiya-6', 'sumaiya', 'electronics', 0, 'sumaiya', 'farjanayessbd@gmail.com', '01679440219', NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-07-07 12:02:08', '2026-07-07 12:02:08'),
(4, 7, 'super-admin-7', 'Super Admin', NULL, 0, 'Super Admin', 'superadmin@local.test', '01700000001', NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-07-07 12:40:33', '2026-07-07 12:40:33');

-- --------------------------------------------------------

--
-- Table structure for table `shipping_addresses`
--

CREATE TABLE `shipping_addresses` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `label` enum('Home','Office','Other') DEFAULT 'Home',
  `customer_name` varchar(255) NOT NULL,
  `customer_phone` varchar(20) NOT NULL,
  `division` varchar(100) DEFAULT NULL,
  `district` varchar(100) DEFAULT NULL,
  `thana` varchar(100) DEFAULT NULL,
  `address` text NOT NULL,
  `is_default` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sub_categories`
--

CREATE TABLE `sub_categories` (
  `id` int(11) NOT NULL,
  `category_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sub_categories`
--

INSERT INTO `sub_categories` (`id`, `category_id`, `name`, `created_at`) VALUES
(1, 1, 'Smartphones', '2026-07-02 06:05:08'),
(2, 1, 'Laptops', '2026-07-02 06:05:08'),
(3, 2, 'Mobile accessories', '2026-07-02 06:05:08'),
(4, 2, 'Headphones & earbuds', '2026-07-02 06:05:08'),
(5, 3, 'Television', '2026-07-02 06:05:08'),
(6, 3, 'Fans', '2026-07-02 06:05:08'),
(7, 7, 'Furniture', '2026-07-02 06:05:08'),
(8, 7, 'Bedding', '2026-07-02 06:05:08');

-- --------------------------------------------------------

--
-- Table structure for table `transaction`
--

CREATE TABLE `transaction` (
  `id` int(11) NOT NULL,
  `order_id` int(11) DEFAULT NULL,
  `order_number` varchar(50) DEFAULT NULL,
  `user_id` varchar(255) DEFAULT NULL,
  `gateway` varchar(50) DEFAULT 'sslcommerz',
  `payment_method` varchar(50) DEFAULT 'sslcommerz',
  `transaction_id` varchar(120) NOT NULL,
  `bank_transaction_id` varchar(120) DEFAULT NULL,
  `validation_id` varchar(255) DEFAULT NULL,
  `card_type` varchar(60) DEFAULT NULL,
  `card_no` varchar(30) DEFAULT NULL,
  `store_amount` decimal(12,2) DEFAULT NULL,
  `tran_date` varchar(30) DEFAULT NULL,
  `risk_level` tinyint(4) DEFAULT NULL,
  `risk_title` varchar(30) DEFAULT NULL,
  `verify_sign` varchar(100) DEFAULT NULL,
  `verify_sign_sha2` varchar(100) DEFAULT NULL,
  `bkash_trx_id` varchar(120) DEFAULT NULL,
  `bkash_payment_id` varchar(255) DEFAULT NULL,
  `bkash_intent` varchar(50) DEFAULT NULL,
  `amount` decimal(12,2) DEFAULT 0.00,
  `currency` varchar(10) DEFAULT 'BDT',
  `gateway_status` varchar(60) DEFAULT 'initiated',
  `payment_status` varchar(60) DEFAULT 'unpaid',
  `gateway_url` text DEFAULT NULL,
  `init_payload` longtext DEFAULT NULL,
  `init_response` longtext DEFAULT NULL,
  `return_payload` longtext DEFAULT NULL,
  `validation_payload` longtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_profile`
--

CREATE TABLE `user_profile` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `display_name` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` varchar(300) DEFAULT NULL,
  `profile_image_url` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `banners`
--
ALTER TABLE `banners`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_banners_active_sort` (`is_active`,`sort_order`);

--
-- Indexes for table `bkash_settings`
--
ALTER TABLE `bkash_settings`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `coupons`
--
ALTER TABLE `coupons`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`),
  ADD KEY `idx_coupons_code` (`code`),
  ADD KEY `idx_coupons_seller_id` (`seller_id`),
  ADD KEY `idx_coupons_active` (`is_active`),
  ADD KEY `idx_coupons_expires_at` (`expires_at`);

--
-- Indexes for table `deliverymen`
--
ALTER TABLE `deliverymen`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD KEY `idx_deliverymen_user_id` (`user_id`),
  ADD KEY `idx_deliverymen_kyc_status` (`kyc_status`),
  ADD KEY `idx_deliverymen_verified` (`verified`);

--
-- Indexes for table `delivery_areas`
--
ALTER TABLE `delivery_areas`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_delivery_area_user_district_thana` (`user_id`,`district`,`thana`),
  ADD KEY `idx_delivery_areas_user_id` (`user_id`),
  ADD KEY `idx_delivery_areas_district` (`district`),
  ADD KEY `idx_delivery_areas_thana` (`thana`),
  ADD KEY `idx_delivery_areas_area` (`area`);

--
-- Indexes for table `delivery_requests`
--
ALTER TABLE `delivery_requests`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `mart_conversations`
--
ALTER TABLE `mart_conversations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_conv` (`product_id`,`user_id`,`seller_id`),
  ADD KEY `idx_conv_user` (`user_id`),
  ADD KEY `idx_conv_seller_user` (`seller_user_id`),
  ADD KEY `idx_conv_seller` (`seller_id`),
  ADD KEY `idx_conv_product` (`product_id`);

--
-- Indexes for table `mart_messages`
--
ALTER TABLE `mart_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_msg_conversation` (`conversation_id`),
  ADD KEY `idx_msg_sender` (`sender_id`);

--
-- Indexes for table `nagad_settings`
--
ALTER TABLE `nagad_settings`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `orders_count`
--
ALTER TABLE `orders_count`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_orders_count_product` (`product_id`);

--
-- Indexes for table `order_items`
--
ALTER TABLE `order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_id` (`order_id`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_products_seller_id` (`seller_id`),
  ADD KEY `idx_products_status` (`status`),
  ADD KEY `idx_products_featured` (`featured`),
  ADD KEY `idx_products_category_id` (`category_id`),
  ADD KEY `idx_products_sub_category_id` (`sub_category_id`);

--
-- Indexes for table `product_questions`
--
ALTER TABLE `product_questions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_product_questions_product_id` (`product_id`),
  ADD KEY `idx_product_questions_user_id` (`user_id`),
  ADD KEY `idx_product_questions_seller_id` (`seller_id`),
  ADD KEY `idx_product_questions_visible` (`is_visible`);

--
-- Indexes for table `product_wishlists`
--
ALTER TABLE `product_wishlists`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_product` (`user_id`,`product_id`),
  ADD KEY `idx_wishlist_user_id` (`user_id`),
  ADD KEY `idx_wishlist_product_id` (`product_id`);

--
-- Indexes for table `reviews`
--
ALTER TABLE `reviews`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_reviews_user_id` (`user_id`),
  ADD KEY `idx_reviews_product_id` (`product_id`),
  ADD KEY `idx_reviews_star_review` (`star_review`);

--
-- Indexes for table `rocket_settings`
--
ALTER TABLE `rocket_settings`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `sellers`
--
ALTER TABLE `sellers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD UNIQUE KEY `slug` (`slug`);

--
-- Indexes for table `shipping_addresses`
--
ALTER TABLE `shipping_addresses`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `sub_categories`
--
ALTER TABLE `sub_categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_sub_category` (`category_id`,`name`);

--
-- Indexes for table `transaction`
--
ALTER TABLE `transaction`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_transaction_id` (`transaction_id`),
  ADD KEY `idx_transaction_order_id` (`order_id`),
  ADD KEY `idx_transaction_user_id` (`user_id`),
  ADD KEY `idx_transaction_gateway_status` (`gateway_status`),
  ADD KEY `idx_transaction_bkash_trx_id` (`bkash_trx_id`);

--
-- Indexes for table `user_profile`
--
ALTER TABLE `user_profile`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD KEY `idx_user_profile_user_id` (`user_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `banners`
--
ALTER TABLE `banners`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `bkash_settings`
--
ALTER TABLE `bkash_settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=290;

--
-- AUTO_INCREMENT for table `coupons`
--
ALTER TABLE `coupons`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `deliverymen`
--
ALTER TABLE `deliverymen`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `delivery_areas`
--
ALTER TABLE `delivery_areas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `delivery_requests`
--
ALTER TABLE `delivery_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `mart_conversations`
--
ALTER TABLE `mart_conversations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `mart_messages`
--
ALTER TABLE `mart_messages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `nagad_settings`
--
ALTER TABLE `nagad_settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `orders_count`
--
ALTER TABLE `orders_count`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `order_items`
--
ALTER TABLE `order_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `product_questions`
--
ALTER TABLE `product_questions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `product_wishlists`
--
ALTER TABLE `product_wishlists`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `reviews`
--
ALTER TABLE `reviews`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `rocket_settings`
--
ALTER TABLE `rocket_settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sellers`
--
ALTER TABLE `sellers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `shipping_addresses`
--
ALTER TABLE `shipping_addresses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sub_categories`
--
ALTER TABLE `sub_categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=193;

--
-- AUTO_INCREMENT for table `transaction`
--
ALTER TABLE `transaction`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user_profile`
--
ALTER TABLE `user_profile`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `coupons`
--
ALTER TABLE `coupons`
  ADD CONSTRAINT `fk_coupons_seller` FOREIGN KEY (`seller_id`) REFERENCES `sellers` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `mart_messages`
--
ALTER TABLE `mart_messages`
  ADD CONSTRAINT `fk_msg_conversation` FOREIGN KEY (`conversation_id`) REFERENCES `mart_conversations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `fk_products_sub_category` FOREIGN KEY (`sub_category_id`) REFERENCES `sub_categories` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `product_questions`
--
ALTER TABLE `product_questions`
  ADD CONSTRAINT `fk_product_questions_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_product_questions_seller` FOREIGN KEY (`seller_id`) REFERENCES `sellers` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `reviews`
--
ALTER TABLE `reviews`
  ADD CONSTRAINT `fk_reviews_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
