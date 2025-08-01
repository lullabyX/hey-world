import type { Metadata } from 'next';
import '@hey-world/ui/src/globals.css';
import SiteHeader from '@hey-world/components/src/site-header';
import {
  ThemeScript,
  geistSans,
  geistMono,
  ThemeProvider,
} from '@hey-world/components';

export const metadata: Metadata = {
  title: 'Hey World!',
  description: 'Need to think about this',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col antialiased`}
      >
        <ThemeProvider>
          <SiteHeader
            title="Hey World!"
            titleHref="/"
            pages={[
              { name: 'Blog', href: isDev ? 'http://localhost:3000' : '/blog' },
              { name: 'About', href: '/about' },
              { name: 'Contact', href: '/contact' },
            ]}
          />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
