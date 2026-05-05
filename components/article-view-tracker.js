"use client";

import { useEffect } from "react";

export function ArticleViewTracker({ slug }) {
  useEffect(() => {
    if (!slug) return;

    const storageKey = `article-viewed:${slug}`;
    if (window.sessionStorage.getItem(storageKey)) return;
    window.sessionStorage.setItem(storageKey, "1");

    const payload = JSON.stringify({ slug });
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/article-view", blob);
      return;
    }

    fetch("/api/article-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  }, [slug]);

  return null;
}
