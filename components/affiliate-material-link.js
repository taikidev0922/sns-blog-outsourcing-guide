import { AffiliateTrackingPixel } from "./affiliate-tracking-pixel";

export function AffiliateMaterialLink({ material, className, children }) {
  if (!material?.href) return null;

  return (
    <>
      <a className={className} href={material.href} rel={material.rel || "nofollow sponsored"}>
        {material.imageUrl ? (
          <img
            alt={material.label || material.linkText || ""}
            height={material.imageHeight}
            src={material.imageUrl}
            width={material.imageWidth}
          />
        ) : (
          children || material.linkText || material.label
        )}
      </a>
      <AffiliateTrackingPixel material={material} />
    </>
  );
}
