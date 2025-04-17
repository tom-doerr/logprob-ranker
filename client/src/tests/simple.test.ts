/**
 * Simple Tests to verify test setup is working
 */

import { describe, it, expect } from 'vitest';

describe('Simple Tests', () => {
  it('should add two numbers correctly', () => {
    expect(1 + 1).toBe(2);
  });
  
  it('should concatenate strings correctly', () => {
    expect('hello ' + 'world').toBe('hello world');
  });
  
  it('should have a working mocked fetch', async () => {
    const response = await fetch('https://test-api.com/test');
    expect(response.ok).toBe(true);
  });
});