import { nicheConfig } from "./niche-config.js";

export async function fetchOfficialProductContext() {
  if (!nicheConfig.officialSources.enabled) {
    return {
      sourceSite: nicheConfig.officialSources.sourceSite,
      fetchedAt: new Date().toISOString(),
      sources: [],
      cache: "disabled",
    };
  }

  return {
    sourceSite: nicheConfig.officialSources.sourceSite,
    fetchedAt: new Date().toISOString(),
    sources: [],
    cache: "not-implemented",
  };
}
