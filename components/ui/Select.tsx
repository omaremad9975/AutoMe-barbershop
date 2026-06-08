import { cn } from '@/lib/utils';
import { SelectHTMLAttributes, forwardRef } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, children, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={cn(
            'w-full px-3 py-2.5 border rounded-xl text-sm bg-white transition focus:outline-none focus:ring-2 focus:ring-offset-0',
            error ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 focus:ring-blue-300',
            className
          )}
          {...props}
        >
          {children}
        </select>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
