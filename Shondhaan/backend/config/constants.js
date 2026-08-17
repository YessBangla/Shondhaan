export const passwordPolicyMessage =
  "Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.";

export const ROLES = [
  "super_admin",
  "admin",
  "mart_admin",
  "job_admin",
  "service_admin",
  "mart_admin", // ✅ Added
  "deal_admin", // ✅ Added
  "job_admin",  // ✅ Added
  "moderator",
  "supervisor",
  "finance",
  "call_center",
  "provider",
  "mart_vendor",
  "mart_delivery",
  "mart_cs",
  "yessdeal_seller",
  "representative",
  "employer",
  "user",
];

export const ALLOWED_ROLES = new Set(ROLES);

export const ROLE_LABELS = {
  super_admin: "Super Admin",
  admin: "Admin",
  mart_admin: "Mart Admin",
  job_admin: "Job Admin",
  service_admin: "Service Admin",
  mart_admin: "Mart Admin", // ✅ Added
  deal_admin: "Deal Admin", // ✅ Added
  job_admin: "Job Admin",   // ✅ Added
  moderator: "Moderator",
  supervisor: "Supervisor",
  finance: "Finance",
  call_center: "Call Center",
  provider: "Provider",
  mart_vendor: "Mart Vendor",
  mart_delivery: "Mart Delivery",
  mart_cs: "Mart Customer Service",
  yessdeal_seller: "YessDeal Seller",
  representative: "Representative",
  employer: "Employer",
  user: "User",
};

export const ADMIN_ACCESS_BY_ROLE = {
  super_admin: ["*"],
  admin: ["*"],
  
  // Service Admin Permissions
  service_admin: [
    "/admin/service",
    "/admin/smart-dashboard",
    "/admin/analytics",
    "/admin/bookings",
    "/admin/requests",
    "/admin/services",
    "/admin/service-images",
    "/admin/categories",
    "/admin/offers",
    "/admin/banners",
    "/admin/sections",
    "/admin/contacts",
    "/admin/chat-history",
    "/admin/notifications",
    "/admin/notification-rules",
    "/admin/reviews",
    "/admin/settings",
  ],
  
  // ✅ Mart Admin Permissions
  mart_admin: [
    "/admin/mart-management",
    "/admin/mart-overview",
  ],
  
  // ✅ Deal Admin Permissions
  deal_admin: [
    "/admin/deal-overview",
    "/admin/deal-categories",
    "/admin/settings",
  ],
  
  // ✅ Job Admin Permissions
  job_admin: [
    "/admin/job-listings",
    "/admin/employers",
    "/admin/jobs",
  ],

  call_center: [
    "/admin/bookings",
    "/admin/requests",
    "/admin/contacts",
    "/admin/chat-history",
  ],
};

export const ADMIN_PANEL_ROLES = new Set(Object.keys(ADMIN_ACCESS_BY_ROLE));

export const ADMIN_USER_MANAGEMENT_ROLES = new Set(["super_admin", "admin", "call_center"]);

export const getRoleAccess = (role) => ADMIN_ACCESS_BY_ROLE[role] || [];

export const getRoleConfigs = () =>
  ROLES.map((key) => ({
    key,
    label: ROLE_LABELS[key] || key,
    adminAccess: getRoleAccess(key),
  }));

export const CMS_TABLES = {
  cms_categories: {
    orderBy: "sort_order",
    jsonColumns: new Set(),
    booleanColumns: new Set(["is_active"]),
    columns: [
      "id",
      "name",
      "name_en",
      "icon_url",
      "color_gradient",
      "color_overlay",
      "color_chip_bg",
      "color_chip_text",
      "color_accent",
      "sort_order",
      "is_active",
    ],
  },

  cms_services: {
    orderBy: "sort_order",
    jsonColumns: new Set(["features", "available_cities"]),
    booleanColumns: new Set(["is_active"]),
    columns: [
      "id",
      "slug",
      "title",
      "title_en",
      "image_url",
      "description",
      "rating",
      "total_reviews",
      "total_orders",
      "features",
      "available_cities",
      "category_id",
      "commission_percent",
      "is_active",
      "sort_order",
    ],
  },
  cms_service_packages: {
    orderBy: "sort_order",
    jsonColumns: new Set(["features"]),
    booleanColumns: new Set(),
    columns: [
      "id",
      "service_id",
      "name",
      "price",
      "original_price",
      "features",
      "sort_order",
    ],
  },

  cms_special_offers: {
    orderBy: "sort_order",
    jsonColumns: new Set(),
    booleanColumns: new Set(["is_active"]),
    columns: [
      "id",
      "title_bn",
      "title_en",
      "discount_bn",
      "discount_en",
      "description_bn",
      "description_en",
      "service_slug",
      "badge",
      "gradient",
      "border_color",
      "accent_color",
      "bg_accent",
      "is_active",
      "expires_at",
      "sort_order",
    ],
  },

  cms_hero_banners: {
    orderBy: "sort_order",
    jsonColumns: new Set(),
    booleanColumns: new Set(["is_active"]),
    columns: [
      "id",
      "title_bn",
      "title_en",
      "subtitle_bn",
      "subtitle_en",
      "image_url",
      "is_active",
      "sort_order",
    ],
  },

  cms_homepage_sections: {
    orderBy: "sort_order",
    jsonColumns: new Set(["service_slugs"]),
    booleanColumns: new Set(["is_active"]),
    columns: [
      "id",
      "section_key",
      "title_bn",
      "title_en",
      "service_slugs",
      "sort_order",
      "is_active",
    ],
  },
};
