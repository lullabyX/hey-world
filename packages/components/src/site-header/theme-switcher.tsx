import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';

const ThemeSwitcher = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const sharedClass =
    'rounded-md p-2 hover:bg-accent flex items-center justify-center';
  const iconClass = 'h-5 w-5';

  if (!mounted) {
    return (
      <div className={sharedClass}>
        <div className={iconClass} />
      </div>
    );
  }

  return (
    <button
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      className={sharedClass}
    >
      {theme === 'light' && <Sun className={iconClass} />}
      {theme === 'dark' && <Moon className={iconClass} />}
    </button>
  );
};

export default ThemeSwitcher;
