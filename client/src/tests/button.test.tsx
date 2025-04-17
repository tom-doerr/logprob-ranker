/**
 * Button Component Test
 * Basic test for UI components
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Simple Button component for testing
const Button = ({ 
  onClick,
  disabled = false,
  variant = 'primary',
  children
}) => {
  // Create className based on variant
  const className = `button button-${variant} ${disabled ? 'button-disabled' : ''}`;
  
  return (
    <button
      className={className}
      onClick={onClick}
      disabled={disabled}
      data-testid="test-button"
    >
      {children}
    </button>
  );
};

describe('Button Component', () => {
  it('should render with text content', () => {
    render(<Button onClick={() => {}}>Click Me</Button>);
    
    const button = screen.getByTestId('test-button');
    expect(button.textContent).toBe('Click Me');
  });
  
  it('should call onClick handler when clicked', () => {
    const handleClick = vi.fn();
    
    render(<Button onClick={handleClick}>Click Me</Button>);
    
    const button = screen.getByTestId('test-button');
    fireEvent.click(button);
    
    expect(handleClick).toHaveBeenCalled();
  });
  
  it('should be disabled when disabled prop is true', () => {
    render(<Button onClick={() => {}} disabled={true}>Disabled Button</Button>);
    
    const button = screen.getByTestId('test-button');
    expect(button.disabled).toBe(true);
  });
  
  it('should not call onClick when disabled', () => {
    const handleClick = vi.fn();
    
    render(<Button onClick={handleClick} disabled={true}>Disabled Button</Button>);
    
    const button = screen.getByTestId('test-button');
    fireEvent.click(button);
    
    expect(handleClick).not.toHaveBeenCalled();
  });
  
  it('should apply different variant classes', () => {
    const { rerender } = render(<Button onClick={() => {}} variant="primary">Primary</Button>);
    
    let button = screen.getByTestId('test-button');
    expect(button.className).toContain('button-primary');
    
    rerender(<Button onClick={() => {}} variant="secondary">Secondary</Button>);
    button = screen.getByTestId('test-button');
    expect(button.className).toContain('button-secondary');
    
    rerender(<Button onClick={() => {}} variant="danger">Danger</Button>);
    button = screen.getByTestId('test-button');
    expect(button.className).toContain('button-danger');
  });
  
  it('should have disabled class when disabled', () => {
    render(<Button onClick={() => {}} disabled={true}>Disabled Button</Button>);
    
    const button = screen.getByTestId('test-button');
    expect(button.className).toContain('button-disabled');
  });
});