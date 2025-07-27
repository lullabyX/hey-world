import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';

const ThemeSwitcher = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleToggle = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    document.documentElement.classList.add('theme-switching');
    setTheme(newTheme);
    setTimeout(() => {
      document.documentElement.classList.remove('theme-switching');
    }, 300);
  };

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
    <button onClick={handleToggle} className={sharedClass}>
      {theme === 'light' && <Sun className={iconClass} />}
      {theme === 'dark' && <Moon className={iconClass} />}
    </button>
  );
};

export default ThemeSwitcher;
