import { useState } from "react";
import yessDealLogo from "@/assets/yess-deal-logo.png";

interface Props {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackSize?: "sm" | "md" | "lg";
  loading?: "lazy" | "eager";
  fit?: "cover" | "contain";
  /** Hide the Yess Deal logo watermark overlay (default: shown). */
  noWatermark?: boolean;
  watermarkSize?: "sm" | "md" | "lg";
}

/**
 * Listing image with graceful fallback to a package emoji when the image
 * is missing or fails to load.
 */
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
  const showImg = src && !errored;
  const sizeClass =
    fallbackSize === "sm" ? "text-2xl" : fallbackSize === "lg" ? "text-4xl" : "text-3xl";

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
      <div className={`${className} relative flex items-center justify-center bg-muted ${sizeClass}`}>
        📦
        <Watermark />
      </div>
    );
  }
  return (
    <span className={`${className} relative block`}>
      <img
        src={src!}
        alt={alt}
        loading={loading}
        decoding="async"
        onError={() => setErrored(true)}
        className={`w-full h-full ${fit === "cover" ? "object-cover" : "object-contain"}`}
      />
      <Watermark />
    </span>
  );
}