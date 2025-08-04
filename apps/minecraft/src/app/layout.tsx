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
  title: 'Minecraft World!',
  description: 'A Minecraft-themed Next.js app',
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
            title="Minecraft World!"
            titleHref="/"
            pages={[
              { name: 'Builds', href: '/builds' },
              { name: 'Servers', href: '/servers' },
              { name: 'Guides', href: '/guides' },
            ]}
          />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
