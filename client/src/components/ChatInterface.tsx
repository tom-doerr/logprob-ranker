import { FC, useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { getApiKey, saveApiKey, clearApiKey } from '../utils/pkce';
import { createChatCompletion } from '../lib/openrouter';
import { generateAuthUrl, exchangeCodeForToken } from '../lib/openrouter';
import { createSHA256CodeChallenge, generateCodeVerifier, saveCodeVerifier } from '../utils/pkce';
import { Loader2, Send, Key, LogOut } from 'lucide-react';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const ChatInterface: FC = () => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [manualApiKey, setManualApiKey] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load API key on mount
  useEffect(() => {
    const storedApiKey = getApiKey();
    if (storedApiKey) {
      setApiKey(storedApiKey);
    }
  }, []);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || !apiKey) return;
    
    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      const response = await createChatCompletion({
        model: 'openai/gpt-3.5-turbo',
        messages: [...messages, userMessage],
      });
      
      if (response.choices && response.choices.length > 0) {
        setMessages(prev => [...prev, response.choices[0].message]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApiKeySubmit = () => {
    if (!manualApiKey.trim()) return;
    
    setApiKey(manualApiKey);
    saveApiKey(manualApiKey);
    setManualApiKey('');
    toast({
      title: 'API Key Saved',
      description: 'Your API key has been saved and will be used for chat',
    });
  };

  const handleStartAuth = async () => {
    try {
      // Generate and save code verifier
      const codeVerifier = generateCodeVerifier();
      saveCodeVerifier(codeVerifier);
      
      // Generate code challenge
      const codeChallenge = await createSHA256CodeChallenge(codeVerifier);
      
      // Generate and open auth URL
      const callbackUrl = `${window.location.origin}/callback`;
      const authUrl = generateAuthUrl(codeChallenge, callbackUrl);
      
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error starting authentication:', error);
      toast({
        title: 'Authentication Error',
        description: 'Failed to start the authentication process',
        variant: 'destructive',
      });
    }
  };

  const handleLogout = () => {
    setApiKey(null);
    clearApiKey();
    setMessages([]);
    toast({
      title: 'Logged Out',
      description: 'Your API key has been removed',
    });
  };

  return (
    <div className="container mx-auto max-w-4xl p-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>OpenRouter Chat</span>
            {apiKey && (
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {apiKey ? (
            <div className="flex flex-col h-[60vh]">
              <div className="flex-grow overflow-y-auto mb-4 space-y-4 p-4 bg-gray-50 rounded-md">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 my-8">
                    Start a conversation by sending a message below
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg max-w-[80%] ${
                        message.role === 'user'
                          ? 'ml-auto bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-900'
                      }`}
                    >
                      {message.content}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="flex space-x-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-grow"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button onClick={handleSendMessage} disabled={isLoading || !input.trim()}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Enter your OpenRouter API Key</h3>
                <div className="flex space-x-2">
                  <Input
                    type="password"
                    value={manualApiKey}
                    onChange={(e) => setManualApiKey(e.target.value)}
                    placeholder="sk-or-v1-..."
                    className="flex-grow"
                  />
                  <Button onClick={handleApiKeySubmit} disabled={!manualApiKey.trim()}>
                    <Key className="h-4 w-4 mr-2" />
                    Save Key
                  </Button>
                </div>
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Or</span>
                </div>
              </div>
              
              <div className="text-center">
                <Button onClick={handleStartAuth} variant="outline" className="w-full">
                  Login with OpenRouter
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ChatInterface;