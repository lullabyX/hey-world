'use client';

import { useCallback, useRef } from 'react';

const useLog = (delayInMs = 500) => {
  const timeRef = useRef<number>(0);

  const log: (...args: Parameters<typeof console.log>) => void = useCallback(
    (...args) => {
      const now = performance.now();
      if (now - timeRef.current >= delayInMs) {
        timeRef.current = now;
        console.log(...args);
      }
    },
    [delayInMs]
  );

  return log;
};

export default useLog;
