import { useState, useId, type ReactNode } from 'react';

export interface TooltipProps {
  text: string;
  children?: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
}

const positionClasses: Record<NonNullable<TooltipProps['position']>, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

const arrowClasses: Record<NonNullable<TooltipProps['position']>, string> = {
  top: 'top-full left-1/2 -translate-x-1/2 border-t-zinc-900 border-x-transparent border-b-transparent',
  bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-zinc-900 border-x-transparent border-t-transparent',
  left: 'left-full top-1/2 -translate-y-1/2 border-l-zinc-900 border-y-transparent border-r-transparent',
  right: 'right-full top-1/2 -translate-y-1/2 border-r-zinc-900 border-y-transparent border-l-transparent',
};

const originClasses: Record<NonNullable<TooltipProps['position']>, string> = {
  top: 'origin-bottom',
  bottom: 'origin-top',
  left: 'origin-right',
  right: 'origin-left',
};

const sizeClasses: Record<NonNullable<TooltipProps['size']>, string> = {
  sm: 'h-5 w-5 text-xs',
  md: 'h-7 w-7 text-sm',
  lg: 'h-9 w-9 text-base',
};

export function Tooltip({ text, children, position = 'top', size = 'md' }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const tooltipId = useId();

  const trigger = children ?? (
    <span
      className={
        sizeClasses[size] +
        ' inline-flex items-center justify-center rounded-full' +
        ' bg-gradient-to-br from-zinc-100 to-zinc-200' +
        ' font-serif font-semibold italic text-zinc-500' +
        ' ring-1 ring-zinc-300/60' +
        ' cursor-help select-none' +
        ' transition-all duration-200' +
        ' hover:from-blue-50 hover:to-blue-100 hover:text-blue-600 hover:ring-blue-300/60 hover:shadow-sm' +
        ' focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2'
      }
      tabIndex={0}
      role="button"
    >
      i
    </span>
  );

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
      aria-describedby={visible ? tooltipId : undefined}
    >
      {trigger}

      <span
        role="tooltip"
        id={tooltipId}
        className={
          'pointer-events-none absolute z-50 whitespace-nowrap rounded-lg' +
          ' bg-zinc-900 px-3 py-1.5 text-sm font-medium text-zinc-50' +
          ' shadow-xl shadow-zinc-900/20' +
          ' transition-all duration-150 ease-out ' +
          originClasses[position] + ' ' +
          (visible
            ? 'opacity-100 scale-100'
            : 'opacity-0 scale-95') +
          ' ' + positionClasses[position]
        }
      >
        {text}
        <span
          className={'absolute border-[5px] ' + arrowClasses[position]}
          aria-hidden
        />
      </span>
    </span>
  );
}
