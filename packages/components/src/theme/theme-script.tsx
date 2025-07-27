import { Geist, Geist_Mono } from 'next/font/google';

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
  const themeScriptFunction = () => {
    try {
      // Step 1: Check for explicit 'dark' preference in localStorage
      const isExplicitDark = localStorage.theme === 'dark';

      // Step 2: Check if we should follow system preferences
      // (no theme saved, or explicitly set to 'system')
      const shouldFollowSystem =
        !('theme' in localStorage) || localStorage.theme === 'system';

      // Step 3: Detect system dark mode via media query
      const isSystemDark = window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches;

      // Step 4: Decide if dark mode is active
      // (explicit dark OR (follow system AND system is dark))
      const isDarkMode = isExplicitDark || (shouldFollowSystem && isSystemDark);

      if (shouldFollowSystem) {
        localStorage.theme = isSystemDark ? 'dark' : 'light';
      }

      // Step 5: If dark mode, update the meta tag's content
      if (isDarkMode) {
        const metaTag = document.querySelector('meta[name="theme-color"]');
        if (metaTag) {
          metaTag.setAttribute('content', META_THEME_COLORS.dark);
        }
      } else {
        const metaTag = document.querySelector('meta[name="theme-color"]');
        if (metaTag) {
          metaTag.setAttribute('content', META_THEME_COLORS.light);
        }
      }
    } catch (error) {
      console.error('Theme meta update failed:', error);
    }
  };

  return (
    <>
      <meta name="theme-color" content={META_THEME_COLORS.light} />
      <script
        dangerouslySetInnerHTML={{ __html: `(${themeScriptFunction})()` }}
      />
    </>
  );
};

export default ThemeScript;
