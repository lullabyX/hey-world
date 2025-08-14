'use client';

import { useRef } from 'react';

const useLog = (delayInMs = 500) => {
  const timeRef = useRef<number>(0);

  const log: (...args: Parameters<typeof console.log>) => void = (...args) => {
    const now = performance.now();
    if (now - timeRef.current >= delayInMs) {
      timeRef.current = now;
      console.log(...args);
    }
  };

  return log;
};

export default useLog;
