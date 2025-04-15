import { apiRequest } from './queryClient';
import { getApiKey } from '../utils/pkce';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Exchanges the authorization code for an API key
 */
export async function exchangeCodeForToken(
  code: string,
  codeVerifier: string,
  codeMethod: string = 'S256'
): Promise<{ key: string }> {
  const response = await apiRequest('POST', '/api/exchange-code', {
    code,
    codeVerifier,
    codeMethod
  });
  
  return response.json();
}

/**
 * Makes a chat completion request to OpenRouter
 */
export async function createChatCompletion(
  request: ChatCompletionRequest
): Promise<ChatCompletionResponse> {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error('API key not found. Please authenticate first.');
  }
  
  const response = await apiRequest('POST', '/api/chat', {
    apiKey,
    ...request
  });
  
  return response.json();
}

/**
 * Generates the authorization URL with PKCE parameters
 */
export function generateAuthUrl(codeChallenge: string, callbackUrl: string): string {
  // Use callback_url as specified in OpenRouter's documentation
  const params = new URLSearchParams({
    callback_url: callbackUrl,  // OpenRouter uses callback_url, not redirect_uri
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
    // Remove scope as it's not mentioned in documentation
  });
  
  // Full URL with parameters
  const authUrl = `https://openrouter.ai/auth?${params.toString()}`;
  
  // Log the URL for debugging
  console.log('Generated OAuth URL:', authUrl);
  
  return authUrl;
}
