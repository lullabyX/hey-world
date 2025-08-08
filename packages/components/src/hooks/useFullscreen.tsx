'use client';

import { cn } from '@hey-world/lib';
import { Button } from '@hey-world/ui';
import { Maximize2, Minimize2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

const useFullscreen = ({
  sectionRef,
  className,
  defaultFullscreen = false,
}: {
  sectionRef: React.RefObject<HTMLElement | null>;
  className?: string;
  defaultFullscreen?: boolean;
}) => {
  const [isFullscreen, setIsFullscreen] = useState(defaultFullscreen);

  const handleFullscreen = useCallback(async () => {
    if (!sectionRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await sectionRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);
  const Fullscreen = () => (
    <div className={cn('absolute bottom-0 left-0 z-10 flex p-4', className)}>
      <Button
        variant="outline"
        size="icon"
        onClick={handleFullscreen}
        className="shrink-0"
        title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      >
        {isFullscreen ? (
          <Minimize2 className="h-4 w-4" />
        ) : (
          <Maximize2 className="h-4 w-4" />
        )}
      </Button>
    </div>
  );

  return { Fullscreen, isFullscreen };
};

export default useFullscreen;
