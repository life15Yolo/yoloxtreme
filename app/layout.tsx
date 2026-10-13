import './globals.css';
import type { Metadata } from 'next';
import { Inter, Archivo } from 'next/font/google';
import { AuthProvider } from '@/components/auth-provider';

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
  title: 'YOLOXTREME — The Preorder Factory',
  description:
    '100+ designers. No inventory risk. Preorder, produce, ship. The multi-designer preorder platform.',
  openGraph: {
    title: 'YOLOXTREME — The Preorder Factory',
    description: '100+ designers. No inventory risk. Preorder → Produce → Ship.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'YOLOXTREME — The Preorder Factory',
    description: '100+ designers. No inventory risk. Preorder → Produce → Ship.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${archivo.variable} font-sans antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
