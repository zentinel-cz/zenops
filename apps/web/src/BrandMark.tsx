/** Shared local artwork for every role; surrounding text names the product. */
export function BrandMark({ className = "brand-mark", full = false }: { className?: string; full?: boolean }) {
  return <img className={className} src={full ? "/brand/zenops-logo-transparent.webp" : "/brand/zenops-symbol-192.png"}
    width={full ? 1010 : 192} height={full ? 250 : 192} alt="" aria-hidden="true" decoding="async" />;
}
