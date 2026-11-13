import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fit Calculator',
  description: 'Turn a few tape-measure readings into a bra size, sister sizes and style guidance.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
