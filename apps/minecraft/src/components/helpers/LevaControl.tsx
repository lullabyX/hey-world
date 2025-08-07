import { cn } from '@lib/src';
import { Leva } from 'leva';
import { LevaRootProps } from 'leva/dist/declarations/src/components/Leva/LevaRoot';
import React from 'react';

interface LevaControlProps {
  divProps?: React.HTMLAttributes<HTMLDivElement>;
  levaProps?: LevaRootProps;
}

const LevaControl = ({ divProps, levaProps }: LevaControlProps) => {
  const { className, style, ...restDivProps } = divProps || {};

  return (
    <div
      className={cn('absolute right-0 top-0 z-10 p-4', className)}
      style={{ isolation: 'isolate', ...style }}
      {...restDivProps}
    >
      <Leva
        collapsed={false}
        oneLineLabels={false}
        fill
        hideCopyButton
        {...levaProps}
      />
    </div>
  );
};

export default LevaControl;
