import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'poker' | 'brass';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-felt focus-visible:ring-offset-2 focus-visible:ring-offset-parchment-100 disabled:pointer-events-none disabled:opacity-50 select-none';

    const variants = {
      default:
        'bg-felt text-parchment-50 hover:bg-felt-dark shadow-sm border border-felt-dark/40 active:translate-y-[0.5px]',
      destructive:
        'bg-wine text-parchment-50 hover:bg-wine-dark shadow-sm border border-wine-dark active:translate-y-[0.5px]',
      outline:
        'border border-border bg-parchment-50 text-espresso hover:bg-parchment-200/80 shadow-xs active:translate-y-[0.5px]',
      secondary:
        'bg-parchment-200 text-espresso hover:bg-parchment-300 border border-parchment-300 shadow-xs active:translate-y-[0.5px]',
      ghost: 'text-espresso hover:bg-parchment-200/60',
      poker:
        'bg-felt text-parchment-50 hover:bg-felt-dark shadow-sm border border-felt-dark font-serif tracking-wide',
      brass:
        'bg-brass text-espresso font-serif font-semibold hover:bg-brass-dark/90 shadow-sm border border-brass-dark/30 active:translate-y-[0.5px]',
    };

    const sizes = {
      default: 'h-9 px-4 py-2',
      sm: 'h-8 rounded-md px-3 text-xs',
      lg: 'h-10 rounded-md px-5 text-base',
      icon: 'h-8 w-8',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
