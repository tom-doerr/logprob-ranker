/**
 * Generates a random string of specified length
 */
export function generateRandomString(length: number): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  
  for (let i = 0; i < length; i++) {
    result += charset[randomValues[i] % charset.length];
  }
  
  return result;
}

/**
 * Creates a SHA-256 hash of the input string and returns base64url encoded result
 */
export async function createSHA256CodeChallenge(input: string): Promise<string> {
  // Encode as UTF-8
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  
  // Hash using SHA-256
  const hash = await crypto.subtle.digest('SHA-256', data);
  
  // Convert to base64url encoding
  return base64UrlEncode(hash);
}

/**
 * Encodes an ArrayBuffer to base64url format
 */
export function base64UrlEncode(buffer: ArrayBuffer): string {
  // Convert ArrayBuffer to Base64 using browser-native btoa
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  
  // Make Base64 URL-safe
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Generates a code verifier for PKCE
 * Between 43-128 characters as per RFC 7636
 */
export function generateCodeVerifier(): string {
  return generateRandomString(96); // Using 96 characters
}

/**
 * Saves the code verifier to local storage
 */
export function saveCodeVerifier(codeVerifier: string): void {
  localStorage.setItem('pkce_code_verifier', codeVerifier);
}

/**
 * Retrieves the code verifier from local storage
 */
export function getCodeVerifier(): string | null {
  return localStorage.getItem('pkce_code_verifier');
}

/**
 * Removes the code verifier from local storage
 */
export function clearCodeVerifier(): void {
  localStorage.removeItem('pkce_code_verifier');
}

/**
 * Saves the API key to local storage
 */
export function saveApiKey(apiKey: string): void {
  localStorage.setItem('openrouter_api_key', apiKey);
}

/**
 * Retrieves the API key from local storage
 */
export function getApiKey(): string | null {
  return localStorage.getItem('openrouter_api_key');
}

/**
 * Removes the API key from local storage
 */
export function clearApiKey(): void {
  localStorage.removeItem('openrouter_api_key');
}
