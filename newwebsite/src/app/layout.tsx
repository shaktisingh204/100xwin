import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ClientLayout from '@/components/layout/ClientLayout';
import Script from 'next/script';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Zeero - Premium Sports Betting & Casino',
  description: 'Experience the thrill of victory with Zeero.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

/** Fetch tracker/analytics config from the backend at server-render time.
 *  The result is cached per request (ISR-safe). */
async function getTrackerConfig(): Promise<Record<string, string>> {
  try {
    const apiUrl = process.env.API_URL || 'https://zeero.bet/api';
    const res = await fetch(`${apiUrl}/settings/public`, {
      next: { revalidate: 60 }, // re-fetch at most once per minute
    });
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cfg = await getTrackerConfig();

  const ga4Id = cfg.GA4_MEASUREMENT_ID?.trim();
  const metaPixelId = cfg.META_PIXEL_ID?.trim();
  const tiktokPixelId = cfg.TIKTOK_PIXEL_ID?.trim();
  const headScripts = cfg.CUSTOM_HEAD_SCRIPTS?.trim();
  const bodyScripts = cfg.CUSTOM_BODY_SCRIPTS?.trim();

  return (
    <html lang="en">
      <head>
        {/* ── Google Analytics 4 ───────────────────────────────── */}
        {ga4Id && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                                window.dataLayer = window.dataLayer || [];
                                function gtag(){dataLayer.push(arguments);}
                                gtag('js', new Date());
                                gtag('config', '${ga4Id}');
                            `}
            </Script>
          </>
        )}

        {/* ── Meta (Facebook) Pixel ────────────────────────────── */}
        {metaPixelId && (
          <Script id="meta-pixel" strategy="afterInteractive">
            {`
                            !function(f,b,e,v,n,t,s)
                            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                            n.queue=[];t=b.createElement(e);t.async=!0;
                            t.src=v;s=b.getElementsByTagName(e)[0];
                            s.parentNode.insertBefore(t,s)}(window, document,'script',
                            'https://connect.facebook.net/en_US/fbevents.js');
                            fbq('init', '${metaPixelId}');
                            fbq('track', 'PageView');
                        `}
          </Script>
        )}

        {/* ── TikTok Pixel ─────────────────────────────────────── */}
        {tiktokPixelId && (
          <Script id="tiktok-pixel" strategy="afterInteractive">
            {`
                            !function (w, d, t) {
                            w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];
                            ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];
                            ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
                            for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
                            ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};
                            ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";
                            ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;
                            ttq._o=ttq._o||{};ttq._o[e]=n||{};
                            var o=document.createElement("script");o.type="text/javascript";o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;
                            var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
                            ttq.load('${tiktokPixelId}');ttq.page();}(window, document, 'ttq');
                        `}
          </Script>
        )}

        {/* ── Custom <head> scripts (verbatim) ─────────────────── */}
        {headScripts && (
          <div
            // biome-ignore lint/security/noDangerouslySetInnerHtml: admin-controlled only
            dangerouslySetInnerHTML={{ __html: headScripts }}
            suppressHydrationWarning
          />
        )}
      </head>
      <body className={inter.className}>
        {/* ── Custom <body> scripts (verbatim, e.g. noscript pixel fallbacks) */}
        {bodyScripts && (
          <div
            // biome-ignore lint/security/noDangerouslySetInnerHtml: admin-controlled only
            dangerouslySetInnerHTML={{ __html: bodyScripts }}
            suppressHydrationWarning
          />
        )}
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
