import { FC, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { getCodeVerifier, saveApiKey, clearCodeVerifier } from '../utils/pkce';
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
        
        if (!code) {
          setError('No authorization code found in the URL');
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
          response = await fetch('/api/exchange-code', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              code,
              codeVerifier,
              codeMethod: 'S256'
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
        try {
          data = await response.json();
        } catch (parseError) {
          throw new Error('Invalid JSON response from server');
        }
        
        if (!data || !data.key) {
          throw new Error('No API key returned from server');
        }
        
        // Store the token and update application state
        saveApiKey(data.key);
        clearCodeVerifier();
        
        // Notify other components about the API key change
        window.dispatchEvent(new Event('api-key-changed'));
        
        setSuccess(true);
        
        toast({
          title: 'NERV AUTHENTICATION COMPLETE',
          description: 'OpenRouter synchronization successful',
        });
        
        // Redirect back to main page after a delay
        setTimeout(() => {
          setLocation('/');
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
              <div className="font-mono text-[var(--eva-red)] border border-[var(--eva-red)]/50 bg-[var(--eva-red)]/10 p-3 rounded-md">
                <p className="text-sm uppercase tracking-wider mb-2">ERROR DETECTED:</p>
                <p className="text-xs">{error}</p>
              </div>
              
              {authCode && (
                <div className="mt-4 border border-[var(--eva-orange)]/50 bg-black/50 rounded-md p-3">
                  <p className="text-sm font-mono text-[var(--eva-orange)] mb-2 flex items-center">
                    <span className="w-3 h-3 bg-[var(--eva-orange)] mr-2"></span>
                    AUTHENTICATION CODE CAPTURED:
                  </p>
                  <div className="bg-black/50 p-3 rounded border border-[var(--eva-orange)]/30 flex items-center justify-between">
                    <code className="text-sm font-mono text-[var(--eva-green)] break-all">{authCode}</code>
                    <Button 
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(authCode || '');
                        toast({
                          title: "CODE COPIED",
                          description: "Authentication code transferred to clipboard",
                        });
                      }}
                      className="ml-2 text-[var(--eva-orange)] border-[var(--eva-orange)]/50 hover:bg-[var(--eva-orange)]/20"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                    </Button>
                  </div>
                  <p className="text-xs text-[var(--eva-blue)] mt-2 font-mono">
                    Return to central command and enter authentication code manually.
                  </p>
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
              onClick={() => setLocation('/')}
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
