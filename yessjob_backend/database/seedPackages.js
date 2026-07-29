// database/seedPackages.js
//
// Seeds the packages table with initial job posting plans.
// Safe to re-run; inserts only if the table is empty.
//
// Mirrors the package structure used in EmployerPanel.tsx:
//   - getPackageIcon shows Zap/Crown/Star/Award/Package based on visibility_level
//   - Features render as a bullet list
//   - is_featured drives the "জনপ্রিয়" badge
//   - sort_order controls display ordering

const mysql = require('mysql2');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'yessjob_backend',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
}).promise();

const PACKAGES = [
  {
    name: 'ফ্রি',
    name_bn: 'ফ্রি',
    name_en: 'Free',
    price: 0,
    duration_days: 15,
    visibility_level: 'basic',
    max_applications: 30,
    max_jobs_per_year: 5,
    features: JSON.stringify([
      '১৫ দিন ভিজিবিলিটি',
      'সর্বোচ্চ ৩০টি আবেদন',
      '৫টি জব পোস্ট (বার্ষিক)',
      'বেসিক লিস্টিং'
    ]),
    is_featured: 0,
    sort_order: 1,
    is_active: 1,
  },
  {
    name: 'স্ট্যান্ডার্ড',
    name_bn: 'স্ট্যান্ডার্ড',
    name_en: 'Standard',
    price: 499,
    duration_days: 30,
    visibility_level: 'standard',
    max_applications: 100,
    max_jobs_per_year: 15,
    features: JSON.stringify([
      '৩০ দিন ভিজিবিলিটি',
      'সর্বোচ্চ ১০০টি আবেদন',
      '১৫টি জব পোস্ট (বার্ষিক)',
      'স্ট্যান্ডার্ড লিস্টিং',
      'ইমেইল সাপোর্ট',
    ]),
    is_featured: 0,
    sort_order: 2,
    is_active: 1,
  },
  {
    name: 'প্রিমিয়াম',
    name_bn: 'প্রিমিয়াম',
    name_en: 'Premium',
    price: 999,
    duration_days: 45,
    visibility_level: 'premium',
    max_applications: 250,
    max_jobs_per_year: 30,
    features: JSON.stringify([
      '৪৫ দিন ভিজিবিলিটি',
      'সর্বোচ্চ ২৫০টি আবেদন',
      '৩০টি জব পোস্ট (বার্ষিক)',
      'প্রিমিয়াম ব্যাজ',
      'প্রথম পৃষ্ঠায় দেখানো হবে',
      'প্রায়োরিটি সাপোর্ট',
    ]),
    is_featured: 1,
    sort_order: 3,
    is_active: 1,
  },
  {
    name: 'প্রিমিয়াম প্লাস',
    name_bn: 'প্রিমিয়াম প্লাস',
    name_en: 'Premium Plus',
    price: 1999,
    duration_days: 60,
    visibility_level: 'premium_plus',
    max_applications: 500,
    max_jobs_per_year: 60,
    features: JSON.stringify([
      '৬০ দিন ভিজিবিলিটি',
      'সর্বোচ্চ ৫০০টি আবেদন',
      '৬০টি জব পোস্ট (বার্ষিক)',
      'প্রিমিয়াম প্লাস ব্যাজ',
      'শীর্ষ পৃষ্ঠায় দেখানো হবে',
      'ভিআইপি সাপোর্ট',
      'ব্র্যান্ডিং হাইলাইট',
    ]),
    is_featured: 0,
    sort_order: 4,
    is_active: 1,
  },
  {
    name: 'হট জব',
    name_bn: 'হট জব',
    name_en: 'Hot Job',
    price: 2999,
    duration_days: 30,
    visibility_level: 'hot',
    max_applications: null,
    max_jobs_per_year: null,
    features: JSON.stringify([
      '৩০ দিন স্পেশাল ভিজিবিলিটি',
      'আনলিমিটেড আবেদন',
      'আনলিমিটেড জব পোস্ট',
      '🔥 হট জব ব্যাজ',
      'হোম পেজে স্পেশাল স্পট',
      'পুশ নোটিফিকেশন সব প্রার্থীকে',
      'ডেডিকেটেড অ্যাকাউন্ট ম্যানেজার',
    ]),
    is_featured: 0,
    sort_order: 5,
    is_active: 1,
  },
];

async function seedPackages() {
  try {
    // Check if packages already exist
    const [existing] = await pool.query('SELECT COUNT(*) AS count FROM packages');
    if (existing[0].count > 0) {
      console.log(`✅ packages table already has ${existing[0].count} row(s) — skipping seed`);
      return;
    }

    for (const pkg of PACKAGES) {
      await pool.query(
        `INSERT INTO packages (name, price, duration_days, visibility_level, max_applications, max_jobs_per_year, features, is_featured, sort_order, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          pkg.name,
          pkg.price,
          pkg.duration_days,
          pkg.visibility_level,
          pkg.max_applications,
          pkg.max_jobs_per_year,
          pkg.features,
          pkg.is_featured,
          pkg.sort_order,
          pkg.is_active,
        ]
      );
    }

    console.log(`✅ ${PACKAGES.length} packages seeded successfully`);
  } catch (error) {
    console.error('❌ Failed to seed packages:', error);
  }
}

module.exports = seedPackages;

