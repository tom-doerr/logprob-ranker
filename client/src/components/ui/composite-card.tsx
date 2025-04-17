/**
 * Composite card component
 * Combines multiple UI components into a single composable interface
 */

import React, { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { NervScanline, NervData, NervProgress, NervPattern, NervBlink } from '@/components/ui/nerv-animations';

/**
 * Header component for the composite card
 */
interface CompositeCardHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  variant?: 'primary' | 'secondary' | 'accent';
  className?: string;
}

export const CompositeCardHeader: React.FC<CompositeCardHeaderProps> = ({
  title,
  description,
  icon,
  actions,
  variant = 'primary',
  className = '',
}) => {
  // Color classes based on variant
  const colorClass = {
    primary: 'text-[var(--eva-orange)]',
    secondary: 'text-[var(--eva-blue)]',
    accent: 'text-[var(--eva-purple)]',
  }[variant];
  
  return (
    <CardHeader className={`flex flex-row items-center justify-between p-3 sm:p-6 border-b ${className}`} 
      style={{ borderColor: `var(--eva-${variant === 'primary' ? 'orange' : variant === 'secondary' ? 'blue' : 'purple'})` }}>
      <div className="flex items-center space-x-2">
        {icon && <span className={`${colorClass} nerv-pulse`}>{icon}</span>}
        <CardTitle className={`${colorClass} eva-title nerv-blink text-sm sm:text-base`}>{title}</CardTitle>
      </div>
      
      {description && (
        <CardDescription className="text-xs mt-1">{description}</CardDescription>
      )}
      
      {actions && (
        <div className="flex items-center space-x-2">
          {actions}
        </div>
      )}
    </CardHeader>
  );
};

/**
 * Content component for the composite card
 */
interface CompositeCardContentProps {
  children: ReactNode;
  variant?: 'default' | 'data' | 'grid' | 'pattern';
  className?: string;
}

export const CompositeCardContent: React.FC<CompositeCardContentProps> = ({
  children,
  variant = 'default',
  className = '',
}) => {
  // Get the appropriate wrapper component based on variant
  const Wrapper = {
    default: (props: any) => <div {...props}>{props.children}</div>,
    data: NervData,
    grid: NervPattern,
    pattern: NervPattern,
  }[variant];
  
  return (
    <CardContent className={`p-3 sm:p-6 ${className}`}>
      <Wrapper className="w-full">
        {children}
      </Wrapper>
    </CardContent>
  );
};

/**
 * Footer component for the composite card
 */
interface CompositeCardFooterProps {
  children: ReactNode;
  variant?: 'default' | 'loading' | 'success' | 'error';
  className?: string;
}

export const CompositeCardFooter: React.FC<CompositeCardFooterProps> = ({
  children,
  variant = 'default',
  className = '',
}) => {
  // Additional classes based on variant
  const variantClass = {
    default: '',
    loading: 'nerv-progress',
    success: 'border-t border-[var(--eva-green)]/30',
    error: 'border-t border-[var(--eva-red)]/30',
  }[variant];
  
  return (
    <CardFooter className={`p-3 sm:p-6 ${variantClass} ${className}`}>
      {children}
    </CardFooter>
  );
};

/**
 * Main composite card component
 */
interface CompositeCardProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'accent';
  className?: string;
}

export const CompositeCard: React.FC<CompositeCardProps> = ({
  children,
  variant = 'primary',
  className = '',
}) => {
  // Color classes based on variant
  const borderColorClass = {
    primary: 'border-[var(--eva-orange)]',
    secondary: 'border-[var(--eva-blue)]',
    accent: 'border-[var(--eva-purple)]',
  }[variant];
  
  return (
    <Card className={`relative w-full eva-card ${borderColorClass} nerv-scanline ${className}`}>
      {variant === 'primary' && (
        <div className="absolute top-0 right-0 w-4 h-4 bg-[var(--eva-orange)]/20 nerv-blink"></div>
      )}
      {variant === 'secondary' && (
        <div className="absolute top-0 right-0 w-4 h-4 bg-[var(--eva-blue)]/20 nerv-blink"></div>
      )}
      {variant === 'accent' && (
        <div className="absolute top-0 right-0 w-4 h-4 bg-[var(--eva-purple)]/20 nerv-blink"></div>
      )}
      
      {children}
    </Card>
  );
};

// Export all components together
export default {
  Card: CompositeCard,
  Header: CompositeCardHeader,
  Content: CompositeCardContent,
  Footer: CompositeCardFooter,
};