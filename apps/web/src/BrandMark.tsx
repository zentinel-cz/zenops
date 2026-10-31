/** Replace this shared mark with the supplied ZenOps logo in one place. */
export function BrandMark({ className = "brand-mark" }: { className?: string }) {
  return <span className={className} aria-hidden="true">Z</span>;
}
