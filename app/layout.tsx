import './globals.css';
import type { Metadata } from 'next';
import { Inter, Archivo } from 'next/font/google';
import { AuthProvider } from '@/components/auth-provider';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-archivo',
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://yoloxtreme.tech'),
  title: 'YOLOXTREME — The Preorder Factory',
  description:
    'You only live once. Launch the drop. Live the potential.',
  openGraph: {
    title: 'YOLOXTREME — The Preorder Factory',
    description: 'You only live once. Launch the drop. Live the potential.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'YOLOXTREME — The Preorder Factory',
    description: 'You only live once. Launch the drop. Live the potential.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${archivo.variable} font-sans antialiased`}>
        <AuthProvider>{children}</AuthProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
