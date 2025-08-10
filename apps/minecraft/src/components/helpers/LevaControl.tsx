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
      className={cn(
        'pointer-events-none absolute left-2 top-2 z-50',
        className
      )}
      style={{ isolation: 'isolate', ...style }}
      {...restDivProps}
    >
      <div className="pointer-events-auto relative">
        <Leva
          collapsed={false}
          oneLineLabels={false}
          hideCopyButton
          {...levaProps}
        />
      </div>
    </div>
  );
};

export default LevaControl;
