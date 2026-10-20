import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-md border border-border bg-parchment-50 px-3 py-1.5 text-sm text-espresso placeholder:text-espresso-light/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-felt focus-visible:border-felt disabled:cursor-not-allowed disabled:opacity-50 transition-colors shadow-2xs',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
