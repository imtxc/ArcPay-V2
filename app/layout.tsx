import './globals.css';
import '@rainbow-me/rainbowkit/styles.css';
import { Providers } from './providers';
import { Inter } from 'next/font/google';
import type { Metadata } from 'next'; // Type add kiya

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = { // Type yahan apply kiya
  title: 'ArcPay V2 | Premium Web3 Payments',
  description: 'Built for Arc Network Testnet',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}