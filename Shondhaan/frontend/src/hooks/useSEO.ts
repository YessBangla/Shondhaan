import { useEffect } from "react";

export interface SEOOptions {
  /** Page title. Will be suffixed with " | Yess Service" unless `noSuffix` is true. */
  title: string;
  /** Meta description (≤ 160 chars recommended). */
  description?: string;
  /** Absolute or relative canonical URL. Defaults to current `window.location.href`. */
  canonical?: string;
  /** OG/Twitter image URL (absolute). Falls back to default brand image. */
  image?: string;
  /** og:type — default `website`. Use `article`, `product`, etc. as needed. */
  type?: string;
  /** Optional JSON-LD structured-data object. Stringified and injected. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  /** Skip the " | Yess Service" suffix when true. */
  noSuffix?: boolean;
  /** Optional extra keywords, comma-separated. */
  keywords?: string;
  /** When true, emits `noindex, follow` (use for auth/admin/private pages). */
  noindex?: boolean;
  /** Optional content locale, e.g. `bn_BD` or `en_US`. */
  locale?: string;
}

const DEFAULT_TITLE = "Yess Service";
const DEFAULT_IMAGE =
  "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/3c951804-9c1f-44a5-a8c3-25aa1dff6501/id-preview-869f71c4--5de51f7c-4b17-4251-9b65-d9b4c973ca39.lovable.app-1773223473678.png";
const SITE_URL = "https://yess-service.lovable.app";

/** Truncate to maxLen at a word boundary, appending an ellipsis when cut. */
function smartTruncate(text: string, maxLen: number): string {
  const t = (text || "").replace(/\s+/g, " ").trim();
  if (t.length <= maxLen) return t;
  const slice = t.slice(0, maxLen - 1);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > maxLen * 0.6 ? slice.slice(0, lastSpace) : slice;
  return cut.replace(/[.,;:—\-]+$/, "") + "…";
}

/** Make a relative or protocol-less URL absolute against SITE_URL. */
function toAbsoluteUrl(input: string | undefined): string {
  if (!input) return DEFAULT_IMAGE;
  if (/^https?:\/\//i.test(input)) return input;
  if (input.startsWith("//")) return `https:${input}`;
  return `${SITE_URL}${input.startsWith("/") ? "" : "/"}${input}`;
}

/** Upsert a `<meta name|property=...>` tag in <head>. */
function upsertMeta(attr: "name" | "property", key: string, content: string) {
  if (content === undefined || content === null || content === "") {
    const existing = document.head.querySelector<HTMLMetaElement>(
      `meta[${attr}="${key}"]`,
    );
    if (existing) existing.remove();
    return;
  }
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
  if (!href) return;
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/**
 * Dynamic SEO hook — sets title, description, canonical, Open Graph,
 * Twitter card, and optional JSON-LD structured data on the current page.
 * Cleans up by restoring the default title on unmount.
 */
export function useSEO(opts: SEOOptions) {
  const {
    title,
    description,
    canonical,
    image,
    type = "website",
    jsonLd,
    noSuffix = false,
    keywords,
    noindex = false,
    locale,
  } = opts;

  useEffect(() => {
    // Google typically displays ~60 chars of <title>. Keep base title ≤ 55
    // before optional suffix to leave room without mid-word truncation.
    const baseTitle = smartTruncate(title || DEFAULT_TITLE, 55);
    const fullTitle = noSuffix ? baseTitle : `${baseTitle} | Yess Service`;
    document.title = smartTruncate(fullTitle, 60);

    const url = canonical
      ? canonical.startsWith("http")
        ? canonical
        : `${SITE_URL}${canonical}`
      : typeof window !== "undefined"
        ? window.location.href
        : SITE_URL;
    // Strip query/hash from canonical to dedupe (Lighthouse: clean canonical).
    const cleanUrl = url.split("#")[0];
    const img = toAbsoluteUrl(image);
    // Google snippet ≈ 155–160 chars. Truncate at word boundary.
    const desc = smartTruncate(description || "", 158);

    if (desc) upsertMeta("name", "description", desc);
    if (keywords) upsertMeta("name", "keywords", keywords);
    upsertMeta(
      "name",
      "robots",
      noindex ? "noindex, follow" : "index, follow, max-image-preview:large",
    );
    upsertLink("canonical", cleanUrl);

    upsertMeta("property", "og:title", fullTitle);
    if (desc) upsertMeta("property", "og:description", desc);
    upsertMeta("property", "og:url", cleanUrl);
    upsertMeta("property", "og:type", type);
    upsertMeta("property", "og:image", img);
    upsertMeta("property", "og:image:alt", baseTitle);
    upsertMeta("property", "og:site_name", "Yess Service");
    upsertMeta("property", "og:locale", locale || "bn_BD");

    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", fullTitle);
    if (desc) upsertMeta("name", "twitter:description", desc);
    upsertMeta("name", "twitter:image", img);
    upsertMeta("name", "twitter:image:alt", baseTitle);

    // Keep <html lang> aligned with the page locale.
    if (locale) {
      const lang = locale.split("_")[0];
      if (document.documentElement.lang !== lang) {
        document.documentElement.lang = lang;
      }
    }

    // Inject JSON-LD into a managed script tag (per page).
    let script: HTMLScriptElement | null = document.head.querySelector(
      'script[data-seo-jsonld="page"]',
    );
    if (jsonLd) {
      if (!script) {
        script = document.createElement("script");
        script.type = "application/ld+json";
        script.setAttribute("data-seo-jsonld", "page");
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(jsonLd);
    } else if (script) {
      script.remove();
    }

    return () => {
      document.title = DEFAULT_TITLE;
      const s = document.head.querySelector('script[data-seo-jsonld="page"]');
      if (s) s.remove();
    };
  }, [title, description, canonical, image, type, jsonLd, noSuffix, keywords, noindex, locale]);
}

export default useSEO;