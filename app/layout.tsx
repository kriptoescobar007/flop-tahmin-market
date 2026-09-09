import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'KriptoEscobar | Flop Labs Technocore Tahmin Piyasası',
  description: 'Merkeziyetsiz Tahmin Protokolü',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className="dark">
      <body className={`${inter.className} bg-[#07090e] text-zinc-100 antialiased selection:bg-amber-400 selection:text-black`}>
        {children}
      </body>
    </html>
  );
}
