import { useState, useRef, useEffect, ImgHTMLAttributes, memo } from "react";
import { cn } from "@/lib/utils";

interface OptimizedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  /** Adds a tiny blurred placeholder while loading */
  blurPlaceholder?: boolean;
  /** Wrapper className */
  wrapperClassName?: string;
}

/**
 * Optimized image component with:
 * - Native lazy loading
 * - Intersection Observer for deferred src assignment
 * - Blur-up fade-in effect
 * - decode="async" for non-blocking rendering
 */
const OptimizedImage = memo(({
  src,
  alt,
  className,
  wrapperClassName,
  blurPlaceholder = true,
  loading = "lazy",
  ...props
}: OptimizedImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!imgRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={imgRef}
      className={cn(
        "overflow-hidden",
        blurPlaceholder && !isLoaded && "bg-muted animate-pulse",
        wrapperClassName
      )}
    >
      {isInView && (
        <img
          src={src}
          alt={alt}
          loading={loading}
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          className={cn(
            "transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0",
            className
          )}
          {...props}
        />
      )}
    </div>
  );
});

OptimizedImage.displayName = "OptimizedImage";

export default OptimizedImage;
