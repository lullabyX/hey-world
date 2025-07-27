import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@hey-world/lib';

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-xs md:hover:bg-primary/90 active:bg-primary/90 md:active:bg-primary',
        destructive:
          'bg-destructive text-white shadow-xs md:hover:bg-destructive/90 active:bg-destructive/90 md:active:bg-destructive focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        outline:
          'border bg-background shadow-xs md:hover:bg-accent md:hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:md:hover:bg-input/50 active:bg-accent active:text-accent-foreground dark:active:bg-input/50 md:active:bg-background md:active:text-foreground dark:md:active:bg-input/30',
        secondary:
          'bg-secondary text-secondary-foreground shadow-xs md:hover:bg-secondary/80 active:bg-secondary/80 md:active:bg-secondary',
        ghost:
          'md:hover:bg-accent md:hover:text-accent-foreground dark:md:hover:bg-accent/50 active:bg-accent active:text-accent-foreground dark:active:bg-accent/50 md:active:bg-transparent md:active:text-inherit dark:md:active:bg-transparent',
        link: 'text-primary underline-offset-4 md:hover:underline text-base active:underline md:active:no-underline',
      },
      size: {
        default: 'md:h-10 h-9 px-4.5 py-2 has-[>svg]:px-3 md:has-[>svg]:px-3.5',
        sm: 'md:h-9 h-8 rounded-md gap-1.5 px-3.5 has-[>svg]:px-2.5 md:has-[>svg]:px-3',
        lg: 'md:h-11 h-10 rounded-md px-6.5 has-[>svg]:px-4 md:has-[>svg]:px-4.5',
        icon: 'md:size-10 size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
