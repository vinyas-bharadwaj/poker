import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'brass';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'bg-felt/10 text-felt border-felt/25',
    secondary: 'bg-parchment-200 text-espresso-muted border-border',
    destructive: 'bg-wine/10 text-wine border-wine/25',
    outline: 'border-border text-espresso-muted bg-parchment-50',
    success: 'bg-felt/10 text-felt border-felt/25',
    brass: 'bg-brass/15 text-brass-dark border-brass/30',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium tracking-wide transition-colors',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
