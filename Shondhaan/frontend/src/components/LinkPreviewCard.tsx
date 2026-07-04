import { ExternalLink, Link2 } from "lucide-react";

interface Props {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  className?: string;
}

const LinkPreviewCard = ({ url, title, description, image, className = "" }: Props) => {
  let host = "";
  try { host = new URL(url).host.replace(/^www\./, ""); } catch { host = url; }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`block rounded-xl border bg-card hover:bg-accent/40 transition-colors overflow-hidden ${className}`}
    >
      {image && (
        <div className="aspect-[16/9] bg-muted overflow-hidden">
          <img src={image} alt={title ?? host} className="w-full h-full object-cover" loading="lazy" />
        </div>
      )}
      <div className="p-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
          <Link2 className="w-3 h-3" /> {host}
          <ExternalLink className="w-3 h-3 ml-auto" />
        </div>
        {title && <p className="text-sm font-semibold line-clamp-2">{title}</p>}
        {description && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{description}</p>}
      </div>
    </a>
  );
};

export default LinkPreviewCard;