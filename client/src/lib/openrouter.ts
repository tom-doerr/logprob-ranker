/**
 * OpenRouter API utilities
 * Provides consistent URL generation and configurations
 */

import { createOAuthState } from '../utils/pkce';

// OpenRouter OAuth endpoints
const OPENROUTER_URLS = {
  BASE: 'https://openrouter.ai',
  OAUTH: 'https://openrouter.ai/oauth',
  API: 'https://openrouter.ai/api',
  MODELS: 'https://openrouter.ai/api/v1/models',
};

// OAuth configuration
const OAUTH_CONFIG = {
  clientId: 'nerv-interface', // Application client ID
  scope: 'openid profile email', // OAuth scopes
  responseType: 'code', // Authorization code flow
};

/**
 * Generates an OAuth URL for authentication
 * 
 * @param codeChallenge - The PKCE code challenge
 * @param redirectUri - Where to redirect after authentication
 * @returns A complete OAuth URL
 */
export function generateAuthUrl(
  codeChallenge: string,
  redirectUri: string = `${window.location.origin}/callback`
): string {
  // Create state with return URL
  const state = createOAuthState(window.location.href);
  
  // Construct URL parameters
  const params = new URLSearchParams({
    client_id: OAUTH_CONFIG.clientId,
    redirect_uri: redirectUri,
    response_type: OAUTH_CONFIG.responseType,
    scope: OAUTH_CONFIG.scope,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  
  // Return full OAuth URL
  return `${OPENROUTER_URLS.OAUTH}?${params.toString()}`;
}

/**
 * Gets the models API endpoint URL
 */
export function getModelsUrl(): string {
  return OPENROUTER_URLS.MODELS;
}

/**
 * Gets the chat completions endpoint URL
 */
export function getChatCompletionsUrl(): string {
  return `${OPENROUTER_URLS.API}/v1/chat/completions`;
}

/**
 * Gets the auth validation endpoint URL
 */
export function getAuthValidationUrl(): string {
  return `${OPENROUTER_URLS.API}/v1/auth/validate`;
}

/**
 * Gets the OAuth token endpoint URL
 */
export function getTokenUrl(): string {
  return `${OPENROUTER_URLS.API}/auth/token`;
}