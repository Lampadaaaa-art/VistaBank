import type {Metadata} from 'next';
import { Inter, Manrope } from 'next/font/google';
import './globals.css'; // Global styles

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
});

export const metadata: Metadata = {
  title: 'Vista Gui - Souveraineté des Flux',
  description: 'Gestion de file d\'attente',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="fr" className={`${inter.variable} ${manrope.variable}`}>
      <body suppressHydrationWarning className="antialiased bg-surface text-on-surface min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
