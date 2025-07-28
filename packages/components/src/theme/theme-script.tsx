import { Geist, Geist_Mono } from 'next/font/google';
import { getCookie, setCookie, getDomain } from '@hey-world/lib';

type NextFont = {
  className: string;
  variable?: string;
  style: { fontFamily: string };
};

export const geistSans: NextFont = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const geistMono: NextFont = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// Define colors outside (adjust to your theme; e.g., from COLORS object)
export const META_THEME_COLORS = {
  light: '#ffffff', // Default light background
  dark: '#121212', // Dark background
};

const ThemeScript = () => {
  const domainFn = getDomain.toString();
  const cookieFn = getCookie.toString();
  const setFn = setCookie.toString();
  const scriptContent = `(function() {
    const getDomain = ${domainFn};
    const getCookie = ${cookieFn};
    const setCookie = ${setFn};
    const META_THEME_COLORS = ${JSON.stringify(META_THEME_COLORS)};
    try {
      const storedTheme = getCookie('theme');
      const shouldFollowSystem = !storedTheme || storedTheme === 'system';
      const isSystemDark = window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches;
      let resolvedTheme;
      if (shouldFollowSystem) {
        resolvedTheme = isSystemDark ? 'dark' : 'light';
      } else {
        resolvedTheme = storedTheme;
      }
      localStorage.theme = resolvedTheme;
      setCookie('theme', resolvedTheme, {
        days: 365,
        domain: getDomain(),
      });
      const isDarkMode = resolvedTheme === 'dark';
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      const metaTag = document.querySelector('meta[name="theme-color"]');
      if (metaTag) {
        metaTag.setAttribute(
          'content',
          isDarkMode ? META_THEME_COLORS.dark : META_THEME_COLORS.light
        );
      }
    } catch (error) {
      console.error('Theme meta update failed:', error);
    }
  })();`;
  return (
    <>
      <meta name="theme-color" content={META_THEME_COLORS.light} />
      <script dangerouslySetInnerHTML={{ __html: scriptContent }} />
    </>
  );
};
export default ThemeScript;
