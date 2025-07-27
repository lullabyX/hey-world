import Link from 'next/link';

import { Button } from '@hey-world/ui';

import { Home, Rocket } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex h-full flex-1 grow flex-col items-center justify-center bg-background p-4 text-center text-foreground">
      <h1 className="text-6xl font-bold text-primary">404</h1>
      <h2 className="mt-4 text-2xl font-semibold">
        Oops! Page Not Found <Rocket className="inline-block h-6 w-6" />
      </h2>
      <p className="mt-2 text-center text-muted-foreground">
        Looks like you&apos;ve wandered into uncharted territory. Don&apos;t
        worry, we&apos;ll get you back on track!
      </p>
      <Link href="/" className="mt-6">
        <Button variant="default">
          <Home className="h-4 w-4" /> Take Me Home
        </Button>
      </Link>
    </div>
  );
}
