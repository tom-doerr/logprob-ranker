/**
 * Utility Function Tests
 * Tests for basic utility functions in the application
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock simple localStorage utility
const createStorageUtil = (initialData = {}) => {
  let data = { ...initialData };
  
  const getItem = (key) => {
    return data[key] || null;
  };
  
  const setItem = (key, value) => {
    data[key] = value;
    return true;
  };
  
  const removeItem = (key) => {
    delete data[key];
    return true;
  };
  
  const clear = () => {
    data = {};
    return true;
  };
  
  return {
    getItem,
    setItem,
    removeItem,
    clear,
    _data: () => data // For testing
  };
};

// Simple authentication function
const isValidApiKey = (key) => {
  if (!key) return false;
  
  // Simple OpenRouter API key format check
  if (key.startsWith('sk-or-')) return true;
  
  // JWT format check (simplified)
  if (key.includes('.') && key.split('.').length === 3) return true;
  
  return false;
};

describe('Storage Utility', () => {
  let storage;
  
  beforeEach(() => {
    storage = createStorageUtil();
  });
  
  it('should store and retrieve values', () => {
    storage.setItem('testKey', 'testValue');
    expect(storage.getItem('testKey')).toBe('testValue');
  });
  
  it('should return null for non-existent keys', () => {
    expect(storage.getItem('nonExistentKey')).toBeNull();
  });
  
  it('should remove items', () => {
    storage.setItem('testKey', 'testValue');
    storage.removeItem('testKey');
    expect(storage.getItem('testKey')).toBeNull();
  });
  
  it('should clear all items', () => {
    storage.setItem('key1', 'value1');
    storage.setItem('key2', 'value2');
    
    storage.clear();
    
    expect(storage.getItem('key1')).toBeNull();
    expect(storage.getItem('key2')).toBeNull();
    expect(storage._data()).toEqual({});
  });
});

describe('API Key Validation', () => {
  it('should validate OpenRouter API keys', () => {
    expect(isValidApiKey('sk-or-v1-abcdef1234567890')).toBe(true);
    expect(isValidApiKey('sk-or-test-key')).toBe(true);
  });
  
  it('should validate JWT tokens', () => {
    expect(isValidApiKey('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U')).toBe(true);
  });
  
  it('should reject invalid API keys', () => {
    expect(isValidApiKey('')).toBe(false);
    expect(isValidApiKey(null)).toBe(false);
    expect(isValidApiKey(undefined)).toBe(false);
    expect(isValidApiKey('invalid-key')).toBe(false);
  });
});

// Simple data transformation function
const formatResponseData = (data) => {
  if (!data) return { success: false, message: 'No data provided' };
  
  if (Array.isArray(data)) {
    return {
      success: true,
      count: data.length,
      items: data.map(item => ({
        id: item.id,
        name: item.name,
        type: item.type || 'unknown'
      }))
    };
  }
  
  return {
    success: true,
    item: {
      id: data.id,
      name: data.name,
      type: data.type || 'unknown'
    }
  };
};

describe('Data Transformation', () => {
  it('should handle null/undefined data', () => {
    expect(formatResponseData(null)).toEqual({
      success: false,
      message: 'No data provided'
    });
    
    expect(formatResponseData(undefined)).toEqual({
      success: false,
      message: 'No data provided'
    });
  });
  
  it('should format single item data', () => {
    const input = { id: '123', name: 'Test Item', type: 'test' };
    const expected = {
      success: true,
      item: { id: '123', name: 'Test Item', type: 'test' }
    };
    
    expect(formatResponseData(input)).toEqual(expected);
  });
  
  it('should format array data', () => {
    const input = [
      { id: '1', name: 'Item 1', type: 'type1' },
      { id: '2', name: 'Item 2' }
    ];
    
    const expected = {
      success: true,
      count: 2,
      items: [
        { id: '1', name: 'Item 1', type: 'type1' },
        { id: '2', name: 'Item 2', type: 'unknown' }
      ]
    };
    
    expect(formatResponseData(input)).toEqual(expected);
  });
  
  it('should provide default type when missing', () => {
    const input = { id: '123', name: 'Test Item' };
    const expected = {
      success: true,
      item: { id: '123', name: 'Test Item', type: 'unknown' }
    };
    
    expect(formatResponseData(input)).toEqual(expected);
  });
});