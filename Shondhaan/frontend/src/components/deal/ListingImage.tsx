import { useMemo, useState } from "react";
import yessDealLogo from "@/assets/yess-deal-logo.png";

interface Props {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackSize?: "sm" | "md" | "lg";
  loading?: "lazy" | "eager";
  fit?: "cover" | "contain";
  /** Hide the Yess Deal logo watermark overlay. */
  noWatermark?: boolean;
  watermarkSize?: "sm" | "md" | "lg";
}

const DEAL_API_BASE_URL = (
  import.meta.env.VITE_DEAL_API_BASE_URL || "VITE_DEAL_API_BASE_URL"
).replace(/\/+$/, "");

const buildImageUrl = (src?: string | null) => {
  const value = String(src || "").trim();

  if (!value) return "";

  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:") ||
    value.startsWith("blob:")
  ) {
    return value;
  }

  return `${DEAL_API_BASE_URL}${value.startsWith("/") ? value : `/${value}`}`;
};

export default function ListingImage({
  src,
  alt,
  className = "w-full h-full",
  fallbackSize = "md",
  loading = "lazy",
  fit = "cover",
  noWatermark = false,
  watermarkSize = "md",
}: Props) {
  const [errored, setErrored] = useState(false);

  const imageUrl = useMemo(() => buildImageUrl(src), [src]);

  const showImg = Boolean(imageUrl) && !errored;

  const sizeClass =
    fallbackSize === "sm"
      ? "text-2xl"
      : fallbackSize === "lg"
        ? "text-4xl"
        : "text-3xl";

  const wmCls =
    watermarkSize === "sm"
      ? "h-3 md:h-3.5 bottom-1 right-1"
      : watermarkSize === "lg"
        ? "h-6 md:h-8 bottom-2 right-2"
        : "h-4 md:h-5 bottom-1.5 right-1.5";

  const Watermark = () =>
    noWatermark ? null : (
      <img
        src={yessDealLogo}
        alt=""
        aria-hidden="true"
        className={`pointer-events-none absolute ${wmCls} w-auto opacity-60 mix-blend-multiply drop-shadow-md z-10`}
      />
    );

  if (!showImg) {
    return (
      <div
        className={`${className} relative flex items-center justify-center bg-muted ${sizeClass}`}
      >
        📦
        <Watermark />
      </div>
    );
  }

  return (
    <span className={`${className} relative block overflow-hidden`}>
      <img
        src={imageUrl}
        alt={alt}
        loading={loading}
        decoding="async"
        onError={() => setErrored(true)}
        className={`w-full h-full ${
          fit === "cover" ? "object-cover" : "object-contain"
        }`}
      />

      <Watermark />
    </span>
  );
}