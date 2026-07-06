-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jul 04, 2026 at 02:31 PM
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
-- Database: `yess_service_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `bookings`
--

CREATE TABLE `bookings` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `service_id` char(36) DEFAULT NULL,
  `package_id` char(36) DEFAULT NULL,
  `service_slug` varchar(255) NOT NULL,
  `service_title` varchar(255) NOT NULL,
  `package_name` varchar(255) NOT NULL,
  `package_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `customer_name` varchar(150) NOT NULL,
  `customer_phone` varchar(30) NOT NULL,
  `customer_address` text NOT NULL,
  `booking_date` date NOT NULL,
  `booking_time` time NOT NULL,
  `status` enum('pending','confirmed','processing','assigned','completed','cancelled') NOT NULL DEFAULT 'pending',
  `payment_status` enum('unpaid','paid','refunded') NOT NULL DEFAULT 'unpaid',
  `platform_fee_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `provider_id` char(36) DEFAULT NULL,
  `assigned_to` char(36) DEFAULT NULL,
  `note` text DEFAULT NULL,
  `cancel_reason` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `payment_amount` decimal(10,2) DEFAULT 0.00,
  `payment_gateway` varchar(50) DEFAULT NULL,
  `payment_order_id` varchar(100) DEFAULT NULL,
  `payment_transaction_id` varchar(100) DEFAULT NULL,
  `payment_verified_at` datetime DEFAULT NULL,
  `payment_payload` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `bookings`
--

INSERT INTO `bookings` (`id`, `user_id`, `service_id`, `package_id`, `service_slug`, `service_title`, `package_name`, `package_price`, `customer_name`, `customer_phone`, `customer_address`, `booking_date`, `booking_time`, `status`, `payment_status`, `provider_id`, `assigned_to`, `note`, `cancel_reason`, `created_at`, `updated_at`, `payment_amount`, `payment_gateway`, `payment_order_id`, `payment_transaction_id`, `payment_verified_at`, `payment_payload`) VALUES
('084ca45e-52c6-4d6b-a687-620cf66b4a86', '19', 'fb2b9b0f-6df8-11f1-9283-dc4a3e486e03', '61bab67b-6ec5-11f1-b9de-dc4a3e486e03', 'home-cleaning', 'বাড়ি পরিষ্কার', 'বেসিক ক্লিনিং', 500.00, 'Mohima Chowdhury', '01444444444', 'Malibagh, Dhaka, Bangladesh', '2026-06-30', '19:00:00', 'pending', 'paid', NULL, NULL, NULL, NULL, '2026-06-28 10:10:56', '2026-06-28 10:11:35', 100.00, 'shurjopay', 'WCN6a40f33150d0c', '6a40f33a', '2026-06-28 16:11:35', '{\"initiated\":{\"checkout_url\":\"https://sandbox.securepay.shurjopayment.com/spaycheckout/?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL3NhbmRib3guc2h1cmpvcGF5bWVudC5jb20vYXBpL2xvZ2luIiwiaWF0IjoxNzgyNjQxNDU3LCJleHAiOjE3ODI2NDIzNTcsIm5iZiI6MTc4MjY0MTQ1NywianRpIjoiOHFWWDlRR280SzNxOGZleCIsInN1YiI6IjEiLCJwcnYiOiI4MDVmMzllZWZjYzY4YWZkOTgyNWI0MTIyN2RhZDBhMDc2YzQ5NzkzIn0.6YyRxKzCtBm7vKTlIKO5TZbexI8Uqx5qalU3Cra0SSs&order_id=WCN6a40f33150d0c\",\"amount\":100,\"currency\":\"BDT\",\"sp_order_id\":\"WCN6a40f33150d0c\",\"customer_order_id\":\"WCN1782641457257084ca45e52\",\"customer_name\":\"Mohima Chowdhury\",\"customer_address\":\"Malibagh, Dhaka, Bangladesh\",\"customer_city\":\"Dhaka\",\"customer_phone\":\"01444444444\",\"customer_email\":null,\"client_ip\":\"::1\",\"intent\":\"sale\",\"transactionStatus\":\"Initiated\",\"transactionType\":\"general\"},\"customer_order_id\":\"WCN1782641457257084ca45e52\",\"gateway_order_id\":\"WCN6a40f33150d0c\",\"verified\":[{\"id\":132037,\"order_id\":\"WCN6a40f33150d0c\",\"currency\":\"BDT\",\"amount\":\"100.0000\",\"payable_amount\":\"100.0000\",\"discount_amount\":\"0.0000\",\"disc_percent\":0,\"recived_amount\":\"100.0000\",\"usd_amt\":\"0.0000\",\"usd_rate\":0,\"is_verify\":0,\"card_holder_name\":null,\"card_number\":null,\"phone_no\":\"01444444444\",\"bank_trx_id\":\"6a40f33a\",\"invoice_no\":\"WCN6a40f33150d0c\",\"bank_status\":\"Success\",\"customer_order_id\":\"WCN1782641457257084ca45e52\",\"sp_code\":\"1000\",\"sp_massage\":\"Success\",\"sp_message\":\"Success\",\"name\":\"Mohima Chowdhury\",\"email\":\"\",\"address\":\"Malibagh, Dhaka, Bangladesh\",\"city\":\"Dhaka\",\"value1\":\"084ca45e-52c6-4d6b-a687-620cf66b4a86\",\"value2\":\"service_booking\",\"value3\":\"500\",\"value4\":\"2526-5074275650\",\"transaction_status\":\"Success\",\"method\":\"Nagad\",\"date_time\":\"2026-06-28 16:11:06\"}],\"verified_order_id\":\"WCN6a40f33150d0c\"}'),
('4a04b174-6cd0-47ad-8cc3-636e657149b3', '19', 'fb2b9b0f-6df8-11f1-9283-dc4a3e486e03', '61bacc46-6ec5-11f1-b9de-dc4a3e486e03', 'home-cleaning', 'বাড়ি পরিষ্কার', 'ডিপ ক্লিনিং', 1500.00, 'Mohima Chowdhury', '01677777777', 'Malibagh, Dhaka, Bangladesh', '2026-06-29', '15:00:00', 'pending', 'paid', NULL, NULL, NULL, NULL, '2026-06-28 10:04:09', '2026-06-28 10:08:07', 300.00, 'shurjopay', 'WCN6a40f19b5b602', '6a40f1a3', '2026-06-28 16:08:07', '{\"initiated\":{\"checkout_url\":\"https://sandbox.securepay.shurjopayment.com/spaycheckout/?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL3NhbmRib3guc2h1cmpvcGF5bWVudC5jb20vYXBpL2xvZ2luIiwiaWF0IjoxNzgyNjQxMDUwLCJleHAiOjE3ODI2NDE5NTAsIm5iZiI6MTc4MjY0MTA1MCwianRpIjoicGtHVE80Z2RyT25OTGVZZiIsInN1YiI6IjEiLCJwcnYiOiI4MDVmMzllZWZjYzY4YWZkOTgyNWI0MTIyN2RhZDBhMDc2YzQ5NzkzIn0.7ZJTu2XZ35aT_ft2FPWJhDy4r-gfToSACX77RjRyVOA&order_id=WCN6a40f19b5b602\",\"amount\":300,\"currency\":\"BDT\",\"sp_order_id\":\"WCN6a40f19b5b602\",\"customer_order_id\":\"WCN17826410502864a04b1746c\",\"customer_name\":\"Mohima Chowdhury\",\"customer_address\":\"Malibagh, Dhaka, Bangladesh\",\"customer_city\":\"Dhaka\",\"customer_phone\":\"01677777777\",\"customer_email\":null,\"client_ip\":\"::1\",\"intent\":\"sale\",\"transactionStatus\":\"Initiated\",\"transactionType\":\"general\"},\"customer_order_id\":\"WCN17826410502864a04b1746c\",\"gateway_order_id\":\"WCN6a40f19b5b602\",\"verified\":[{\"id\":132035,\"order_id\":\"WCN6a40f19b5b602\",\"currency\":\"BDT\",\"amount\":\"300.0000\",\"payable_amount\":\"300.0000\",\"discount_amount\":\"0.0000\",\"disc_percent\":0,\"recived_amount\":\"300.0000\",\"usd_amt\":\"0.0000\",\"usd_rate\":0,\"is_verify\":0,\"card_holder_name\":null,\"card_number\":null,\"phone_no\":\"01677777777\",\"bank_trx_id\":\"6a40f1a3\",\"invoice_no\":\"WCN6a40f19b5b602\",\"bank_status\":\"Success\",\"customer_order_id\":\"WCN17826410502864a04b1746c\",\"sp_code\":\"1000\",\"sp_massage\":\"Success\",\"sp_message\":\"Success\",\"name\":\"Mohima Chowdhury\",\"email\":\"\",\"address\":\"Malibagh, Dhaka, Bangladesh\",\"city\":\"Dhaka\",\"value1\":\"4a04b174-6cd0-47ad-8cc3-636e657149b3\",\"value2\":\"service_booking\",\"value3\":\"1500\",\"value4\":\"2526-5573448086\",\"transaction_status\":\"Success\",\"method\":\"Nagad\",\"date_time\":\"2026-06-28 16:04:19\"}],\"verified_order_id\":\"WCN6a40f19b5b602\"}'),
('5c355baa-4b50-42b7-9223-58a2ced39bb4', '19', 'fb2b9b0f-6df8-11f1-9283-dc4a3e486e03', '61bacc46-6ec5-11f1-b9de-dc4a3e486e03', 'home-cleaning', 'বাড়ি পরিষ্কার', 'ডিপ ক্লিনিং', 1500.00, 'Mohima Chowdhury', '01555555555', 'Malibagh, Dhaka, Bangladesh', '2026-06-30', '13:00:00', 'assigned', 'paid', '2', '2', NULL, NULL, '2026-06-28 10:17:38', '2026-06-28 10:23:39', 300.00, 'shurjopay', 'WCN6a40f4c2cbd77', '6a40f4c9', '2026-06-28 16:17:47', '{\"initiated\":{\"checkout_url\":\"https://sandbox.securepay.shurjopayment.com/spaycheckout/?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL3NhbmRib3guc2h1cmpvcGF5bWVudC5jb20vYXBpL2xvZ2luIiwiaWF0IjoxNzgyNjQxODU4LCJleHAiOjE3ODI2NDI3NTgsIm5iZiI6MTc4MjY0MTg1OCwianRpIjoiY2xUSkFwWW5SbGZvak9DVSIsInN1YiI6IjEiLCJwcnYiOiI4MDVmMzllZWZjYzY4YWZkOTgyNWI0MTIyN2RhZDBhMDc2YzQ5NzkzIn0.cGZ20Ug20f6yZyWUMJTeDkmeHg0AI4FNJ0Upzzt6-Gw&order_id=WCN6a40f4c2cbd77\",\"amount\":300,\"currency\":\"BDT\",\"sp_order_id\":\"WCN6a40f4c2cbd77\",\"customer_order_id\":\"WCN17826418587645c355baa4b\",\"customer_name\":\"Mohima Chowdhury\",\"customer_address\":\"Malibagh, Dhaka, Bangladesh\",\"customer_city\":\"Dhaka\",\"customer_phone\":\"01555555555\",\"customer_email\":null,\"client_ip\":\"::1\",\"intent\":\"sale\",\"transactionStatus\":\"Initiated\",\"transactionType\":\"general\"},\"customer_order_id\":\"WCN17826418587645c355baa4b\",\"gateway_order_id\":\"WCN6a40f4c2cbd77\",\"verified\":[{\"id\":132038,\"order_id\":\"WCN6a40f4c2cbd77\",\"currency\":\"BDT\",\"amount\":\"300.0000\",\"payable_amount\":\"300.0000\",\"discount_amount\":\"0.0000\",\"disc_percent\":0,\"recived_amount\":\"300.0000\",\"usd_amt\":\"0.0000\",\"usd_rate\":0,\"is_verify\":0,\"card_holder_name\":null,\"card_number\":null,\"phone_no\":\"01555555555\",\"bank_trx_id\":\"6a40f4c9\",\"invoice_no\":\"WCN6a40f4c2cbd77\",\"bank_status\":\"Success\",\"customer_order_id\":\"WCN17826418587645c355baa4b\",\"sp_code\":\"1000\",\"sp_massage\":\"Success\",\"sp_message\":\"Success\",\"name\":\"Mohima Chowdhury\",\"email\":\"\",\"address\":\"Malibagh, Dhaka, Bangladesh\",\"city\":\"Dhaka\",\"value1\":\"5c355baa-4b50-42b7-9223-58a2ced39bb4\",\"value2\":\"service_booking\",\"value3\":\"1500\",\"value4\":\"2526-4360748880\",\"transaction_status\":\"Success\",\"method\":\"Nagad\",\"date_time\":\"2026-06-28 16:17:45\"}],\"verified_order_id\":\"WCN6a40f4c2cbd77\"}'),
('a1d956eb-ea00-4b15-9700-76b6f2748f28', '19', 'fb2b9b0f-6df8-11f1-9283-dc4a3e486e03', '61bacc46-6ec5-11f1-b9de-dc4a3e486e03', 'home-cleaning', 'বাড়ি পরিষ্কার', 'ডিপ ক্লিনিং', 1500.00, 'Mohima Chowdhury', '01869777777', 'Malibagh, Dhaka, Bangladesh', '2026-06-30', '12:00:00', 'assigned', 'paid', '2', '2', NULL, NULL, '2026-06-30 10:20:05', '2026-06-30 10:33:18', 300.00, 'shurjopay', 'WCN6a439856199b4', '6a439860', '2026-06-30 16:20:18', '{\"initiated\":{\"checkout_url\":\"https://sandbox.securepay.shurjopayment.com/spaycheckout/?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL3NhbmRib3guc2h1cmpvcGF5bWVudC5jb20vYXBpL2xvZ2luIiwiaWF0IjoxNzgyODE0ODA1LCJleHAiOjE3ODI4MTU3MDUsIm5iZiI6MTc4MjgxNDgwNSwianRpIjoiZU5qaDZXTUpzRkZUbFdFVyIsInN1YiI6IjEiLCJwcnYiOiI4MDVmMzllZWZjYzY4YWZkOTgyNWI0MTIyN2RhZDBhMDc2YzQ5NzkzIn0.MhEVS47MtRgd7GznfCCtzGsm4DHfpq8M5Ba927d2rY4&order_id=WCN6a439856199b4\",\"amount\":300,\"currency\":\"BDT\",\"sp_order_id\":\"WCN6a439856199b4\",\"customer_order_id\":\"WCN1782814805841a1d956ebea\",\"customer_name\":\"Mohima Chowdhury\",\"customer_address\":\"Malibagh, Dhaka, Bangladesh\",\"customer_city\":\"Dhaka\",\"customer_phone\":\"01869777777\",\"customer_email\":null,\"client_ip\":\"::1\",\"intent\":\"sale\",\"transactionStatus\":\"Initiated\",\"transactionType\":\"general\"},\"customer_order_id\":\"WCN1782814805841a1d956ebea\",\"gateway_order_id\":\"WCN6a439856199b4\",\"verified\":[{\"id\":132090,\"order_id\":\"WCN6a439856199b4\",\"currency\":\"BDT\",\"amount\":\"300.0000\",\"payable_amount\":\"300.0000\",\"discount_amount\":\"0.0000\",\"disc_percent\":0,\"recived_amount\":\"300.0000\",\"usd_amt\":\"0.0000\",\"usd_rate\":0,\"is_verify\":0,\"card_holder_name\":null,\"card_number\":null,\"phone_no\":\"01869777777\",\"bank_trx_id\":\"6a439860\",\"invoice_no\":\"WCN6a439856199b4\",\"bank_status\":\"Success\",\"customer_order_id\":\"WCN1782814805841a1d956ebea\",\"sp_code\":\"1000\",\"sp_massage\":\"Success\",\"sp_message\":\"Success\",\"name\":\"Mohima Chowdhury\",\"email\":\"\",\"address\":\"Malibagh, Dhaka, Bangladesh\",\"city\":\"Dhaka\",\"value1\":\"a1d956eb-ea00-4b15-9700-76b6f2748f28\",\"value2\":\"service_booking\",\"value3\":\"1500\",\"value4\":\"2526-6933128088\",\"transaction_status\":\"Success\",\"method\":\"Nagad\",\"date_time\":\"2026-06-30 16:20:16\"}],\"verified_order_id\":\"WCN6a439856199b4\"}'),
('ab8d767f-55d8-4637-bfbc-c4b050d08f3b', '17', 'fb2b9b0f-6df8-11f1-9283-dc4a3e486e03', '61bacc46-6ec5-11f1-b9de-dc4a3e486e03', 'home-cleaning', 'বাড়ি পরিষ্কার', 'ডিপ ক্লিনিং', 1500.00, 'Mohima Chowdhury', '01555555555', 'Malibagh, Dhaka, Bangladesh', '2026-06-28', '15:00:00', 'pending', 'paid', NULL, NULL, NULL, NULL, '2026-06-28 09:51:39', '2026-06-28 09:59:46', 300.00, 'shurjopay', 'WCN6a40eeac2bbdc', '6a40eeb9', '2026-06-28 15:59:46', '{\"initiated\":{\"checkout_url\":\"https://sandbox.securepay.shurjopayment.com/spaycheckout/?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL3NhbmRib3guc2h1cmpvcGF5bWVudC5jb20vYXBpL2xvZ2luIiwiaWF0IjoxNzgyNjQwMjk5LCJleHAiOjE3ODI2NDExOTksIm5iZiI6MTc4MjY0MDI5OSwianRpIjoiNFZpVnBydk9qejc2UkJFdyIsInN1YiI6IjEiLCJwcnYiOiI4MDVmMzllZWZjYzY4YWZkOTgyNWI0MTIyN2RhZDBhMDc2YzQ5NzkzIn0.UYs2tu1eiZ8DPqpWN4whr9QxK4vqq3u9Vmy3NocfdG4&order_id=WCN6a40eeac2bbdc\",\"amount\":300,\"currency\":\"BDT\",\"sp_order_id\":\"WCN6a40eeac2bbdc\",\"customer_order_id\":\"WCN1782640300113ab8d767f55\",\"customer_name\":\"Mohima Chowdhury\",\"customer_address\":\"Malibagh, Dhaka, Bangladesh\",\"customer_city\":\"Dhaka\",\"customer_phone\":\"01555555555\",\"customer_email\":null,\"client_ip\":\"::1\",\"intent\":\"sale\",\"transactionStatus\":\"Initiated\",\"transactionType\":\"general\"},\"customer_order_id\":\"WCN1782640300113ab8d767f55\",\"gateway_order_id\":\"WCN6a40eeac2bbdc\",\"verified\":[{\"id\":132034,\"order_id\":\"WCN6a40eeac2bbdc\",\"currency\":\"BDT\",\"amount\":\"300.0000\",\"payable_amount\":\"300.0000\",\"discount_amount\":\"0.0000\",\"disc_percent\":0,\"recived_amount\":\"300.0000\",\"usd_amt\":\"0.0000\",\"usd_rate\":0,\"is_verify\":0,\"card_holder_name\":null,\"card_number\":null,\"phone_no\":\"01555555555\",\"bank_trx_id\":\"6a40eeb9\",\"invoice_no\":\"WCN6a40eeac2bbdc\",\"bank_status\":\"Success\",\"customer_order_id\":\"WCN1782640300113ab8d767f55\",\"sp_code\":\"1000\",\"sp_massage\":\"Success\",\"sp_message\":\"Success\",\"name\":\"Mohima Chowdhury\",\"email\":\"\",\"address\":\"Malibagh, Dhaka, Bangladesh\",\"city\":\"Dhaka\",\"value1\":\"ab8d767f-55d8-4637-bfbc-c4b050d08f3b\",\"value2\":\"service_booking\",\"value3\":\"1500\",\"value4\":\"2526-8894608399\",\"transaction_status\":\"Success\",\"method\":\"Nagad\",\"date_time\":\"2026-06-28 15:51:53\"}],\"verified_order_id\":\"WCN6a40eeac2bbdc\"}'),
('b718149c-51f8-42dd-a01c-fbe76e176459', '19', 'fb2b9b0f-6df8-11f1-9283-dc4a3e486e03', '61bab67b-6ec5-11f1-b9de-dc4a3e486e03', 'home-cleaning', 'বাড়ি পরিষ্কার', 'বেসিক ক্লিনিং', 500.00, 'Mohima Chowdhury', '01687888888', 'Malibagh, Dhaka, Bangladesh', '2026-06-30', '12:00:00', 'pending', 'unpaid', NULL, NULL, NULL, NULL, '2026-06-30 10:04:07', '2026-06-30 10:04:07', 0.00, NULL, NULL, NULL, NULL, NULL),
('c6a523e2-95a8-4dd9-967d-4922ebfa595a', '19', 'fb2b9b0f-6df8-11f1-9283-dc4a3e486e03', '61bab67b-6ec5-11f1-b9de-dc4a3e486e03', 'home-cleaning', 'বাড়ি পরিষ্কার', 'বেসিক ক্লিনিং', 500.00, 'Mohima Chowdhury', '01869913146', 'Malibagh, Dhaka, Bangladesh', '2026-06-24', '08:00:00', 'completed', 'unpaid', '2', '2', NULL, NULL, '2026-06-24 06:28:31', '2026-06-25 09:33:57', 0.00, NULL, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `providers`
--

CREATE TABLE `providers` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` int(11) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `address` text NOT NULL,
  `service_category` varchar(100) NOT NULL,
  `experience_years` int(11) DEFAULT 0 CHECK (`experience_years` >= 0),
  `nid_front_url` text NOT NULL,
  `nid_back_url` text NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'pending' CHECK (`status` in ('pending','approved','rejected')),
  `status_reason` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `providers`
