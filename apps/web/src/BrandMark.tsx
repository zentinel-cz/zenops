/** Shared local artwork for every role; surrounding text names the product. */
export function BrandMark({ className = "brand-mark", full = false }: { className?: string; full?: boolean }) {
  return <img className={className} src={full ? "/brand/zenops-logo.webp" : "/brand/zenops-icon-192.png"}
    width={full ? 775 : 192} height={full ? 980 : 192} alt="" aria-hidden="true" decoding="async" />;
}
