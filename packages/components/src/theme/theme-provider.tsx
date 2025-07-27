import {
  ThemeProvider as NextThemeProvider,
  type ThemeProviderProps,
} from 'next-themes';

const ThemeProvider = ({ children, ...props }: ThemeProviderProps) => {
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      value={{
        light: 'light',
        dark: 'dark',
      }}
      {...props}
    >
      {children}
    </NextThemeProvider>
  );
};

export default ThemeProvider;
