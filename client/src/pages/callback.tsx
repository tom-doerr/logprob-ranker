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

  // Store the authorization code
  const [authCode, setAuthCode] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      try {
        // Get the code from URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        
        if (!code) {
          setError('No authorization code found in the URL');
          setIsLoading(false);
          return;
        }

        // Store the code for display
        setAuthCode(code);
        
        // Get the code verifier from storage
        const codeVerifier = getCodeVerifier();
        
        if (!codeVerifier) {
          setError('No code verifier found in browser storage. This could happen if you started the OAuth flow in a different browser tab or cleared your storage. Please copy this code and use it in the main application.');
          setIsLoading(false);
          return;
        }
        
        // Exchange code for token
        const response = await fetch('/api/exchange-code', {
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
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to exchange code for API key');
        }
        
        const data = await response.json();
        
        if (!data.key) {
          throw new Error('No API key returned from server');
        }
        
        // Store the token
        saveApiKey(data.key);
        clearCodeVerifier(); // Clear the verifier as we no longer need it
        
        // Dispatch event to notify other components of the API key change
        window.dispatchEvent(new Event('api-key-changed'));
        
        setSuccess(true);
        setIsLoading(false);
        
        toast({
          title: 'NERV AUTHENTICATION COMPLETE',
          description: 'OpenRouter synchronization successful',
        });
        
        // Redirect back to main page after a delay
        setTimeout(() => {
          setLocation('/');
        }, 3000);
      } catch (err) {
        console.error('Error in callback handling:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        setIsLoading(false);
      }
    }
    
    handleCallback();
  }, [setLocation, toast]);

  return (
    <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl font-bold">
            {isLoading 
              ? 'Processing Authentication...' 
              : success 
                ? 'Authentication Successful!' 
                : 'Authentication Failed'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex flex-col items-center py-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4F46E5]"></div>
              <p className="mt-4 text-neutral-600">
                Exchanging authorization code for API key...
              </p>
            </div>
          )}
          
          {error && (
            <div className="py-2">
              <p className="font-medium text-red-500">Error:</p>
              <p className="text-red-500">{error}</p>
              
              {authCode && (
                <div className="mt-4 bg-amber-50 border border-amber-200 rounded-md p-3">
                  <p className="text-sm font-medium text-amber-800 mb-2">
                    <i className="fas fa-info-circle mr-2"></i>
                    You can still copy this authorization code and use it in the main application:
                  </p>
                  <div className="bg-white p-2 rounded border border-amber-200 flex items-center justify-between">
                    <code className="text-sm font-mono text-neutral-700 break-all">{authCode}</code>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(authCode);
                        toast({
                          title: "Copied to clipboard",
                          description: "Authorization code copied successfully",
                        });
                      }}
                      className="ml-2 text-amber-600 hover:text-amber-700"
                    >
                      <i className="far fa-copy"></i>
                    </button>
                  </div>
                  <p className="text-xs text-amber-700 mt-2">
                    Return to the main page and paste this code in the Step 2 input field.
                  </p>
                </div>
              )}
            </div>
          )}
          
          {success && (
            <div className="text-green-600 py-2">
              <p>Your OpenRouter API key has been successfully retrieved and stored securely.</p>
              <p className="mt-2">Redirecting you back to the main page in a few seconds...</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          {!isLoading && (
            <Button onClick={() => setLocation('/')}>
              Return to Home
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default Callback;
