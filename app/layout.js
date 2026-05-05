import "./globals.css";
import { siteConfig } from "../lib/site-config";
import { nicheConfig } from "../lib/niche-config";

export const metadata = {
  metadataBase: new URL(siteConfig.url),
  applicationName: siteConfig.name,
  title: {
    default: `${siteConfig.name} | ${siteConfig.metaTitle}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: `${siteConfig.name} | ${siteConfig.metaTitle}`,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} | ${siteConfig.metaTitle}`,
    description: siteConfig.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

const navItems = nicheConfig.navItems;

export default function RootLayout({ children }) {
  return (
    <html lang={siteConfig.language || "ja"}>
      <body>
        <header className="site-header">
          <a className="site-logo" href="/" aria-label={`${siteConfig.name} トップへ`}>
            <span>{siteConfig.name}</span>
            <small>{siteConfig.logoSubtitle}</small>
          </a>
          <nav className="global-nav" aria-label="グローバルナビゲーション">
            {navItems.map(([label, href]) => (
              <a href={href} key={href}>
                {label}
              </a>
            ))}
          </nav>
        </header>

        {children}

        <footer className="site-footer">
          <nav aria-label="フッターナビゲーション">
            <a href="/privacy">プライバシーポリシー</a>
            <a href="/affiliate-disclosure">アフィリエイト開示</a>
            <a href="/contact">お問い合わせ</a>
            <a href="/sitemap.xml">サイトマップ</a>
          </nav>
          <p>{nicheConfig.disclosure}</p>
        </footer>
      </body>
    </html>
  );
}
