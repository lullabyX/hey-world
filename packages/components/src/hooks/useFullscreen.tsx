'use client';

import { cn } from '@hey-world/lib';
import { Button } from '@hey-world/ui';
import { Maximize2, Minimize2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

type UseFullscreenOptionsByRef = {
  sectionRef: React.RefObject<HTMLElement | null>;
  defaultFullscreen?: boolean;
  id?: never;
};

type UseFullscreenOptionsById = {
  id: string;
  defaultFullscreen?: boolean;
  sectionRef?: never;
};

type UseFullscreenOptions =
  | UseFullscreenOptionsByRef
  | UseFullscreenOptionsById;

const useFullscreen = (options: UseFullscreenOptions) => {
  const { defaultFullscreen = false } = options;

  const hasRef = 'sectionRef' in options && options.sectionRef !== undefined;
  const hasId = 'id' in options && options.id !== undefined;

  if ((hasRef && hasId) || (!hasRef && !hasId)) {
    throw new Error(
      'useFullscreen: Provide either sectionRef or id, but not both.'
    );
  }

  const [isFullscreen, setIsFullscreen] = useState(defaultFullscreen);

  const getTargetElement = useCallback((): HTMLElement | null => {
    if (hasId) {
      return (
        document.getElementById((options as UseFullscreenOptionsById).id) ??
        null
      );
    }
    const ref = (options as UseFullscreenOptionsByRef).sectionRef;
    return ref?.current ?? null;
  }, [hasId, options]);

  const handleFullscreen = useCallback(async () => {
    const target = getTargetElement();
    if (!target) return;

    try {
      if (document.fullscreenElement === target) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } else {
        await target.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
    }
  }, [getTargetElement]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const target = getTargetElement();
      setIsFullscreen(document.fullscreenElement === target);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [getTargetElement]);
  const Fullscreen = ({
    className,
    ...restDivProps
  }: React.ComponentProps<'div'>) => (
    <div
      className={cn('absolute bottom-0 left-0 z-10 flex h-fit p-4', className)}
      {...restDivProps}
    >
      <Button
        variant="outline"
        size="icon"
        onClick={handleFullscreen}
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

  return { Fullscreen, isFullscreen, handleFullscreen };
};

export default useFullscreen;
