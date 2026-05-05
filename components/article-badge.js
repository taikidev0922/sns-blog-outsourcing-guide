import { nicheConfig } from "../lib/niche-config";

export const categoryLabels = nicheConfig.categoryLabels;

const badgeClasses = {
  request: "badge-review",
  selfmade: "badge-howto",
  compare: "badge-compare",
  template: "badge-recommend",
  trouble: "badge-trouble",
  recommend: "badge-recommend",
};

export function ArticleBadge({ category }) {
  return (
    <span className={`category-badge ${badgeClasses[category] || "badge-neutral"}`}>
      {categoryLabels[category] || category || "記事"}
    </span>
  );
}
