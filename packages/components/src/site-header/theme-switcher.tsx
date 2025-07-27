import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@hey-world/ui';

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
    }, 1);
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
    <Button onClick={handleToggle} variant="ghost" size="icon">
      {theme === 'light' && <Sun className={iconClass} />}
      {theme === 'dark' && <Moon className={iconClass} />}
      <span className="sr-only">Toggle Theme</span>
    </Button>
  );
};

export default ThemeSwitcher;
