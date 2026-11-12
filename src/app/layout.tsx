import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'FreshBasket Admin',
    template: '%s · FreshBasket Admin',
  },
  description:
    'Admin dashboard for FreshBasket grocery store. Orders, customers, catalog, coupons and engagement in one place.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#0f2c1d',
};

/**
 * Applies the remembered sidebar state before first paint so the shell never
 * jumps between expanded and icon-only on load.
 */
const SIDEBAR_BOOT = `try{if(localStorage.getItem('fb-admin:sidebar')==='collapsed')document.documentElement.dataset.sidebar='collapsed'}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SIDEBAR_BOOT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700;9..144,800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
