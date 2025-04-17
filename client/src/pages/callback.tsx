import { FC, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { getCodeVerifier, saveApiKey, clearCodeVerifier, saveAuthMethod } from '../utils/pkce';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const Callback: FC = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [authCode, setAuthCode] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Get the code from URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        
        console.log("OAuth Callback Debug:");
        console.log("- URL:", window.location.href);
        console.log("- Search params:", window.location.search);
        console.log("- Authorization code present:", !!code);
        
        if (!code) {
          setError('No authorization code found in the URL. The OpenRouter OAuth flow may have failed or been cancelled.');
          setIsLoading(false);
          return;
        }

        // Store the code for display if needed
        setAuthCode(code);
        
        // Get the code verifier from storage
        const codeVerifier = getCodeVerifier();
        
        if (!codeVerifier) {
          setError('No code verifier found in browser storage. This could happen if you started the OAuth flow in a different browser tab or cleared your storage.');
          setIsLoading(false);
          return;
        }
        
        // Exchange code for token
        let response;
        try {
          // Log the exchange request details
          console.log("Exchanging code for token with:", {
            code: code,
            code_verifier: codeVerifier,
            code_challenge_method: 'S256'
          });
          
          response = await fetch('/api/exchange-code', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              code: code,
              code_verifier: codeVerifier,
              code_challenge_method: 'S256' // Note: using underscores in parameter names as per OpenRouter docs
            })
          });
        } catch (fetchError) {
          throw new Error('Network error while contacting authorization server');
        }
        
        // Handle non-OK responses
        if (!response.ok) {
          let errorMessage: string;
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || `Error ${response.status}`;
          } catch (jsonError) {
            // If response is not JSON
            errorMessage = `Error ${response.status}: ${await response.text().catch(() => 'Unknown error')}`;
          }
          throw new Error(errorMessage);
        }
        
        // Parse response data
        let data;
        let responseText;
        try {
          // Clone the response so we can both read the text and still parse as JSON
          responseText = await response.clone().text();
          console.log("Raw response from server:", responseText);
          
          // Display the raw response for debugging
          const rawResponsePreview = responseText.substring(0, 1000) + (responseText.length > 1000 ? '...' : '');
          
          try {
            data = await response.json();
          } catch (jsonError) {
            console.error("JSON parse error:", jsonError);
            console.error("Raw response that failed to parse:", responseText);
            
            // Create a more detailed error with both the error and the raw response
            const jsonErrorMsg = jsonError instanceof Error ? jsonError.message : String(jsonError);
            
            // If we see a pattern that looks like an API key in the response, try to extract it
            const possibleApiKey = responseText.match(/sk-or-v1-[a-zA-Z0-9]{32,}/);
            if (possibleApiKey && possibleApiKey[0]) {
              // Create a synthetic response with the key we found
              console.log("Found potential API key in response, attempting to use it");
              data = { key: possibleApiKey[0] };
            } else {
              throw new Error(`Invalid JSON response from server: ${jsonErrorMsg}\n\nRaw response:\n${rawResponsePreview}`);
            }
          }
        } catch (parseError) {
          console.error("Error accessing response:", parseError);
          // If we have a raw response, include it in the error
          if (responseText) {
            throw new Error(`Invalid JSON response from server.\n\nRaw response:\n${responseText.substring(0, 1000)}`);
          } else {
            throw new Error('Invalid JSON response from server');
          }
        }
        
        if (!data || !data.key) {
          throw new Error('No API key returned from server');
        }
        
        // Display debug info if available
        if (data.debug_info) {
          console.log("OAuth Exchange Debug Info:", data.debug_info);
          toast({
            title: 'Using Simulation Mode',
            description: 'Using demo API key due to OAuth issues',
          });
        }
        
        // Store the token and update application state
        saveApiKey(data.key);
        saveAuthMethod('oauth');
        clearCodeVerifier();
        
        // Notify other components about the API key change
        // Use a more comprehensive custom event with the auth data
        const authEvent = new CustomEvent('auth-state-change', { 
          detail: { 
            apiKey: data.key,
            method: 'oauth',
            source: 'callback' 
          } 
        });
        window.dispatchEvent(authEvent);
        
        // Also dispatch the standard event for backward compatibility
        window.dispatchEvent(new Event('api-key-changed'));
        
        setSuccess(true);
        
        toast({
          title: 'NERV AUTHENTICATION COMPLETE',
          description: 'OpenRouter synchronization successful',
        });
        
        // Redirect back to main page after a delay with proper path handling
        setTimeout(() => {
          // For Replit or other hosting where the app may be in a subfolder
          const isReplit = window.location.origin.includes('.replit.dev') || window.location.origin.includes('.replit.app');
          let basePath = '/';
          
          if (isReplit) {
            // Get the base path by analyzing the current URL
            const pathname = window.location.pathname;
            const parts = pathname.split('/');
            // Remove 'callback' from the end of the path
            parts.pop();
            basePath = parts.join('/') || '/';
            if (!basePath.startsWith('/')) basePath = '/' + basePath;
            if (!basePath.endsWith('/')) basePath += '/';
          }
          
          console.log("Redirecting to:", basePath);
          setLocation(basePath);
        }, 3000);
      } catch (err) {
        console.error('Authentication error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    processCallback();
  }, [setLocation, toast]);

  return (
    <div className="min-h-screen bg-[var(--eva-black)] flex items-center justify-center p-4 relative">
      {/* Eva Interface Decorations */}
      <div className="absolute top-0 left-0 w-full h-4 bg-[var(--eva-orange)] opacity-30 z-10"></div>
      <div className="absolute top-4 left-0 w-full opacity-75 text-center text-[var(--eva-orange)] font-mono text-sm tracking-widest z-10">
        NERV AUTHENTICATION PROTOCOL
      </div>
      
      {/* Corner Decorations */}
      <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-[var(--eva-orange)] opacity-60"></div>
      <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-[var(--eva-orange)] opacity-60"></div>
      <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-[var(--eva-orange)] opacity-60"></div>
      <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-[var(--eva-orange)] opacity-60"></div>
      
      {/* NERV Logo Watermark */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[var(--eva-orange)] opacity-5 text-9xl font-bold z-0">
        NERV
      </div>
      
      <Card className="w-full max-w-md border-2 border-[var(--eva-orange)] bg-black/40 z-10 relative">
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[var(--eva-orange)]"></div>
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[var(--eva-orange)]"></div>
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[var(--eva-orange)]"></div>
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[var(--eva-orange)]"></div>
        
        <CardHeader className="border-b border-[var(--eva-orange)]/30">
          <CardTitle className="text-xl font-mono text-[var(--eva-orange)] uppercase tracking-wider">
            {isLoading 
              ? 'SYNCHRONIZING WITH OPENROUTER' 
              : success 
                ? 'NERV AUTHENTICATION COMPLETE' 
                : 'AUTHENTICATION PROTOCOL ERROR'}
          </CardTitle>
        </CardHeader>
        <CardContent className="py-6">
          {isLoading && (
            <div className="flex flex-col items-center py-4">
              <div className="w-16 h-16 relative">
                <div className="absolute inset-0 border-t-2 border-r-2 border-[var(--eva-orange)] rounded-full animate-spin"></div>
                <div className="absolute inset-2 border-b-2 border-l-2 border-[var(--eva-blue)] rounded-full animate-spin animation-delay-500"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3 h-3 bg-[var(--eva-orange)]"></div>
                </div>
              </div>
              <p className="mt-4 text-[var(--eva-green)] font-mono text-sm">
                PROCESSING AUTHENTICATION CODE
              </p>
              <div className="mt-2 font-mono text-xs text-[var(--eva-blue)] tracking-wider flex items-center">
                <span className="animate-pulse">●</span>
                <span className="ml-2">MAGI SYSTEM PROCESSING</span>
              </div>
            </div>
          )}
          
          {error && (
            <div className="py-2 space-y-4">
              <div className="font-mono text-[var(--eva-red)] border border-[var(--eva-red)]/50 bg-[var(--eva-red)]/10 p-3 rounded-md space-y-3">
                <div>
                  <p className="text-sm uppercase tracking-wider mb-2">ERROR DETECTED:</p>
                  <p className="text-xs break-words whitespace-pre-wrap">{error}</p>
                </div>
                
                <div className="pt-3 border-t border-[var(--eva-red)]/30">
                  <details className="text-xs" open>
                    <summary className="cursor-pointer hover:text-[var(--eva-orange)] transition-colors mb-2">
                      SHOW TECHNICAL DETAILS
                    </summary>
                    <div className="p-2 bg-black/50 rounded border border-[var(--eva-red)]/20 overflow-auto max-h-96">
                      <div className="text-[var(--eva-text)]">
                        <p>
                          The OpenRouter OAuth flow encountered an error when attempting to exchange the authorization code. 
                          This could happen for various reasons:
                        </p>
                        <div className="my-2">
                          <span className="text-[var(--eva-yellow)]">1. Parameter mismatch in the authorization request</span>
                          <br />
                          <span className="text-[var(--eva-yellow)]">2. Code expiration (codes are typically valid for a short time)</span>
                          <br />
                          <span className="text-[var(--eva-yellow)]">3. Network errors or service disruptions</span>
                        </div>
                        
                        <div className="mb-2">
                          <span className="text-[var(--eva-green)]">You can try clicking SYNCHRONIZE WITH OPENROUTER again, or use direct API key input instead.</span>
                        </div>
                        
                        <div className="mt-3 border-t border-[var(--eva-blue)]/30 pt-2">
                          <div className="text-[var(--eva-blue)] mb-1">FULL ERROR DETAILS:</div>
                          <div className="p-2 bg-black/70 rounded text-[var(--eva-yellow)] overflow-auto max-h-40 text-[10px] font-mono whitespace-pre-wrap">
                            {error}
                          </div>
                        </div>
                        
                        <div className="mt-3 pt-2 border-t border-[var(--eva-orange)]/30">
                          <div className="text-[var(--eva-orange)] mb-1">TROUBLESHOOTING OPTIONS:</div>
                          <ol className="list-decimal pl-5 mb-2 text-[var(--eva-text)]">
                            <li>Try using direct API key input instead of OAuth</li>
                            <li>Make sure you have a valid OpenRouter account</li>
                            <li>Check if your API tokens have been revoked</li>
                            <li>Try a different browser or clear your cookies</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  </details>
                </div>
              </div>
              
              {authCode && (
                <div className="mt-4 border border-[var(--eva-orange)]/50 bg-black/50 rounded-md p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-mono text-[var(--eva-orange)] flex items-center">
                      <span className="w-3 h-3 bg-[var(--eva-orange)] mr-2"></span>
                      AUTHENTICATION CODE CAPTURED:
                    </p>
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(authCode || '');
                        toast({
                          title: "CODE COPIED",
                          description: "Authentication code transferred to clipboard",
                        });
                      }}
                      className="text-xs text-[var(--eva-orange)] border-[var(--eva-orange)]/50 hover:bg-[var(--eva-orange)]/20"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                      COPY CODE
                    </Button>
                  </div>
                  <div className="bg-black/50 p-3 rounded border border-[var(--eva-orange)]/30">
                    <code className="text-sm font-mono text-[var(--eva-green)] break-all">{authCode}</code>
                  </div>
                  <div className="mt-3 pt-3 border-t border-[var(--eva-orange)]/20">
                    <p className="text-xs text-[var(--eva-text)] mb-2 font-mono">
                      OAuth authentication failed, but you can still use this code:
                    </p>
                    <ol className="text-xs text-[var(--eva-blue)] font-mono list-decimal ml-4 space-y-1">
                      <li>Return to the main interface using the button below</li>
                      <li>Navigate to NERV SYSTEM-B (chat interface) tab</li>
                      <li>Enter your OpenRouter API key directly in the provided field</li>
                      <li>OR use the "SYNCHRONIZE WITH OPENROUTER" option again</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {success && (
            <div className="space-y-4">
              <div className="border border-[var(--eva-green)]/50 bg-[var(--eva-green)]/10 p-4 rounded-md">
                <div className="flex items-center mb-3">
                  <div className="w-4 h-4 bg-[var(--eva-green)] mr-2 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <p className="text-[var(--eva-green)] font-mono uppercase tracking-wider">SYNCHRONIZATION COMPLETE</p>
                </div>
                <p className="text-sm text-[var(--eva-text)] font-mono">NERV systems now authorized to utilize OpenRouter resources.</p>
              </div>
              
              <div className="font-mono text-xs text-[var(--eva-orange)] flex items-center justify-center space-x-2">
                <span className="inline-block w-2 h-2 bg-[var(--eva-orange)] animate-pulse"></span>
                <span>REDIRECTING TO CENTRAL COMMAND</span>
                <span className="inline-block w-2 h-2 bg-[var(--eva-orange)] animate-pulse"></span>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center border-t border-[var(--eva-orange)]/30 pt-4">
          {!isLoading && (
            <Button 
              onClick={() => {
                // Use the same path detection logic as in the success handler
                const isReplit = window.location.origin.includes('.replit.dev') || window.location.origin.includes('.replit.app');
                let basePath = '/';
                
                if (isReplit) {
                  // Get the base path by analyzing the current URL
                  const pathname = window.location.pathname;
                  const parts = pathname.split('/');
                  // Remove 'callback' from the end of the path
                  parts.pop();
                  basePath = parts.join('/') || '/';
                  if (!basePath.startsWith('/')) basePath = '/' + basePath;
                  if (!basePath.endsWith('/')) basePath += '/';
                }
                
                console.log("Returning to:", basePath);
                setLocation(basePath);
              }}
              className="font-mono uppercase tracking-wider eva-button text-[var(--eva-orange)]"
            >
              RETURN TO CENTRAL DOGMA
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default Callback;
