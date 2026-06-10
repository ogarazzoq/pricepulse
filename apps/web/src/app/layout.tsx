import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import { Providers } from './providers';
import '@/styles/globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'PricePulse — Track prices across every marketplace',
    template: '%s · PricePulse',
  },
  description:
    'PricePulse is a multi-marketplace price comparison platform. Track price history, compare offers, and get alerts when products drop below your target.',
  metadataBase: new URL('https://pricepulse.io'),
  keywords: ['price comparison', 'price tracker', 'marketplace', 'price alerts'],
  openGraph: {
    type: 'website',
    title: 'PricePulse',
    description: 'Track prices across every marketplace.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="min-h-screen font-sans antialiased">
        <Providers>{children}</Providers>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
