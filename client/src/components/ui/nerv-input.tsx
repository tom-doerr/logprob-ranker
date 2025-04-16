import React, { forwardRef, ComponentPropsWithoutRef } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Props for the NervInput component
 */
interface NervInputProps extends ComponentPropsWithoutRef<'input'> {
  label?: string;
  theme?: 'orange' | 'blue' | 'green' | 'red';
  error?: string;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

/**
 * Styled input component following the NERV design system
 * Combines Label, Input, and error handling in a single component
 */
export const NervInput = forwardRef<HTMLInputElement, NervInputProps>(
  ({ 
    label, 
    theme = 'orange', 
    error, 
    fullWidth = false, 
    icon, 
    className,
    ...props 
  }, ref) => {
    // Theme-based styling
    const themeColors = {
      orange: 'var(--eva-orange)',
      blue: 'var(--eva-blue)',
      green: 'var(--eva-green)',
      red: 'var(--eva-red)'
    };
    
    const color = themeColors[theme];
    
    return (
      <div className={cn('space-y-2', fullWidth ? 'w-full' : '')}>
        {label && (
          <Label 
            className={`font-mono text-[${color}] text-sm`}
            htmlFor={props.id}
          >
            {label}
          </Label>
        )}
        
        <div className="relative">
          {icon && (
            <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-[var(--eva-text)] opacity-70">
              {icon}
            </div>
          )}
          
          <Input
            ref={ref}
            className={cn(
              `bg-black/50 border-[${color}]/40 text-[var(--eva-text)]`,
              icon ? 'pl-8' : '',
              error ? `border-[var(--eva-red)]` : '',
              className
            )}
            {...props}
          />
        </div>
        
        {error && (
          <p className="text-xs text-[var(--eva-red)] font-mono mt-1">
            {error}
          </p>
        )}
      </div>
    );
  }
);

NervInput.displayName = 'NervInput';

/**
 * Password input variant with show/hide toggle
 */
export const NervPasswordInput = forwardRef<HTMLInputElement, NervInputProps>(
  (props, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    
    return (
      <NervInput
        ref={ref}
        type={showPassword ? 'text' : 'password'}
        {...props}
        className={cn(props.className, 'pr-10')}
      />
    );
  }
);

NervPasswordInput.displayName = 'NervPasswordInput';