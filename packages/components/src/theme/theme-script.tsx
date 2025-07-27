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
  const scriptContent = `(function() {
    ${getDomain.toString()}
    ${getCookie.toString()}
    ${setCookie.toString()}
    const META_THEME_COLORS = ${JSON.stringify(META_THEME_COLORS)};

    try {
      // Step 1: Get stored theme from cookie
      const storedTheme = getCookie('theme');

      // Step 2: Check if we should follow system preferences
      // (no theme saved, or explicitly set to 'system')
      const shouldFollowSystem = !storedTheme || storedTheme === 'system';

      // Step 3: Detect system dark mode via media query
      const isSystemDark = window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches;

      // Step 4: Resolve the theme
      let resolvedTheme;
      if (shouldFollowSystem) {
        resolvedTheme = isSystemDark ? 'dark' : 'light';
      } else {
        resolvedTheme = storedTheme;
      }

      // Step 5: Sync to localStorage and cookie
      localStorage.theme = resolvedTheme;
      setCookie('theme', resolvedTheme, {
        days: 365,
        domain: getDomain(),
      });

      // Step 6: Decide if dark mode is active
      const isDarkMode = resolvedTheme === 'dark';

      // Step 7: Set document class
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      // Step 8: Update meta tag
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