--

INSERT INTO `providers` (`id`, `user_id`, `full_name`, `phone`, `email`, `address`, `service_category`, `experience_years`, `nid_front_url`, `nid_back_url`, `status`, `status_reason`, `created_at`, `updated_at`) VALUES
(2, 17, 'Mohima Chowdhury', '01869641316', 'apple.mohima@gmail.com', 'Malibagh, Dhaka, Bangladesh', 'driver', 1, 'uploads/1782302546249-pngtree-whatsapp-social-media-icon-design-template-vector-whatsapp-logo-picture-image_3654780.png', 'uploads/1782302546256-pngtree-whatsapp-social-media-icon-design-template-vector-whatsapp-logo-picture-image_3654780.png', 'approved', NULL, '2026-06-18 11:48:08', '2026-06-24 12:04:10');

-- --------------------------------------------------------

--
-- Table structure for table `services`
--

CREATE TABLE `services` (
  `id` char(36) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `title` text NOT NULL,
  `title_en` text DEFAULT NULL,
  `image_url` text DEFAULT NULL,
  `description` text DEFAULT NULL,
  `rating` decimal(2,1) DEFAULT 4.5,
  `total_reviews` int(11) DEFAULT 0,
  `total_orders` int(11) DEFAULT 0,
  `commission_percent` decimal(5,2) DEFAULT 10.00,
  `features` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`features`)),
  `available_cities` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`available_cities`)),
  `category_id` char(36) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `sort_order` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `platform_fee` decimal(10,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `services`
--

INSERT INTO `services` (`id`, `slug`, `title`, `title_en`, `image_url`, `description`, `rating`, `total_reviews`, `total_orders`, `commission_percent`, `features`, `available_cities`, `category_id`, `is_active`, `sort_order`, `created_at`, `updated_at`, `price`) VALUES
('00e3d6ec-ae0e-4b3a-bcae-b9c03f48e68c', 'hhhhhh', 'bbbbb', 'hhhhhh', 'Et voluptatibus a ut', 'Do odit eum suscipit', 5.0, 49, 3, 10.00, '[\"Exercitation minim r\"]', '[\"Dhaka\"]', NULL, 1, 0, '2026-06-23 06:18:28', '2026-06-23 06:18:28', 5000.00),
('153e9e86-7fa8-4be0-9509-dce00ca16049', 'Dolorem cupiditate n', 'Libehj hjtfjuy', 'Qui commodo irure fa', 'Nihil aut expedita s', 'Sunt hic eum quasi ', 9.9, 80, 9, 91.00, '[\"Non quis elit eu ap\"]', '[\"Labore iste quidem e\"]', 'f8291ecf-6d54-11f1-a4d1-dc4a3e486e10', 1, 58, '2026-06-30 07:23:17', '2026-06-30 07:24:10', 0.00),
('24c60105-2702-4991-869f-7f2074c22f6b', 'computer-fixing', 'computer fixing', 'computer fixing', 'Et voluptatibus a ut', 'Do odit eum suscipit', 5.0, 49, 3, 10.00, '[\"Exercitation minim r\"]', '[\"Dhaka\"]', 'f8291ecf-6d54-11f1-a4d1-dc4a3e486e10', 1, 0, '2026-06-23 06:20:34', '2026-06-23 06:27:47', 70.00),
('7b1f5d47-96aa-4e8b-aae9-9bc2fc81ca6e', 'Velit qui voluptatem', 'Electrical service', 'Dolor eum id dolore', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTRX7REjTOWeNww_PLHum5G3wOzpZGkzZUu1A&s', 'Exercitation atque i', 9.9, 19, 43, 12.00, '[\"Deserunt ducimus vo\"]', '[\"Dhaka\"]', 'f8291b64-6d54-11f1-a4d1-dc4a3e486e03', 1, 51, '2026-06-21 10:38:11', '2026-06-22 07:48:28', 5000.00),
('7b3a8e11-8f2c-4bb2-8e11-dc4a3e486e12', 'interior-wall-painting', 'ইন্টেরিয়র ওয়াল পেইন্টিং', 'Interior Wall Painting', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRr8JMbRpOu8hUqrpR-p4ygIKp0WbVsPtkwEDuhgGdNnbsiJuF9euLbMv1r&s=10', 'বাসা, ফ্ল্যাট বা অফিসের ভেতরের দেয়াল সুন্দরভাবে রং করার জন্য অভিজ্ঞ পেইন্টার সার্ভিস।', 4.8, 0, 0, 10.00, '[\"দেয়াল প্রস্তুত করা\",\"প্রিমিয়াম কালার ফিনিশ\",\"পরিষ্কার কাজ\",\"অভিজ্ঞ পেইন্টার\"]', '[\"Dhaka\",\"Gazipur\",\"Narayanganj\",\"Chattogram\"]', 'f8291ca9-6d54-11f1-a4d1-dc4a3e486e12', 1, 1, '2026-07-02 06:05:17', '2026-07-02 06:31:36', 2500.00),
('7b3a8e12-8f2c-4bb2-8e12-dc4a3e486e12', 'exterior-wall-painting', 'এক্সটেরিয়র ওয়াল পেইন্টিং', 'Exterior Wall Painting', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQHVcKbG5bHuHtJpQTxJHkY5eN5zG2I2gieWzOvImxTj-UaTyJcFUufcZo&s=10', 'বাড়ি বা ভবনের বাইরের দেয়ালে ওয়েদার-প্রুফ পেইন্টিং এবং দীর্ঘস্থায়ী ফিনিশিং সার্ভিস।', 4.7, 0, 0, 10.00, '[\"বাইরের দেয়াল পেইন্ট\",\"ওয়েদার প্রোটেকশন\",\"দীর্ঘস্থায়ী ফিনিশ\",\"ক্র্যাক চেকআপ\"]', '[\"Dhaka\",\"Gazipur\",\"Narayanganj\",\"Chattogram\"]', 'f8291ca9-6d54-11f1-a4d1-dc4a3e486e12', 1, 2, '2026-07-02 06:05:17', '2026-07-02 06:29:54', 3500.00),
('7b3a8e13-8f2c-4bb2-8e13-dc4a3e486e12', 'room-painting-service', 'রুম পেইন্টিং সার্ভিস', 'Room Painting Service', 'https://static.asianpaints.com/content/dam/asian_paints/sps_overhaul/sps_landingpage/why-choose-us-desktop.jpeg', 'বেডরুম, ড্রয়িংরুম, অফিস রুম বা দোকানের জন্য দ্রুত ও সুন্দর রুম পেইন্টিং সার্ভিস।', 4.8, 0, 0, 10.00, '[\"রুম কালার পেইন্ট\",\"স্মুথ ফিনিশিং\",\"দ্রুত কাজ\",\"কালার সাজেশন\"]', '[\"Dhaka\",\"Gazipur\",\"Narayanganj\",\"Chattogram\"]', 'f8291ca9-6d54-11f1-a4d1-dc4a3e486e12', 1, 3, '2026-07-02 06:05:17', '2026-07-02 06:29:37', 1800.00),
('7b3a8e14-8f2c-4bb2-8e14-dc4a3e486e12', 'waterproof-painting', 'ওয়াটারপ্রুফ পেইন্টিং', 'Waterproof Painting', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcREXgFsQRiKQYTVDOxnrbAF7GZy-RAH_TU2Sz6y6IaYBIgf0qNqsf1_qKA&s=10', 'দেয়ালে স্যাঁতসেঁতে ভাব, পানি চুইয়ে পড়া বা ড্যাম্প সমস্যা কমাতে ওয়াটারপ্রুফ পেইন্টিং সার্ভিস।', 4.7, 0, 0, 10.00, '[\"ড্যাম্প প্রোটেকশন\",\"ওয়াটারপ্রুফ কোটিং\",\"দেয়াল সিলিং\",\"দীর্ঘস্থায়ী সুরক্ষা\"]', '[\"Dhaka\",\"Gazipur\",\"Narayanganj\",\"Chattogram\"]', 'f8291ca9-6d54-11f1-a4d1-dc4a3e486e12', 1, 4, '2026-07-02 06:05:17', '2026-07-02 06:28:23', 3200.00),
('7b3a8e15-8f2c-4bb2-8e15-dc4a3e486e12', 'texture-design-painting', 'টেক্সচার ডিজাইন পেইন্টিং', 'Texture Design Painting', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQH6ySyZNJozRqCcgNzkEEwBdn05bOdUzNfGI7eW5Oqy5-et3JDBElSu8A&s=10', 'ঘর বা অফিসের দেয়ালে প্রিমিয়াম লুক দিতে টেক্সচার, ডিজাইন ও ডেকোরেটিভ পেইন্টিং সার্ভিস।', 4.9, 0, 0, 10.00, '[\"টেক্সচার ডিজাইন\",\"ডেকোরেটিভ ওয়াল\",\"প্রিমিয়াম ফিনিশ\",\"কাস্টম কালার ডিজাইন\"]', '[\"Dhaka\",\"Gazipur\",\"Narayanganj\",\"Chattogram\"]', 'f8291ca9-6d54-11f1-a4d1-dc4a3e486e12', 1, 5, '2026-07-02 06:05:17', '2026-07-02 06:27:38', 4500.00),
('8a7d1e11-92f4-4c31-8e11-dc4a3e486e03', 'cockroach-control', 'তেলাপোকা নিয়ন্ত্রণ', 'Cockroach Control', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRR4CFncq4zyr8Yh71hm9BNCjKeir-8Oh9_dmzf_6Wc3Ondd4vplJXit_E&s=10', 'বাসা, রান্নাঘর, রেস্টুরেন্ট বা অফিসে তেলাপোকা দূর করার জন্য নিরাপদ ও কার্যকর পেস্ট কন্ট্রোল সার্ভিস।', 4.8, 0, 0, 10.00, '[\"তেলাপোকা দূরীকরণ\",\"কিচেন ট্রিটমেন্ট\",\"নিরাপদ কেমিক্যাল\",\"দীর্ঘস্থায়ী সুরক্ষা\"]', '[\"Dhaka\",\"Gazipur\",\"Narayanganj\",\"Chattogram\"]', 'f8291cdc-6d54-11f1-a4d1-dc4a3e486e03', 1, 1, '2026-07-02 06:07:32', '2026-07-02 06:25:01', 1200.00),
('8a7d1e12-92f4-4c31-8e12-dc4a3e486e03', 'bed-bug-control', 'ছারপোকা নিয়ন্ত্রণ', 'Bed Bug Control', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSdhfFTBq1pMQiQXafmN9bbEFXcQ0qD_Dq8eH-FbOXeN0Z7RS8vw9eYFqw&s=10', 'বিছানা, সোফা, ম্যাট্রেস ও আসবাবপত্রে ছারপোকা সমস্যা দূর করার জন্য প্রফেশনাল ট্রিটমেন্ট সার্ভিস।', 4.7, 0, 0, 10.00, '[\"ছারপোকা দূরীকরণ\",\"বেড ও সোফা ট্রিটমেন্ট\",\"স্প্রে সার্ভিস\",\"রুম ইনস্পেকশন\"]', '[\"Dhaka\",\"Gazipur\",\"Narayanganj\",\"Chattogram\"]', 'f8291cdc-6d54-11f1-a4d1-dc4a3e486e03', 1, 2, '2026-07-02 06:07:32', '2026-07-02 06:18:12', 1800.00),
('8a7d1e13-92f4-4c31-8e13-dc4a3e486e03', 'termite-control', 'উইপোকা নিয়ন্ত্রণ', 'Termite Control', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR18TwIQQD5DA4JnpSngmlIkq1O60Hj8kIOuo_tsvPvNXyDBIARWxElCck&s=10', 'কাঠের আসবাব, দরজা, জানালা ও দেয়ালে উইপোকা সমস্যা দূর করতে বিশেষায়িত টার্মাইট কন্ট্রোল সার্ভিস।', 4.8, 0, 0, 10.00, '[\"উইপোকা ট্রিটমেন্ট\",\"কাঠের আসবাব সুরক্ষা\",\"দীর্ঘস্থায়ী কেমিক্যাল\",\"প্রফেশনাল ইনস্পেকশন\"]', '[\"Dhaka\",\"Gazipur\",\"Narayanganj\",\"Chattogram\"]', 'f8291cdc-6d54-11f1-a4d1-dc4a3e486e03', 1, 3, '2026-07-02 06:07:32', '2026-07-02 06:17:13', 2500.00),
('8a7d1e14-92f4-4c31-8e14-dc4a3e486e03', 'mosquito-control', 'মশা নিয়ন্ত্রণ', 'Mosquito Control', 'https://cpimg.tistatic.com/00961047/b/9/Mosquito-Control-Services.png', 'বাসা, অফিস, ছাদ, গ্যারেজ বা আশেপাশের এলাকায় মশা কমাতে স্প্রে ও ফগিং সার্ভিস।', 4.6, 0, 0, 10.00, '[\"মশা নিয়ন্ত্রণ\",\"ফগিং সার্ভিস\",\"স্প্রে ট্রিটমেন্ট\",\"বাসা ও অফিস সার্ভিস\"]', '[\"Dhaka\",\"Gazipur\",\"Narayanganj\",\"Chattogram\"]', 'f8291cdc-6d54-11f1-a4d1-dc4a3e486e03', 1, 4, '2026-07-02 06:07:32', '2026-07-02 06:16:31', 1000.00),
('8a7d1e15-92f4-4c31-8e15-dc4a3e486e03', 'full-home-pest-control', 'ফুল হোম পেস্ট কন্ট্রোল', 'Full Home Pest Control', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRj2Ap8RQKwgwBFIpVrsNCCgv2HtCOF36Obk5jM3HqtKsXhwSmfr7a58uw&s=10', 'পুরো বাসা বা অফিসের তেলাপোকা, পিঁপড়া, মশা, ছারপোকা ও অন্যান্য পোকামাকড় নিয়ন্ত্রণের সম্পূর্ণ সার্ভিস।', 4.9, 0, 0, 10.00, '[\"পুরো বাসা ট্রিটমেন্ট\",\"সব ধরনের পোকা নিয়ন্ত্রণ\",\"নিরাপদ কেমিক্যাল\",\"কমপ্লিট ইনস্পেকশন\"]', '[\"Dhaka\",\"Gazipur\",\"Narayanganj\",\"Chattogram\"]', 'f8291cdc-6d54-11f1-a4d1-dc4a3e486e03', 1, 5, '2026-07-02 06:07:32', '2026-07-02 06:16:06', 3000.00),
('a1c00101-6f10-11f1-9a11-dc4a3e486e14', 'basic-ac-servicing', 'বেসিক এসি সার্ভিসিং', 'Basic AC Servicing', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRZBc2a8VZSoLoHk1MpIKRoQr9GcVNvKO6QIG6ISumdfFFDhhG7Qu3OKuS1&s=10', 'এসি ফিল্টার পরিষ্কার, ইনডোর ইউনিট ক্লিনিং এবং সাধারণ পারফরম্যান্স চেকআপের জন্য বেসিক সার্ভিস।', 4.7, 0, 0, 10.00, '[\"ফিল্টার ক্লিনিং\",\"ইনডোর ইউনিট চেকআপ\",\"কুলিং পারফরম্যান্স টেস্ট\",\"দ্রুত সার্ভিস\"]', '[\"Dhaka\",\"Gazipur\",\"Narayanganj\",\"Chattogram\"]', 'f8291c3d-6d54-11f1-a4d1-dc4a3e486e14', 1, 1, '2026-07-02 05:50:00', '2026-07-02 06:15:42', 500.00),
('a1c00102-6f10-11f1-9a11-dc4a3e486e14', 'ac-deep-cleaning', 'এসি ডিপ ক্লিনিং', 'AC Deep Cleaning', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT8lv5WwNLOZns8-RaztjId1hR9_Xk2nvxV5EnjUbeF57jyUZwi27Bk-w0&s=10', 'ইনডোর ও আউটডোর ইউনিটের ডিপ ক্লিনিং, কয়েল ওয়াশ এবং ধুলাবালি পরিষ্কারের জন্য প্রিমিয়াম সার্ভিস।', 4.8, 0, 0, 10.00, '[\"ইনডোর ডিপ ক্লিনিং\",\"আউটডোর ইউনিট ক্লিনিং\",\"কয়েল ওয়াশ\",\"ফাঙ্গাস ও ধুলাবালি পরিষ্কার\"]', '[\"Dhaka\",\"Gazipur\",\"Narayanganj\",\"Chattogram\"]', 'f8291c3d-6d54-11f1-a4d1-dc4a3e486e14', 1, 2, '2026-07-02 05:50:00', '2026-07-02 06:15:24', 900.00),
('a1c00103-6f10-11f1-9a11-dc4a3e486e14', 'ac-gas-refill', 'এসি গ্যাস রিফিল', 'AC Gas Refill', 'https://i0.wp.com/24sevendays.com/wp-content/uploads/2020/12/Split-AC-Gas-Refill-Service-by-Expert.png?fit=700%2C800&ssl=1', 'এসি কুলিং কমে গেলে গ্যাস প্রেসার চেক, লিক টেস্ট এবং প্রয়োজন অনুযায়ী গ্যাস রিফিল সার্ভিস।', 4.6, 0, 0, 10.00, '[\"গ্যাস প্রেসার চেক\",\"লিকেজ টেস্ট\",\"গ্যাস রিফিল\",\"কুলিং টেস্ট\"]', '[\"Dhaka\",\"Gazipur\",\"Narayanganj\",\"Chattogram\"]', 'f8291c3d-6d54-11f1-a4d1-dc4a3e486e14', 1, 3, '2026-07-02 05:50:00', '2026-07-02 06:14:59', 1800.00),
('a1c00104-6f10-11f1-9a11-dc4a3e486e14', 'ac-installation', 'এসি ইনস্টলেশন', 'AC Installation', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT7p_PnyK5SZbtG-pQ7347mljtce3ldQWkBNFyWJGtYxsnfA8dG3HU8m2Va&s=10', 'নতুন এসি সেটআপ, ইনডোর-আউটডোর ইউনিট ফিটিং, পাইপ কানেকশন এবং টেস্ট রানসহ সম্পূর্ণ ইনস্টলেশন সার্ভিস।', 4.8, 0, 0, 10.00, '[\"নতুন এসি সেটআপ\",\"ইনডোর-আউটডোর ফিটিং\",\"পাইপ কানেকশন\",\"টেস্ট রান\"]', '[\"Dhaka\",\"Gazipur\",\"Narayanganj\",\"Chattogram\"]', 'f8291c3d-6d54-11f1-a4d1-dc4a3e486e14', 1, 4, '2026-07-02 05:50:00', '2026-07-02 06:14:03', 2000.00),
('a1c00105-6f10-11f1-9a11-dc4a3e486e14', 'ac-repair-maintenance', 'এসি রিপেয়ার ও মেইনটেন্যান্স', 'AC Repair & Maintenance', 'https://www.acservicebd.com/wp-content/uploads/2023/06/ac-servicing-acservicebd-dhaka.jpg', 'এসি থেকে পানি পড়া, শব্দ হওয়া, কুলিং না হওয়া বা ইলেকট্রিক সমস্যার জন্য রিপেয়ার ও মেইনটেন্যান্স সার্ভিস।', 4.7, 0, 0, 10.00, '[\"কুলিং সমস্যা সমাধান\",\"পানি পড়া ঠিক করা\",\"ইলেকট্রিক চেকআপ\",\"কম্প্রেসর ও ফ্যান চেক\"]', '[\"Dhaka\",\"Gazipur\",\"Narayanganj\",\"Chattogram\"]', 'f8291c3d-6d54-11f1-a4d1-dc4a3e486e14', 1, 5, '2026-07-02 05:50:00', '2026-07-02 06:13:42', 1200.00),
('af0a7397-e88b-4bc3-b8da-3864095afa07', 'Repudiandae est reru', 'Sed voluptatem sit ', 'Alias consequatur et', 'Et voluptatibus a ut', 'Do odit eum suscipit', 5.0, 49, 3, 10.00, '[\"Exercitation minim r\"]', '[\"Dhaka\"]', NULL, 1, 0, '2026-06-21 10:37:05', '2026-06-22 07:48:34', 5000.00),
('c1a11111-1111-1111-1111-111111111111', 'home-painting', 'বাড়ি রঙ করা', 'Home Painting', 'https://images.unsplash.com/photo-1581578731548-c64695cc6952', 'Professional home painting service with premium finish', 4.6, 85, 210, 15.00, '[\"Wall painting\", \"Color consultation\", \"Interior design\"]', '[\"Dhaka\", \"Khulna\"]', 'e755cabd-35d0-4edf-879a-eab88b99f34a', 1, 6, '2026-06-22 06:00:00', '2026-06-22 07:48:39', 5000.00),
('c1a11111-1111-1111-1111-111111111112', 'refrigerator-repair', 'ফ্রিজ মেরামত', 'Refrigerator Repair', 'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30', 'Fast and reliable refrigerator repair service at your doorstep', 4.5, 70, 180, 12.00, '[\"Gas refill\", \"Cooling issue fix\", \"Motor repair\"]', '[\"Dhaka\", \"Chittagong\"]', 'f8291b64-6d54-11f1-a4d1-dc4a3e486e03', 1, 7, '2026-06-22 06:00:00', '2026-06-22 07:48:43', 5000.00),
('c1a11111-1111-1111-1111-111111111113', 'mobile-repair', 'মোবাইল মেরামত', 'Mobile Repair', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9', 'Expert mobile phone repair service for all brands', 4.7, 150, 500, 18.00, '[\"Screen replacement\", \"Battery change\", \"Software fix\"]', '[\"Dhaka\"]', 'f8291b28-6d54-11f1-a4d1-dc4a3e486e70', 1, 8, '2026-06-22 06:00:00', '2026-06-22 07:48:47', 5000.00),
('c1a11111-1111-1111-1111-111111111114', 'pest-control', 'পেস্ট কন্ট্রোল', 'Pest Control', 'https://images.unsplash.com/photo-1601597111158-2fceff292cdc', 'Safe and effective pest control service for home and office', 4.3, 55, 120, 10.00, '[\"Termite control\", \"Cockroach removal\", \"Mosquito treatment\"]', '[\"Dhaka\", \"Sylhet\", \"Khulna\"]', 'e755cabd-35d0-4edf-879a-eab88b99f34a', 1, 9, '2026-06-22 06:00:00', '2026-06-22 07:48:51', 5000.00),
('c1a11111-1111-1111-1111-111111111115', 'home-shifting', 'বাসা স্থানান্তর', 'Home Shifting', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c', 'Reliable home shifting and moving service with packing support', 4.8, 95, 260, 20.00, '[\"Packing\", \"Loading\", \"Transport\", \"Unloading\"]', '[\"Dhaka\", \"Chittagong\"]', 'e755cabd-35d0-4edf-879a-eab88b99f34a', 1, 10, '2026-06-22 06:00:00', '2026-06-22 07:48:54', 5000.00),
('c2a11111-aaaa-1111-1111-111111111111', 'house-cleaning-deep', 'ডিপ হাউস ক্লিনিং', 'Deep House Cleaning', 'https://images.unsplash.com/photo-1581578731548-c64695cc6952', 'Complete deep cleaning service for homes and apartments', 4.8, 110, 320, 15.00, '[\"Deep cleaning\", \"Floor scrubbing\", \"Kitchen sanitation\"]', '[\"Dhaka\", \"Khulna\"]', 'e755cabd-35d0-4edf-879a-eab88b99f34a', 1, 11, '2026-06-22 07:00:00', '2026-06-22 07:49:02', 5000.00),
('c2a11111-aaaa-1111-1111-111111111112', 'fan-repair', 'ফ্যান মেরামত', 'Fan Repair', 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789', 'Ceiling and table fan repair service', 4.3, 40, 95, 10.00, '[\"Motor repair\", \"Blade fixing\"]', '[\"Dhaka\"]', 'f8291b64-6d54-11f1-a4d1-dc4a3e486e03', 1, 12, '2026-06-22 07:00:00', '2026-06-22 07:49:05', 5000.00),
('c2a11111-aaaa-1111-1111-111111111113', 'washing-machine-repair', 'ওয়াশিং মেশিন মেরামত', 'Washing Machine Repair', 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1', 'Expert washing machine troubleshooting and repair', 4.6, 88, 210, 14.00, '[\"Drum repair\", \"Water leakage fix\", \"Motor service\"]', '[\"Dhaka\", \"Chittagong\"]', 'f8291c70-6d54-11f1-a4d1-dc4a3e486e13', 1, 13, '2026-06-22 07:00:00', '2026-06-22 07:49:09', 5000.00),
('c2a11111-aaaa-1111-1111-111111111114', 'wall-paint-design', 'দেয়াল ডিজাইন', 'Wall Design Painting', 'https://images.unsplash.com/photo-1505691723518-36a5ac3be353', 'Modern artistic wall painting and design service', 4.7, 75, 160, 16.00, '[\"Art painting\", \"Texture design\", \"Color mixing\"]', '[\"Dhaka\", \"Khulna\"]', 'f8291ca9-6d54-11f1-a4d1-dc4a3e486e12', 1, 14, '2026-06-22 07:00:00', '2026-06-22 07:49:16', 5000.00),
('c2a11111-aaaa-1111-1111-111111111115', 'termite-treatment', 'উইপোকা প্রতিরোধ', 'Termite Treatment', 'https://images.unsplash.com/photo-1601597111158-2fceff292cdc', 'Professional termite control and prevention service', 4.5, 60, 140, 12.00, '[\"Chemical treatment\", \"Prevention coating\"]', '[\"Dhaka\", \"Sylhet\"]', 'f8291cdc-6d54-11f1-a4d1-dc4a3e486e03', 1, 15, '2026-06-22 07:00:00', '2026-06-22 07:49:21', 5000.00),
('c2a11111-aaaa-1111-1111-111111111116', 'garden-maintenance', 'বাগান পরিচর্যা', 'Garden Maintenance', 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735', 'Complete garden setup and maintenance service', 4.4, 50, 120, 11.00, '[\"Plant trimming\", \"Soil care\", \"Fertilizing\"]', '[\"Dhaka\", \"Khulna\"]', 'f8291d30-6d54-11f1-a4d1-dc4a3e486e05', 1, 16, '2026-06-22 07:00:00', '2026-06-22 07:49:24', 5000.00),
('c2a11111-aaaa-1111-1111-111111111117', 'packing-moving', 'প্যাকিং ও মুভিং', 'Packing & Moving', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c', 'Safe packing and relocation service', 4.9, 130, 340, 18.00, '[\"Packing\", \"Loading\", \"Transport\"]', '[\"Dhaka\", \"Chittagong\"]', 'f8291d5f-6d54-11f1-a4d1-dc4a3e486e06', 1, 17, '2026-06-22 07:00:00', '2026-06-22 07:49:27', 5000.00),
('c2a11111-aaaa-1111-1111-111111111118', 'laundry-service', 'লন্ড্রি সার্ভিস', 'Laundry Service', 'https://images.unsplash.com/photo-1581579185169-21c5d9f5a1b7', 'Professional wash and dry cleaning service', 4.6, 90, 200, 13.00, '[\"Wash\", \"Dry clean\", \"Ironing\"]', '[\"Dhaka\"]', 'f8291d8e-6d54-11f1-a4d1-dc4a3e486e07', 1, 18, '2026-06-22 07:00:00', '2026-06-22 07:49:30', 5000.00),
('c2a11111-aaaa-1111-1111-111111111119', 'salon-at-home', 'হোম স্যালন', 'Home Salon Service', 'https://images.unsplash.com/photo-1522337660859-02fbefca4702', 'Beauty and salon service at your home', 4.8, 150, 400, 20.00, '[\"Haircut\", \"Facial\", \"Makeup\"]', '[\"Dhaka\", \"Khulna\"]', 'f8291e6c-6d54-11f1-a4d1-dc4a3e486e08', 1, 19, '2026-06-22 07:00:00', '2026-06-22 07:49:33', 5000.00),
('c2a11111-aaaa-1111-1111-111111111120', 'cctv-security-install', 'সিসিটিভি ইনস্টলেশন', 'CCTV Installation', 'https://images.unsplash.com/photo-1581092160607-ee22731c2c2f', 'Home and office CCTV setup and maintenance', 4.7, 100, 260, 17.00, '[\"Installation\", \"Repair\", \"Monitoring setup\"]', '[\"Dhaka\", \"Chittagong\"]', 'f8291f02-6d54-11f1-a4d1-dc4a3e486e11', 1, 20, '2026-06-22 07:00:00', '2026-06-22 07:49:37', 5000.00),
('c3a11111-1111-1111-1111-111111111101', 'car-detailing', 'কার ডিটেইলিং', 'Car Detailing', 'https://images.unsplash.com/photo-1503376780353-7e6692767b70', 'Complete interior and exterior car detailing service', 4.8, 120, 340, 15.00, '[\"Interior deep clean\", \"Wax polish\", \"Engine cleaning\"]', '[\"Dhaka\", \"Chittagong\"]', 'f8291a5a-6d54-11f1-a4d1-dc4a3e486e55', 1, 21, '2026-06-22 07:10:00', '2026-06-22 07:49:40', 5000.00),
('c3a11111-1111-1111-1111-111111111102', 'car-polishing', 'কার পলিশিং', 'Car Polishing', 'https://images.unsplash.com/photo-1525609004556-c46c7d6cf023', 'Professional car polishing and shine restoration', 4.6, 95, 210, 12.00, '[\"Body polish\", \"Scratch removal\", \"Shine coating\"]', '[\"Dhaka\"]', 'f8291a5a-6d54-11f1-a4d1-dc4a3e486e55', 1, 22, '2026-06-22 07:10:00', '2026-06-22 07:49:46', 5000.00),
('c3a11111-1111-1111-1111-111111111103', 'engine-wash', 'ইঞ্জিন ওয়াশ', 'Engine Wash', 'https://images.unsplash.com/photo-1613214149922-f1809c99b414', 'Safe engine cleaning and degreasing service', 4.5, 80, 180, 10.00, '[\"Engine degreasing\", \"Oil removal\"]', '[\"Dhaka\", \"Khulna\"]', 'f8291a5a-6d54-11f1-a4d1-dc4a3e486e55', 1, 23, '2026-06-22 07:10:00', '2026-06-22 07:49:52', 5000.00),
('c3a11111-1111-1111-1111-111111111104', 'car-denting', 'কার ডেন্টিং', 'Car Denting', 'https://images.unsplash.com/photo-1605559424843-9eec3f7c8a0c', 'Fix dents and body damage professionally', 4.7, 110, 250, 18.00, '[\"Dent removal\", \"Body repair\"]', '[\"Dhaka\", \"Chittagong\"]', 'f8291a5a-6d54-11f1-a4d1-dc4a3e486e55', 1, 24, '2026-06-22 07:10:00', '2026-06-22 07:49:58', 5000.00),
('c3a11111-1111-1111-1111-111111111105', 'car-painting', 'কার পেইন্টিং', 'Car Painting', 'https://images.unsplash.com/photo-1502877338535-766e1452684a', 'Full car repainting and color restoration service', 4.9, 150, 400, 20.00, '[\"Full repaint\", \"Color change\", \"Scratch fix\"]', '[\"Dhaka\"]', 'f8291a5a-6d54-11f1-a4d1-dc4a3e486e55', 1, 25, '2026-06-22 07:10:00', '2026-06-22 11:56:27', 5000.00),
('c3a11111-1111-1111-1111-111111111106', 'car-ac-repair', 'কার এসি সার্ভিস', 'Car AC Repair', 'https://images.unsplash.com/photo-1613214150330-3b5f3c7f0d2b', 'Car air conditioning repair and gas refill', 4.6, 90, 220, 14.00, '[\"AC gas refill\", \"Cooling fix\"]', '[\"Dhaka\", \"Sylhet\"]', 'f8291a5a-6d54-11f1-a4d1-dc4a3e486e55', 1, 26, '2026-06-22 07:10:00', '2026-06-22 08:12:58', 5000.00),
('c3a11111-1111-1111-1111-111111111107', 'car-battery-service', 'কার ব্যাটারি সার্ভিস', 'Car Battery Service', 'https://images.unsplash.com/photo-1600185365926-3b7f6a5b1f9c', 'Battery check, replacement and charging service', 4.4, 70, 160, 10.00, '[\"Battery replacement\", \"Charging\", \"Testing\"]', '[\"Dhaka\"]', 'f8291a5a-6d54-11f1-a4d1-dc4a3e486e55', 1, 27, '2026-06-22 07:10:00', '2026-06-22 11:56:31', 5000.00),
('c3a11111-1111-1111-1111-111111111108', 'tire-repair', 'টায়ার রিপেয়ার', 'Tire Repair', 'https://images.unsplash.com/photo-1601362840469-51e4d8d58785', 'Puncture repair and tire replacement service', 4.5, 85, 190, 12.00, '[\"Puncture fix\", \"Tire change\"]', '[\"Dhaka\", \"Chittagong\"]', 'f8291a5a-6d54-11f1-a4d1-dc4a3e486e55', 1, 28, '2026-06-22 07:10:00', '2026-06-22 11:56:36', 5000.00),
('c3a11111-1111-1111-1111-111111111109', 'car-windshield-repair', 'গাড়ির গ্লাস রিপেয়ার', 'Windshield Repair', 'https://images.unsplash.com/photo-1625047509168-a7026f36de04', 'Crack and windshield repair service', 4.6, 60, 140, 11.00, '[\"Glass repair\", \"Chip fixing\"]', '[\"Dhaka\"]', 'f8291a5a-6d54-11f1-a4d1-dc4a3e486e55', 1, 29, '2026-06-22 07:10:00', '2026-06-22 11:56:39', 5000.00),
('c3a11111-1111-1111-1111-111111111110', 'car-washing-premium', 'প্রিমিয়াম কার ওয়াশ', 'Premium Car Wash', 'https://images.unsplash.com/photo-1502877338535-766e1452684a', 'High quality premium car washing service', 4.7, 130, 300, 15.00, '[\"Foam wash\", \"Interior cleaning\", \"Wax coating\"]', '[\"Dhaka\", \"Khulna\"]', 'f8291a5a-6d54-11f1-a4d1-dc4a3e486e55', 1, 30, '2026-06-22 07:10:00', '2026-06-22 11:56:43', 5000.00),
('eee82d8f-08c2-4115-83a6-7daf9277ef98', 'Perferendis sit cons', 'Officia consequuntur', 'Magni in repellendus', 'Beatae illo aut alia', 'Qui pariatur Et bla', 9.9, 25, 99, 41.00, '[\"Pariatur Similique\"]', '[\"Dhaka, Sylhet, Khulna, Rajshahi\"]', NULL, 0, 18, '2026-06-21 10:27:27', '2026-06-22 11:56:47', 5000.00),
('fb2b9b0f-6df8-11f1-9283-dc4a3e486e03', 'home-cleaning', 'বাড়ি পরিষ্কার', 'Home Cleaning', 'https://www.thespruce.com/thmb/f-8SHiPrpdI-V5cfbamOOno5fzI=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/SPR-house-cleaning-checklist-5443113-hero-bfe165b4af2f4a86ac0ace570db9a333.jpg', 'Professional home cleaning service', 5.0, 1, 300, 15.00, '[\"Deep cleaning\", \"Kitchen cleaning\", \"Bathroom cleaning\"]', '[\"Dhaka\", \"Chittagong\"]', 'e755cabd-35d0-4edf-879a-eab88b99f34a', 1, 1, '2026-06-22 05:12:35', '2026-06-29 05:43:57', 500.00),
('fb2bb6d8-6df8-11f1-9283-dc4a3e486e03', 'car-wash', 'গাড়ি ধোয়া', 'Car Wash', 'https://upload.wikimedia.org/wikipedia/commons/7/7c/2015_K%C5%82odzko%2C_ul._Dusznicka%2C_myjnia_samochodowa_02.jpg', 'Doorstep car wash service', 4.5, 80, 200, 12.00, '[\"Exterior wash\", \"Interior cleaning\"]', '[\"Dhaka\"]', 'f8291a5a-6d54-11f1-a4d1-dc4a3e486e55', 1, 2, '2026-06-22 05:12:35', '2026-06-22 11:57:21', 5000.00),
('fb2bb815-6df8-11f1-9283-dc4a3e486e03', 'ac-repair', 'এসি মেরামত', 'AC Repair', 'https://static.vecteezy.com/system/resources/thumbnails/071/837/068/small/technician-repairing-white-wall-mounted-air-conditioner-in-modern-indoor-setting-free-photo.jpg', 'Expert AC repair and servicing', 4.6, 95, 150, 18.00, '[\"Gas refill\", \"Full servicing\"]', '[\"Dhaka\", \"Sylhet\"]', 'f8291c3d-6d54-11f1-a4d1-dc4a3e486e14', 1, 3, '2026-06-22 05:12:35', '2026-06-22 11:57:25', 5000.00),
('fb2bb937-6df8-11f1-9283-dc4a3e486e03', 'plumbing-service', 'প্লাম্বিং সার্ভিস', 'Plumbing Service', 'https://img.magnific.com/premium-photo/plumber-using-wrench-repair-water-pipe-sink_101448-3713.jpg?semt=ais_hybrid&w=740&q=80', 'All types of plumbing solutions', 4.4, 60, 110, 10.00, '[\"Pipe fixing\", \"Leak repair\"]', '[\"Dhaka\"]', 'f8291b28-6d54-11f1-a4d1-dc4a3e486e70', 1, 4, '2026-06-22 05:12:35', '2026-06-22 11:57:28', 5000.00),
('fb2bba4f-6df8-11f1-9283-dc4a3e486e03', 'electrician-service', 'ইলেকট্রিশিয়ান', 'Electrician Service', 'https://www.auto.edu/wp-content/uploads/2025/06/ati_blog_electrical-technician_hero-768x512.jpg', 'Certified electricians for home', 4.8, 140, 400, 20.00, '[\"Wiring\", \"Fan setup\", \"Light installation\"]', '[\"Dhaka\", \"Khulna\"]', 'f8291b64-6d54-11f1-a4d1-dc4a3e486e03', 1, 5, '2026-06-22 05:12:35', '2026-06-22 11:57:35', 5000.00),
('plm00101-6f10-11f1-9a11-dc4a3e486e70', 'pipe-leakage-repair', 'পাইপ লিকেজ রিপেয়ার', 'Pipe Leakage Repair', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR9c6qGKEt27n9Qu2rAj4KOaJnPcQ4-pUGwfRusy9PhZeXX3YN6hA8ioXU&s=10', 'বাসা বা অফিসের পানির পাইপ লিকেজ, জয়েন্ট সমস্যা এবং পানির লাইন মেরামতের জন্য অভিজ্ঞ প্লাম্বার সার্ভিস।', 4.7, 0, 0, 10.00, '[\"পাইপ লিকেজ ঠিক করা\",\"জয়েন্ট রিপেয়ার\",\"দ্রুত সার্ভিস\",\"অভিজ্ঞ প্লাম্বার\"]', '[\"Dhaka\",\"Gazipur\",\"Narayanganj\",\"Chattogram\"]', 'f8291b28-6d54-11f1-a4d1-dc4a3e486e70', 1, 1, '2026-07-02 05:55:54', '2026-07-02 06:09:14', 500.00),
('plm00102-6f10-11f1-9a11-dc4a3e486e70', 'bathroom-plumbing-repair', 'বাথরুম প্লাম্বিং রিপেয়ার', 'Bathroom Plumbing Repair', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSN_c1Dr3RP7wwhFfk-vZrkrzZ03P3VhiZc6fUoRuXLuMsJ1hnBqnkTiUEw&s=10', 'বাথরুমের পানির লাইন, শাওয়ার, কল, ড্রেনেজ এবং অন্যান্য প্লাম্বিং সমস্যার জন্য সম্পূর্ণ রিপেয়ার সার্ভিস।', 4.8, 0, 0, 10.00, '[\"বাথরুম লাইন চেকআপ\",\"শাওয়ার রিপেয়ার\",\"কল রিপেয়ার\",\"ড্রেনেজ সমস্যা সমাধান\"]', '[\"Dhaka\",\"Gazipur\",\"Narayanganj\",\"Chattogram\"]', 'f8291b28-6d54-11f1-a4d1-dc4a3e486e70', 1, 2, '2026-07-02 05:55:54', '2026-07-02 06:10:03', 700.00),
('plm00103-6f10-11f1-9a11-dc4a3e486e70', 'basin-sink-repair', 'বেসিন ও সিঙ্ক রিপেয়ার', 'Basin & Sink Repair', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTphSyJAfXxwpQcmPCviqpZHo_LYjOKRPGnACrNH58twr_peL1wzzrNnzlm&s=10', 'বেসিন, কিচেন সিঙ্ক, ড্রেন পাইপ, পানির কল ও ব্লকেজ সমস্যার জন্য নির্ভরযোগ্য প্লাম্বিং সার্ভিস।', 4.6, 0, 0, 10.00, '[\"বেসিন রিপেয়ার\",\"কিচেন সিঙ্ক সার্ভিস\",\"ড্রেন পাইপ চেক\",\"ব্লকেজ ক্লিনিং\"]', '[\"Dhaka\",\"Gazipur\",\"Narayanganj\",\"Chattogram\"]', 'f8291b28-6d54-11f1-a4d1-dc4a3e486e70', 1, 3, '2026-07-02 05:55:54', '2026-07-02 06:10:33', 600.00),
('plm00104-6f10-11f1-9a11-dc4a3e486e70', 'toilet-commode-repair', 'টয়লেট ও কমোড রিপেয়ার', 'Toilet & Commode Repair', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTdppQa_osg6qeewapALNwioUxOao1A0hvQaHQ2mhk56ou2S3IS0KT3jGIF&s=10', 'কমোড ব্লক, ফ্লাশ সমস্যা, পানি লিকেজ এবং টয়লেট ফিটিংস মেরামতের জন্য অভিজ্ঞ টেকনিশিয়ান সার্ভিস।', 4.7, 0, 0, 10.00, '[\"কমোড ব্লক পরিষ্কার\",\"ফ্লাশ রিপেয়ার\",\"লিকেজ ঠিক করা\",\"টয়লেট ফিটিংস সার্ভিস\"]', '[\"Dhaka\",\"Gazipur\",\"Narayanganj\",\"Chattogram\"]', 'f8291b28-6d54-11f1-a4d1-dc4a3e486e70', 1, 4, '2026-07-02 05:55:54', '2026-07-02 06:10:54', 800.00),
('plm00105-6f10-11f1-9a11-dc4a3e486e70', 'water-tap-mixer-installation', 'কল ও মিক্সার ইনস্টলেশন', 'Water Tap & Mixer Installation', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQYFe2DcybGtesu3CYXJ2C6GmIpv7OU2Ugfkwj-pS4P3F4lW1GqC-qsodI&s=10', 'নতুন পানির কল, শাওয়ার মিক্সার, কিচেন মিক্সার এবং বাথরুম ফিটিংস ইনস্টলেশনের জন্য প্রফেশনাল সার্ভিস।', 4.8, 0, 0, 10.00, '[\"নতুন কল সেটআপ\",\"মিক্সার ইনস্টলেশন\",\"শাওয়ার ফিটিং\",\"ফিটিংস চেকআপ\"]', '[\"Dhaka\",\"Gazipur\",\"Narayanganj\",\"Chattogram\"]', 'f8291b28-6d54-11f1-a4d1-dc4a3e486e70', 1, 5, '2026-07-02 05:55:54', '2026-07-02 06:11:16', 650.00),
('plm00106-6f10-11f1-9a11-dc4a3e486e70', 'drain-line-blockage-cleaning', 'ড্রেন লাইন ব্লক পরিষ্কার', 'Drain Line Blockage Cleaning', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT135YLyzVAfyFBxkYW1uTJHDSQZLcKFGN64jqffyIcdhGX6pg5hWSse3c&s=10', 'ড্রেন লাইন ব্লক, পানি জমে থাকা, দুর্গন্ধ এবং ড্রেনেজ ফ্লো সমস্যার জন্য দ্রুত ক্লিনিং সার্ভিস।', 4.6, 0, 0, 10.00, '[\"ড্রেন ব্লক পরিষ্কার\",\"পানি জমা সমস্যা সমাধান\",\"ড্রেনেজ ফ্লো চেক\",\"দ্রুত সার্ভিস\"]', '[\"Dhaka\",\"Gazipur\",\"Narayanganj\",\"Chattogram\"]', 'f8291b28-6d54-11f1-a4d1-dc4a3e486e70', 1, 6, '2026-07-02 05:55:54', '2026-07-02 06:11:39', 1000.00),
('plm00107-6f10-11f1-9a11-dc4a3e486e70', 'water-line-installation', 'পানির লাইন ইনস্টলেশন', 'Water Line Installation', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSelEXKPUiO9KKVlYXcAwZOs0Y-WAv8_Ln1B_EPhjkJPhU_b_qGyDvOy2J1&s=10', 'নতুন পানির লাইন সেটআপ, পাইপ ফিটিং, বাথরুম ও কিচেন লাইনের জন্য সম্পূর্ণ প্লাম্বিং ইনস্টলেশন সার্ভিস।', 4.8, 0, 0, 10.00, '[\"নতুন পানির লাইন সেটআপ\",\"পাইপ ফিটিং\",\"কিচেন ও বাথরুম লাইন\",\"প্রফেশনাল ইনস্টলেশন\"]', '[\"Dhaka\",\"Gazipur\",\"Narayanganj\",\"Chattogram\"]', 'f8291b28-6d54-11f1-a4d1-dc4a3e486e70', 1, 7, '2026-07-02 05:55:54', '2026-07-02 06:12:07', 1500.00);

-- --------------------------------------------------------

--
-- Table structure for table `service_categories`
--

CREATE TABLE `service_categories` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `name` text NOT NULL,
  `slug` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `name_en` varchar(255) DEFAULT NULL,
  `icon_url` text DEFAULT NULL,
  `color_gradient` varchar(255) DEFAULT NULL,
  `color_overlay` varchar(255) DEFAULT NULL,
  `color_chip_bg` varchar(255) DEFAULT NULL,
  `color_chip_text` varchar(255) DEFAULT NULL,
  `color_accent` varchar(20) DEFAULT NULL,
  `sort_order` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `service_categories`
--

INSERT INTO `service_categories` (`id`, `name`, `slug`, `created_at`, `name_en`, `icon_url`, `color_gradient`, `color_overlay`, `color_chip_bg`, `color_chip_text`, `color_accent`, `sort_order`, `is_active`) VALUES
('e755cabd-35d0-4edf-879a-eab88b99f34a', 'ক্লিনিং', 'ut-ratione-in-explic', '2026-06-21 11:47:24', 'Cleaning', 'https://img.magnific.com/free-vector/cleaners-with-cleaning-products-housekeeping-service_18591-52068.jpg?semt=ais_hybrid&w=740&q=80', 'from-blue-600 to-blue-800', 'from-blue-900/80 to-blue-700/40', 'bg-blue-500/15', 'text-blue-700', '#2563eb', 69, 1),
('f8291a5a-6d54-11f1-a4d1-dc4a3e486e55', 'গাড়ি পরিচর্যা', 'car-care', '2026-06-21 09:38:33', 'Car Care', 'https://img.magnific.com/free-vector/flat-car-wash-service-concept-illustration_23-2149049887.jpg?semt=ais_hybrid&w=740&q=80', NULL, NULL, NULL, NULL, NULL, 0, 1),
('f8291b28-6d54-11f1-a4d1-dc4a3e486e70', 'প্লাম্বিং', 'plumbing', '2026-06-21 09:38:33', 'Plumbing', 'https://img.magnific.com/premium-vector/plumber-cartoon-colored-clipart-illustration_576561-8962.jpg', NULL, NULL, NULL, NULL, NULL, 0, 1),
('f8291b64-6d54-11f1-a4d1-dc4a3e486e03', 'ইলেক্ট্রিক্যাল সার্ভিস', 'electrical-services', '2026-06-21 09:38:33', 'Electrical Services', 'https://img.magnific.com/free-vector/hand-drawn-electrician-cartoon-illustration_23-2151046712.jpg?semt=ais_hybrid&w=740&q=80', NULL, NULL, NULL, NULL, NULL, 0, 1),
('f8291c3d-6d54-11f1-a4d1-dc4a3e486e14', 'এসি সার্ভিসিং', 'ac-repair', '2026-06-21 09:38:33', 'AC Servicing', 'https://static.vecteezy.com/system/resources/thumbnails/037/741/852/small/hvac-service-cartoon-character-design-illustration-vector.jpg', NULL, NULL, NULL, NULL, NULL, 0, 1),
('f8291c70-6d54-11f1-a4d1-dc4a3e486e13', 'যন্ত্রপাতি মেরামত', 'appliance-repair', '2026-06-21 09:38:33', 'Appliance Repair', 'https://img.magnific.com/free-vector/household-renovation-professions-with-man_23-2148655517.jpg?semt=ais_hybrid&w=740&q=80', NULL, NULL, NULL, NULL, NULL, 0, 1),
('f8291ca9-6d54-11f1-a4d1-dc4a3e486e12', 'রঙ করা', 'painting', '2026-06-21 09:38:33', 'Painting', 'https://img.magnific.com/free-vector/house-painter-cartoon-background_1284-17072.jpg?semt=ais_hybrid&w=740&q=80', NULL, NULL, NULL, NULL, NULL, 0, 1),
('f8291cdc-6d54-11f1-a4d1-dc4a3e486e03', 'পেস্ট কন্ট্রোল', 'pest-control', '2026-06-21 09:38:33', 'Pest Control', 'https://static.vecteezy.com/system/resources/previews/009/951/662/non_2x/pest-control-service-with-exterminator-of-insects-sprays-and-house-hygiene-disinfection-in-flat-cartoon-background-illustration-vector.jpg', NULL, NULL, NULL, NULL, NULL, 0, 1),
('f8291d30-6d54-11f1-a4d1-dc4a3e486e05', 'বাগান পরিচর্যা', 'gardening', '2026-06-21 09:38:33', 'Gardening', 'https://static.vecteezy.com/system/resources/previews/001/967/193/non_2x/gardening-at-home-free-vector.jpg', NULL, NULL, NULL, NULL, NULL, 0, 1),
('f8291d5f-6d54-11f1-a4d1-dc4a3e486e06', 'বাড়ি বদলানো', 'home-shifting', '2026-06-21 09:38:33', 'Home Shifting', 'https://cdnl.iconscout.com/lottie/premium/preview/girl-is-moving-home-animation-gif-download-8628632.png', NULL, NULL, NULL, NULL, NULL, 0, 1),
('f8291d8e-6d54-11f1-a4d1-dc4a3e486e07', 'কাপড় ধোয়া ও ইস্ত্রি করা', 'laundry-dry-cleaning', '2026-06-21 09:38:33', 'Laundry Dry Cleaning', 'https://as2.ftcdn.net/jpg/04/35/40/29/1000_F_435402948_3ky1Bt4BK0QVZhk9rL19fJa0QQ9FIwbC.jpg', NULL, NULL, NULL, NULL, NULL, 0, 1),
('f8291e6c-6d54-11f1-a4d1-dc4a3e486e08', 'বিউটি সেলুন', 'beauty-salon', '2026-06-21 09:38:33', 'Beauty & Salon', 'https://thumbs.dreamstime.com/b/beauty-salon-interior-woman-stylist-cuts-female-client-hair-cartoon-vector-hairdresser-workplace-furniture-cosmetic-343366281.jpg', NULL, NULL, NULL, NULL, NULL, 0, 1),
('f8291e9f-6d54-11f1-a4d1-dc4a3e486e09', 'গাড়ি মেরামত', 'car-repair', '2026-06-21 09:38:33', 'Car Repair', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRjdGvrrDnnhA6yyFQlP-MBRR88AbTPMS9KyQ&s', NULL, NULL, NULL, NULL, NULL, 0, 1),
('f8291ecf-6d54-11f1-a4d1-dc4a3e486e10', 'কম্পিউটার রিপেয়ার', 'computer-repair', '2026-06-21 09:38:33', 'Computer Repair', 'https://static.vecteezy.com/system/resources/thumbnails/074/639/665/small_2x/4k-animation-of-idea-for-repair-and-maintenance-service-concept-computer-screen-with-wrench-gear-screwdriver-and-lightbulb-represents-engineer-thinking-to-solving-device-troubleshooting-video.jpg', NULL, NULL, NULL, NULL, NULL, 0, 1),
('f8291f02-6d54-11f1-a4d1-dc4a3e486e11', 'সিসিটিভি ইন্সটলেশন', 'cctv-installation', '2026-06-21 09:38:33', 'CCTV Installation', 'https://static.vecteezy.com/system/resources/previews/023/845/425/non_2x/video-surveillance-installation-professional-installs-video-security-camera-isolated-illustration-installing-cctv-vector.jpg', NULL, NULL, NULL, NULL, NULL, 0, 1);

-- --------------------------------------------------------

--
-- Table structure for table `service_packages`
--

CREATE TABLE `service_packages` (
  `id` char(36) NOT NULL,
  `service_id` char(36) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `name_en` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `description_en` text DEFAULT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `discount_price` decimal(10,2) DEFAULT NULL,
  `duration` varchar(100) DEFAULT NULL,
  `duration_en` varchar(100) DEFAULT NULL,
  `features` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `is_popular` tinyint(1) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `sort_order` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `service_packages`
--

INSERT INTO `service_packages` (`id`, `service_id`, `slug`, `name`, `name_en`, `description`, `description_en`, `price`, `discount_price`, `duration`, `duration_en`, `features`, `is_popular`, `is_active`, `sort_order`, `created_at`, `updated_at`) VALUES
('61bab67b-6ec5-11f1-b9de-dc4a3e486e03', 'fb2b9b0f-6df8-11f1-9283-dc4a3e486e03', 'basic-cleaning', 'বেসিক ক্লিনিং', 'Basic Cleaning', 'সাধারণ ঘর পরিষ্কার', 'Basic home cleaning service', 500.00, NULL, '২ ঘণ্টা', '2 Hours', '[\"Floor cleaning\", \"Dust cleaning\", \"Basic washroom cleaning\"]', 0, 1, 1, '2026-06-23 05:35:45', '2026-06-23 05:45:16'),
('61bacc46-6ec5-11f1-b9de-dc4a3e486e03', 'fb2b9b0f-6df8-11f1-9283-dc4a3e486e03', 'deep-cleaning', 'ডিপ ক্লিনিং', 'Deep Cleaning', 'পুরো বাসার ডিপ ক্লিনিং', 'Complete deep cleaning service', 1500.00, 1200.00, '৪ ঘণ্টা', '4 Hours', '[\"Deep cleaning\", \"Kitchen cleaning\", \"Bathroom cleaning\", \"Floor scrubbing\"]', 1, 1, 2, '2026-06-23 05:35:45', '2026-06-23 05:35:45'),
('b52b6dd3-2557-4187-8c16-78f91ef6bf20', '24c60105-2702-4991-869f-7f2074c22f6b', 'libero-nisi-nam-vel', 'Minim magna aut maxi', 'Ea ad voluptas incid', 'Vel nihil explicabo', 'Sequi excepteur labo', 53.00, 70.00, 'Non totam voluptas a', 'Eum necessitatibus e', '[\"Commodo nulla impedi\"]', 0, 1, 52, '2026-06-23 06:27:47', '2026-06-23 06:27:47');

-- --------------------------------------------------------

--
-- Table structure for table `service_reviews`
--

CREATE TABLE `service_reviews` (
  `id` int(11) NOT NULL,
  `service_slug` varchar(150) NOT NULL,
  `user_id` varchar(100) DEFAULT NULL,
  `reviewer_name` varchar(150) NOT NULL,
  `rating` int(11) NOT NULL,
  `comment` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `service_reviews`
--

INSERT INTO `service_reviews` (`id`, `service_slug`, `user_id`, `reviewer_name`, `rating`, `comment`, `created_at`) VALUES
(1, 'home-cleaning', '19', 'Yaseen Chowdhury', 5, 'good', '2026-06-29 05:43:57');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `bookings`
--
ALTER TABLE `bookings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_bookings_user_id` (`user_id`),
  ADD KEY `idx_bookings_status` (`status`),
  ADD KEY `idx_bookings_date_time` (`booking_date`,`booking_time`),
  ADD KEY `idx_bookings_service_slug` (`service_slug`),
  ADD KEY `idx_bookings_package_id` (`package_id`),
  ADD KEY `fk_bookings_service` (`service_id`);

--
-- Indexes for table `providers`
--
ALTER TABLE `providers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_pending_application` (`user_id`,`status`);

--
-- Indexes for table `services`
--
ALTER TABLE `services`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`),
  ADD KEY `category_id` (`category_id`);

--
-- Indexes for table `service_categories`
--
ALTER TABLE `service_categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`);

--
-- Indexes for table `service_packages`
--
ALTER TABLE `service_packages`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_service_package_slug` (`service_id`,`slug`),
  ADD KEY `idx_service_packages_service_id` (`service_id`),
  ADD KEY `idx_service_packages_active` (`is_active`),
  ADD KEY `idx_service_packages_sort` (`sort_order`);

--
-- Indexes for table `service_reviews`
--
ALTER TABLE `service_reviews`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `providers`
--
ALTER TABLE `providers`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `service_reviews`
--
ALTER TABLE `service_reviews`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `bookings`
--
ALTER TABLE `bookings`
  ADD CONSTRAINT `fk_bookings_package` FOREIGN KEY (`package_id`) REFERENCES `service_packages` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_bookings_service` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `services`
--
ALTER TABLE `services`
  ADD CONSTRAINT `services_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `service_categories` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `service_packages`
--
ALTER TABLE `service_packages`
  ADD CONSTRAINT `fk_service_packages_service` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
