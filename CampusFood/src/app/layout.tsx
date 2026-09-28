import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import '@/index.css';

export const metadata: Metadata = {
  title: 'CampusFood Frontend App',
  openGraph: {
    images: ['https://bolt.new/static/og_default.png'],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['https://bolt.new/static/og_default.png'],
  },
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({
  children,
}: RootLayoutProps) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}