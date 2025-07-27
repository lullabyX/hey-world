'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@hey-world/lib';
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

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsScrolled(window.scrollY > 10);
      }, 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 flex w-full items-center justify-center transition-all duration-300 ease-in-out',
        isScrolled ? 'top-2 py-2' : 'bg-transparent py-4',
        className
      )}
      {...props}
    >
      <div
        className={cn(
          'flex h-16 items-center justify-between bg-background/80 px-6 backdrop-blur-md transition-all duration-300 ease-in-out',
          isScrolled
            ? 'border-slate w-3/4 rounded-full border shadow-sm'
            : 'w-full rounded-none'
        )}
      >
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
