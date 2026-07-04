import yessDealLogo from "@/assets/yess-deal-logo.png";

/**
 * Floating Yess Deal logo overlay shown on every listing image
 * as a subtle watermark / shadow.
 * Place inside any element with `position: relative`.
 */
const DealWatermark = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const cls =
    size === "sm"
      ? "h-4 md:h-5 bottom-1 right-1"
      : size === "lg"
        ? "h-9 md:h-12 bottom-2 right-2"
        : "h-6 md:h-8 bottom-1.5 right-1.5";
  return (
    <img
      src={yessDealLogo}
      alt=""
      aria-hidden="true"
      className={`pointer-events-none absolute ${cls} w-auto opacity-60 mix-blend-multiply drop-shadow-md`}
    />
  );
};

export default DealWatermark;