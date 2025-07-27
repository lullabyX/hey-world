'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@hey-world/lib';
import ThemeSwitcher from './theme-switcher';
import Link from 'next/link';

interface SiteHeaderProps extends React.HTMLAttributes<HTMLElement> {
  title: string;
  titleHref: string;
  pages: {
    name: string;
    href: string;
  }[];
}

const SiteHeader: React.FC<SiteHeaderProps> = ({
  title,
  titleHref,
  pages,
  className,
  ...props
}) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    setIsScrolled(window.scrollY > 10);

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 flex w-full items-center justify-center bg-transparent transition-all duration-300 ease-in-out',
        isScrolled ? 'top-2 py-2' : 'py-4',
        className
      )}
      {...props}
    >
      <div
        className={cn(
          'flex h-16 items-center justify-between bg-background/80 px-6 transition-all duration-300 ease-in-out',
          isScrolled
            ? 'border-slate w-3/4 max-w-7xl rounded-full border shadow-sm'
            : 'w-full max-w-full rounded-none border border-transparent'
        )}
      >
        <Link
          href={titleHref}
          className="text-lg font-bold"
          onClick={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          {title}
        </Link>
        <nav className="flex space-x-4">
          {pages?.map((page) => (
            <Link
              href={page.href}
              className="hover:underline"
              key={page.name}
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              {page.name}
            </Link>
          ))}
        </nav>
        <ThemeSwitcher />
      </div>
    </header>
  );
};

export default SiteHeader;
