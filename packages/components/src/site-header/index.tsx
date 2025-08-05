'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@hey-world/lib';
import ThemeSwitcher from '../theme/theme-switcher';
import Link from 'next/link';
import { Button } from '@hey-world/ui';
import { usePathname } from 'next/navigation';
import { Github, Menu, X } from 'lucide-react';

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsScrolled(window.scrollY > 1);

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 1);
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) {
        setIsMenuOpen(false);
      }
    });
    return () => {
      window.removeEventListener('resize', () => {});
    };
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 flex w-full items-center justify-center bg-transparent transition-all duration-300 ease-in-out',
        isScrolled && !isMenuOpen ? 'top-2 py-2' : 'py-4',
        className
      )}
      {...props}
    >
      <div
        className={cn(
          'relative flex h-12 items-center justify-between bg-background/20 px-4 backdrop-blur-lg transition-all duration-300 ease-in-out md:h-16 md:px-6',
          isScrolled && !isMenuOpen
            ? 'w-80 max-w-7xl rounded-full border border-black/5 shadow-lg dark:border-white/20 sm:w-3/4'
            : 'w-full max-w-full rounded-none'
        )}
      >
        <Button
          asChild
          variant="link"
          className="text-base font-bold hover:no-underline md:text-lg"
        >
          <Link
            href={titleHref}
            onClick={() => {
              if (titleHref === pathname) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
          >
            {title}
          </Link>
        </Button>
        <nav className="hidden space-x-4 md:flex">
          {pages?.map((page) => (
            <Button key={page.name} asChild variant="link">
              <Link
                href={page.href}
                onClick={() => {
                  if (page.href === pathname) {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
              >
                {page.name}
              </Link>
            </Button>
          ))}
        </nav>
        <div className="flex items-center">
          <Button variant="ghost" size="icon" asChild>
            <Link
              href="https://github.com/lullabyX/hey-world"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="h-5 w-5" />
              <span className="sr-only">GitHub</span>
            </Link>
          </Button>
          <ThemeSwitcher />
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMenuOpen((prev) => !prev)}
          >
            {isMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
            <span className="sr-only">Toggle menu</span>
          </Button>
        </div>
        {isMenuOpen && (
          <div className="fixed inset-x-0 top-16 z-50 h-[calc(100vh-3rem)] overflow-y-auto bg-background p-4 shadow-md md:hidden">
            <nav className="flex flex-col space-y-2">
              {pages?.map((page) => (
                <Button
                  key={page.name}
                  variant="link"
                  className="w-min justify-start rounded-md"
                  asChild
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Link
                    href={page.href}
                    onClick={() => {
                      if (page.href === pathname) {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }}
                  >
                    {page.name}
                  </Link>
                </Button>
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default SiteHeader;
