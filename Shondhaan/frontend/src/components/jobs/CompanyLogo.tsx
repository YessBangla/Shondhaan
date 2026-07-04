import { useState } from "react";
import { Building2 } from "lucide-react";

interface Props {
  src?: string | null;
  alt: string;
  /** Tailwind size classes for the wrapper (e.g. "w-14 h-14") */
  sizeClass?: string;
  /** Padding when image is shown */
  padClass?: string;
  /** Icon size when fallback shows */
  iconClass?: string;
  /** Extra wrapper classes (e.g. featured gradients) */
  fallbackBgClass?: string;
  imageBgClass?: string;
  rounded?: string;
}

/**
 * Company logo with graceful fallback to a Building2 icon when the image
 * fails to load (e.g. discontinued Clearbit URLs).
 */
export default function CompanyLogo({
  src,
  alt,
  sizeClass = "w-14 h-14",
  padClass = "p-1.5",
  iconClass = "h-6 w-6 text-blue-600",
  fallbackBgClass = "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20",
  imageBgClass = "bg-white",
  rounded = "rounded-xl",
}: Props) {
  const [errored, setErrored] = useState(false);
  const showImg = src && !errored;

  return (
    <div
      className={`${sizeClass} ${rounded} flex items-center justify-center shrink-0 border shadow-sm overflow-hidden ${
        showImg ? `${imageBgClass} ${padClass}` : fallbackBgClass
      }`}
    >
      {showImg ? (
        <img
          src={src!}
          alt={alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setErrored(true)}
          className="w-full h-full object-contain"
        />
      ) : (
        <Building2 className={iconClass} />
      )}
    </div>
  );
}