export function AffiliateTrackingPixel({ material }) {
  if (!material?.impressionUrl) return null;

  return (
    <img
      alt=""
      height="1"
      src={material.impressionUrl}
      style={{ border: 0, height: 1, width: 1 }}
      width="1"
    />
  );
}
