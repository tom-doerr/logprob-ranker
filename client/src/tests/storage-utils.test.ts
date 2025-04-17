/**
 * Storage Utilities Integration Tests
 * Tests the storage utilities and their interaction with localStorage
 */

import { authStorage, modelConfigStorage, userPreferencesStorage } from '../utils/storage';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Storage Utilities Integration', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });
  
  afterEach(() => {
    localStorage.clear();
  });
  
  describe('Auth Storage', () => {
    it('should save and retrieve API key correctly', () => {
      const testApiKey = 'sk-or-v1-test-key-12345';
      
      // Save API key
      authStorage.setApiKey(testApiKey);
      
      // Retrieve API key
      const retrievedKey = authStorage.getApiKey();
      
      // Verify key was saved correctly
      expect(retrievedKey).toBe(testApiKey);
    });
    
    it('should handle null API key correctly', () => {
      // Save null key (clears the key)
      authStorage.setApiKey(null);
      
      // Retrieve API key
      const retrievedKey = authStorage.getApiKey();
      
      // Verify key is null
      expect(retrievedKey).toBeNull();
    });
    
    it('should save and retrieve auth method correctly', () => {
      // Save auth method
      authStorage.setAuthMethod('oauth');
      
      // Retrieve auth method
      const method = authStorage.getAuthMethod();
      
      // Verify method was saved correctly
      expect(method).toBe('oauth');
    });
    
    it('should save and retrieve code verifier correctly', () => {
      const verifier = 'test-code-verifier-12345';
      
      // Save code verifier
      authStorage.saveCodeVerifier(verifier);
      
      // Retrieve code verifier
      const retrievedVerifier = authStorage.getCodeVerifier();
      
      // Verify verifier was saved correctly
      expect(retrievedVerifier).toBe(verifier);
    });
    
    it('should clear auth data correctly', () => {
      // Set up auth data
      authStorage.setApiKey('test-key');
      authStorage.setAuthMethod('manual');
      authStorage.saveCodeVerifier('test-verifier');
      
      // Verify data is set
      expect(authStorage.getApiKey()).toBe('test-key');
      expect(authStorage.getAuthMethod()).toBe('manual');
      expect(authStorage.getCodeVerifier()).toBe('test-verifier');
      
      // Clear auth data
      authStorage.clearAuth();
      
      // Verify data is cleared
      expect(authStorage.getApiKey()).toBeNull();
      expect(authStorage.getAuthMethod()).toBeNull();
      expect(authStorage.getCodeVerifier()).toBeNull();
    });
    
    it('should handle authenticated state correctly', () => {
      // Initially not authenticated
      expect(authStorage.isAuthenticated()).toBe(false);
      
      // Set API key to be authenticated
      authStorage.setApiKey('test-key');
      
      // Should be authenticated now
      expect(authStorage.isAuthenticated()).toBe(true);
      
      // Clear auth
      authStorage.clearAuth();
      
      // Should be not authenticated again
      expect(authStorage.isAuthenticated()).toBe(false);
    });
  });
  
  describe('Model Config Storage', () => {
    it('should save and retrieve model configuration correctly', () => {
      // Initial config should have defaults
      const initialConfig = modelConfigStorage.getModelConfig();
      expect(initialConfig).toHaveProperty('temperature');
      expect(initialConfig).toHaveProperty('maxTokens');
      
      // Update config
      const updatedConfig = {
        temperature: 0.9,
        maxTokens: 2000,
        selectedModel: 'updated-model',
        isUsingBrowserModel: true
      };
      
      // Save updated config
      modelConfigStorage.saveModelConfig(updatedConfig);
      
      // Retrieve config
      const retrievedConfig = modelConfigStorage.getModelConfig();
      
      // Verify config was updated correctly
      expect(retrievedConfig.temperature).toBe(0.9);
      expect(retrievedConfig.maxTokens).toBe(2000);
      expect(retrievedConfig.selectedModel).toBe('updated-model');
      expect(retrievedConfig.isUsingBrowserModel).toBe(true);
    });
    
    it('should reset model config to defaults', () => {
      // Update config to non-default values
      modelConfigStorage.saveModelConfig({
        temperature: 0.9,
        maxTokens: 2000,
        selectedModel: 'custom-model'
      });
      
      // Reset config
      modelConfigStorage.resetModelConfig();
      
      // Retrieve config after reset
      const resetConfig = modelConfigStorage.getModelConfig();
      
      // Verify config was reset to defaults
      expect(resetConfig.temperature).toBe(0.7); // Default value
      expect(resetConfig.selectedModel).not.toBe('custom-model');
    });
    
    it('should merge partial updates with existing config', () => {
      // Initial config
      modelConfigStorage.saveModelConfig({
        temperature: 0.8,
        topP: 0.9,
        maxTokens: 1500,
        selectedModel: 'test-model'
      });
      
      // Partial update (only temperature)
      modelConfigStorage.saveModelConfig({
        temperature: 0.5
      });
      
      // Retrieve config
      const config = modelConfigStorage.getModelConfig();
      
      // Verify only temperature was updated
      expect(config.temperature).toBe(0.5);
      expect(config.topP).toBe(0.9); // Unchanged
      expect(config.maxTokens).toBe(1500); // Unchanged
      expect(config.selectedModel).toBe('test-model'); // Unchanged
    });
  });
  
  describe('User Preferences Storage', () => {
    it('should save and retrieve user preferences correctly', () => {
      // Initial preferences should have defaults
      const initialPrefs = userPreferencesStorage.getUserPreferences();
      expect(initialPrefs).toHaveProperty('theme');
      expect(initialPrefs).toHaveProperty('fontSize');
      
      // Update preferences
      const updatedPrefs = {
        theme: 'light',
        fontSize: 'large',
        codeStyle: 'github'
      };
      
      // Save updated preferences
      userPreferencesStorage.saveUserPreferences(updatedPrefs);
      
      // Retrieve preferences
      const retrievedPrefs = userPreferencesStorage.getUserPreferences();
      
      // Verify preferences were updated correctly
      expect(retrievedPrefs.theme).toBe('light');
      expect(retrievedPrefs.fontSize).toBe('large');
      expect(retrievedPrefs.codeStyle).toBe('github');
    });
    
    it('should merge partial updates with existing preferences', () => {
      // Initial preferences
      userPreferencesStorage.saveUserPreferences({
        theme: 'dark',
        fontSize: 'medium',
        showLineNumbers: true
      });
      
      // Partial update (only theme)
      userPreferencesStorage.saveUserPreferences({
        theme: 'light'
      });
      
      // Retrieve preferences
      const prefs = userPreferencesStorage.getUserPreferences();
      
      // Verify only theme was updated
      expect(prefs.theme).toBe('light');
      expect(prefs.fontSize).toBe('medium'); // Unchanged
      expect(prefs.showLineNumbers).toBe(true); // Unchanged
    });
  });
});