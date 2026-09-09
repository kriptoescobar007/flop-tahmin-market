import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Flop Tahmin Piyasası | Türkiye',
  description: 'Technocore altyapısıyla çalışan merkeziyetsiz tahmin platformu',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}