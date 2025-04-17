/**
 * PKCE (Proof Key for Code Exchange) utilities
 * 
 * These utilities support the OAuth2 PKCE flow for secure authentication
 * without exposing secrets in browser environments
 */

// Local storage keys
const API_KEY_STORAGE_KEY = 'apiKey';
const CODE_VERIFIER_STORAGE_KEY = 'codeVerifier';
const AUTH_METHOD_STORAGE_KEY = 'authMethod';

/**
 * Gets the stored API key
 */
export function getApiKey(): string | null {
  return localStorage.getItem(API_KEY_STORAGE_KEY);
}

/**
 * Saves the API key to local storage
 */
export function saveApiKey(key: string): void {
  localStorage.setItem(API_KEY_STORAGE_KEY, key);
}

/**
 * Clears the stored API key
 */
export function clearApiKey(): void {
  localStorage.removeItem(API_KEY_STORAGE_KEY);
}

/**
 * Checks if a valid API key exists in storage
 */
export function hasValidApiKey(): boolean {
  const key = getApiKey();
  return key !== null && key.length > 0;
}

/**
 * Gets the stored authentication method
 */
export function getAuthMethod(): 'oauth' | 'manual' | 'browser' | null {
  const method = localStorage.getItem(AUTH_METHOD_STORAGE_KEY);
  if (method === 'oauth' || method === 'manual' || method === 'browser') {
    return method;
  }
  return null;
}

/**
 * Saves the authentication method
 */
export function saveAuthMethod(method: 'oauth' | 'manual' | 'browser'): void {
  localStorage.setItem(AUTH_METHOD_STORAGE_KEY, method);
}

/**
 * Saves the OAuth code verifier
 */
export function saveCodeVerifier(verifier: string): void {
  localStorage.setItem(CODE_VERIFIER_STORAGE_KEY, verifier);
}

/**
 * Gets the OAuth code verifier
 */
export function getCodeVerifier(): string | null {
  return localStorage.getItem(CODE_VERIFIER_STORAGE_KEY);
}

/**
 * Clears the OAuth code verifier
 */
export function clearCodeVerifier(): void {
  localStorage.removeItem(CODE_VERIFIER_STORAGE_KEY);
}

/**
 * Generates a random string for code verifier
 * @param length The length of the random string
 * @returns A random string suitable for PKCE
 */
export function generateCodeVerifier(length: number = 64): string {
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  
  return Array.from(randomValues)
    .map(value => {
      // Use alphanumeric characters (0-9, A-Z, a-z)
      const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
      return chars.charAt(value % chars.length);
    })
    .join('');
}

/**
 * Creates a SHA-256 hash of the code verifier for use as code challenge
 * @param codeVerifier The original code verifier
 * @returns A base64-url encoded SHA-256 hash
 */
export async function createSHA256CodeChallenge(codeVerifier: string): Promise<string> {
  // Convert verifier to UTF-8
  const data = new TextEncoder().encode(codeVerifier);
  
  // Hash the verifier with SHA-256
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  // Convert hash to byte array
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  
  // Convert bytes to base64
  const base64Hash = btoa(String.fromCharCode(...hashArray));
  
  // Make base64 URL-safe by replacing chars and removing padding
  return base64Hash
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Parses OAuth response parameters from URL
 * @param url The URL containing OAuth response parameters
 * @returns The parsed parameters
 */
export function parseOAuthResponse(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const searchParams = new URLSearchParams(
    url.includes('#') ? url.split('#')[1] : url.split('?')[1]
  );
  
  // Handle entries in a way compatible with all TypeScript targets
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  
  return params;
}

/**
 * Creates a complete OAuth state with encoded return URL
 * @param returnUrl The URL to return to after authentication
 * @returns An encoded state string
 */
export function createOAuthState(returnUrl: string = window.location.href): string {
  const state = {
    returnUrl,
    timestamp: Date.now(),
  };
  
  return btoa(JSON.stringify(state));
}

/**
 * Decodes and validates an OAuth state
 * @param state The state string from OAuth response
 * @returns The decoded state or null if invalid
 */
export function validateOAuthState(state: string): { returnUrl: string } | null {
  try {
    const decodedState = JSON.parse(atob(state));
    
    // Validate timestamp (optional: check for expiration)
    const timestamp = decodedState.timestamp;
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour
    
    if (now - timestamp > maxAge) {
      return null; // Expired state
    }
    
    return { returnUrl: decodedState.returnUrl };
  } catch (error) {
    console.error('Error validating OAuth state:', error);
    return null;
  }
}