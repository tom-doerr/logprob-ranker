/**
 * Unified chat service hook
 * Centralizes all chat-related functionality
 */

import { useState, useCallback, useEffect } from 'react';
import { apiService } from '../services/api-service';
import { useCombinedModelConfig } from './use-combined-model-config';
import { useSimplifiedAuth } from './use-simplified-auth';
import { chatStorage } from '../utils/storage';
import { APP_CONFIG } from '../config/app-config';
import { useToast } from '@/hooks/use-toast';

// Chat message type
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Chat options interface
export interface ChatOptions {
  id?: string;
  systemMessage?: string;
  initialMessages?: ChatMessage[];
  persistMessages?: boolean;
  streamingEnabled?: boolean;
}

/**
 * Custom hook for chat functionality
 */
export function useChatService(options: ChatOptions = {}) {
  const {
    id = 'default',
    systemMessage = APP_CONFIG.TEMPLATES.SYSTEM.DEFAULT,
    initialMessages = [],
    persistMessages = true,
    streamingEnabled = false
  } = options;
  
  // External hooks
  const { toast } = useToast();
  const { apiKey, isAuthenticated, method: authMethod } = useSimplifiedAuth();
  const modelConfig = useCombinedModelConfig();
  
  // Extract model configuration
  const {
    isUsingBrowserModel,
    browserModelEngine,
    temperature,
    topP,
    maxTokens,
    selectedModel,
    customModel
  } = modelConfig;
  
  // State
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // Try to load from storage if enabled
    if (persistMessages) {
      const storedMessages = chatStorage.getMessages(id);
      if (storedMessages.length > 0) {
        return storedMessages;
      }
    }
    
    // Start with system message if provided
    const initialState: ChatMessage[] = [];
    if (systemMessage) {
      initialState.push({ role: 'system', content: systemMessage });
    }
    
    // Add any provided initial messages
    return [...initialState, ...initialMessages];
  });
  
  const [input, setInput] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  
  // Effect to persist messages when they change
  useEffect(() => {
    if (persistMessages) {
      chatStorage.saveMessages(id, messages);
    }
  }, [messages, id, persistMessages]);
  
  // Add a message to the chat
  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prevMessages => [...prevMessages, message]);
  }, []);
  
  // Send a message via cloud API
  const sendMessageViaApi = useCallback(async (userInput: string): Promise<boolean> => {
    if (!apiKey) {
      toast({
        title: 'Authentication Required',
        description: 'Please provide an API key to use cloud models',
        variant: 'destructive',
      });
      return false;
    }
    
    try {
      // Create new abort controller
      const controller = new AbortController();
      setAbortController(controller);
      
      // Add user message to chat
      const userMessage: ChatMessage = { role: 'user', content: userInput };
      addMessage(userMessage);
      
      // Prepare messages for API (including history)
      const apiMessages = messages.concat(userMessage);
      
      // Determine which model to use (custom or selected)
      const modelToUse = selectedModel === 'custom' && customModel ? customModel : selectedModel;
      
      // Send request to API
      const response = await apiService.createChatCompletion({
        model: modelToUse,
        messages: apiMessages,
        temperature,
        top_p: topP,
        max_tokens: maxTokens,
        stream: streamingEnabled
      });
      
      // Check response and get assistant message
      if (response && response.choices && response.choices.length > 0) {
        const assistantMessage = response.choices[0].message;
        addMessage(assistantMessage);
        return true;
      } else {
        throw new Error('Invalid API response');
      }
    } catch (error) {
      console.error('Error sending message via API:', error);
      
      // Add error message to chat
      addMessage({
        role: 'assistant',
        content: 'Sorry, there was an error processing your request. Please try again.',
      });
      
      // Show toast notification
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send message',
        variant: 'destructive',
      });
      
      return false;
    } finally {
      setIsGenerating(false);
      setAbortController(null);
    }
  }, [apiKey, messages, selectedModel, customModel, temperature, topP, maxTokens, addMessage, toast, streamingEnabled]);
  
  // Send a message via browser model
  const sendMessageViaBrowserModel = useCallback(async (userInput: string): Promise<boolean> => {
    if (!browserModelEngine) {
      toast({
        title: 'Browser Model Not Loaded',
        description: 'Please load a browser model first',
        variant: 'destructive',
      });
      return false;
    }
    
    try {
      // Add user message to chat
      const userMessage: ChatMessage = { role: 'user', content: userInput };
      addMessage(userMessage);
      
      // Send to browser model
      const response = await browserModelEngine.chat.completions.create({
        messages: [
          ...messages,
          userMessage
        ],
        temperature,
        max_tokens: maxTokens,
        top_p: topP
      });
      
      // Check response and add assistant message
      if (response && response.choices && response.choices.length > 0) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.choices[0].message.content || ''
        };
        addMessage(assistantMessage);
        return true;
      } else {
        throw new Error('Invalid browser model response');
      }
    } catch (error) {
      console.error('Error sending message via browser model:', error);
      
      // Add error message to chat
      addMessage({
        role: 'assistant',
        content: 'Sorry, there was an error processing your request with the browser model. Please try again.',
      });
      
      // Show toast notification
      toast({
        title: 'Browser Model Error',
        description: error instanceof Error ? error.message : 'Failed to use browser model',
        variant: 'destructive',
      });
      
      return false;
    } finally {
      setIsGenerating(false);
    }
  }, [browserModelEngine, messages, temperature, maxTokens, topP, addMessage, toast]);
  
  // Send a message (automatically choose API or browser model)
  const sendMessage = useCallback(async (userInput: string = input) => {
    // Don't do anything if already generating or no input
    if (isGenerating || !userInput.trim()) return;
    
    // Clear input and set generating state
    setInput('');
    setIsGenerating(true);
    
    // Choose appropriate method based on configuration
    if (isUsingBrowserModel && browserModelEngine) {
      await sendMessageViaBrowserModel(userInput);
    } else {
      await sendMessageViaApi(userInput);
    }
  }, [input, isGenerating, isUsingBrowserModel, browserModelEngine, sendMessageViaBrowserModel, sendMessageViaApi]);
  
  // Abort ongoing generation
  const abortGeneration = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsGenerating(false);
      
      toast({
        title: 'Generation Aborted',
        description: 'The ongoing message generation has been stopped',
      });
    }
  }, [abortController, toast]);
  
  // Clear all messages
  const clearMessages = useCallback(() => {
    // Create a fresh state with just the system message
    const newMessages: ChatMessage[] = [];
    if (systemMessage) {
      newMessages.push({ role: 'system', content: systemMessage });
    }
    
    setMessages(newMessages);
    
    // Clear from storage if persistence is enabled
    if (persistMessages) {
      chatStorage.clearMessages(id);
    }
    
    toast({
      title: 'Chat Cleared',
      description: 'All messages have been cleared',
    });
  }, [id, persistMessages, systemMessage, toast]);
  
  // Export all needed values and functions
  return {
    // State
    messages,
    input,
    setInput,
    isGenerating,
    
    // Status
    isUsingBrowserModel,
    isAuthenticated,
    authMethod,
    
    // Actions
    sendMessage,
    addMessage,
    abortGeneration,
    clearMessages,
  };
}

export default useChatService;