"use client";

import { useState } from "react";

export function XPostCarousel({ embeds = [] }) {
  const [index, setIndex] = useState(0);
  if (!embeds.length) return null;

  const current = embeds[index];
  const canMove = embeds.length > 1;

  function move(step) {
    setIndex((value) => (value + step + embeds.length) % embeds.length);
  }

  return (
    <div className="x-carousel" aria-label="X投稿カルーセル">
      <div className="x-carousel-frame">
        <XPostCard embed={current} />
      </div>

      {canMove ? (
        <div className="x-carousel-controls">
          <button type="button" onClick={() => move(-1)} aria-label="前のX投稿を見る">
            前へ
          </button>
          <span aria-live="polite">
            {index + 1} / {embeds.length}
          </span>
          <button type="button" onClick={() => move(1)} aria-label="次のX投稿を見る">
            次へ
          </button>
        </div>
      ) : null}
    </div>
  );
}

function XPostCard({ embed }) {
  return (
    <div className="x-embed-card">
      {embed.html ? (
        <div className="x-native-embed" dangerouslySetInnerHTML={{ __html: embed.html }} />
      ) : (
        <>
          <p className="x-post-text">{cleanXText(embed.text)}</p>
          <div className="x-post-meta">
            {embed.createdAt ? <time dateTime={embed.createdAt}>{formatDate(embed.createdAt)}</time> : <span>Xの投稿</span>}
            <span>{formatXMetrics(embed.publicMetrics)}</span>
          </div>
          <a className="x-post-link" href={embed.url} rel="noopener noreferrer" target="_blank">
            Xで元の投稿を見る
          </a>
        </>
      )}
    </div>
  );
}

function cleanXText(text = "") {
  return String(text)
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatXMetrics(metrics = {}) {
  const likes = Number(metrics.like_count || 0);
  const reposts = Number(metrics.retweet_count || 0);
  const replies = Number(metrics.reply_count || 0);
  return `いいね${likes}・リポスト${reposts}・返信${replies}`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric" }).format(new Date(value));
}
