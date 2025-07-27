'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@hey-world/lib';
import { useTheme } from 'next-themes';
import ThemeSwitcher from './theme-switcher';

interface SiteHeaderProps extends React.HTMLAttributes<HTMLElement> {
  title: string;
}

const SiteHeader: React.FC<SiteHeaderProps> = ({
  title,
  className,
  ...props
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full transition-all duration-300',
        isScrolled
          ? 'h-12 rounded-b-lg bg-background/50 shadow-md backdrop-blur-md'
          : 'h-16 bg-transparent',
        className
      )}
      {...props}
    >
      <div className="container mx-auto flex h-full items-center justify-between">
        <div className="text-lg font-bold">{title}</div>
        <nav className="flex space-x-4">
          <a href="#" className="hover:underline">
            Home
          </a>
          <a href="#" className="hover:underline">
            About
          </a>
          <a href="#" className="hover:underline">
            Contact
          </a>
        </nav>
        <ThemeSwitcher />
      </div>
    </header>
  );
};

export default SiteHeader;
