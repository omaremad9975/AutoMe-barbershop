import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'brand' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'brand', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed',
          size === 'sm' && 'px-3 py-1.5 text-sm',
          size === 'md' && 'px-4 py-2.5 text-sm',
          size === 'lg' && 'px-6 py-3 text-base',
          variant === 'brand' && 'bg-brand text-white hover:opacity-90',
          variant === 'outline' && 'border border-gray-300 text-gray-700 hover:bg-gray-50',
          variant === 'ghost' && 'text-gray-600 hover:bg-gray-100',
          variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700',
          className
        )}
        style={variant === 'brand' ? { backgroundColor: 'var(--brand-color)' } : undefined}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
