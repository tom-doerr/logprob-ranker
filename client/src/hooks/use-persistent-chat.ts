/**
 * Hook for chat persistence across page reloads
 * This hook provides automatic persistence of chat messages and input values,
 * which survives HMR reloads during development
 */

import { useState, useEffect, useCallback } from 'react';
import {
  ChatMessage,
  saveChatHistory,
  loadChatHistory,
  saveChatInput,
  loadChatInput,
  clearChatData
} from '../utils/chat-persistence';

// Configuration options for the hook
interface PersistentChatOptions {
  // Unique conversation identifier
  conversationId?: string;
  
  // Initial system message (optional)
  systemMessage?: string;
  
  // How long to persist data (ms)
  expiry?: number;
  
  // Maximum number of messages to keep
  maxMessages?: number;
}

/**
 * Interface returned by the hook
 */
interface PersistentChatReturn {
  // Chat state
  messages: ChatMessage[];
  input: string;
  isLoading: boolean;
  
  // Actions
  setInput: (value: string) => void;
  sendMessage: (message?: string) => void;
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
}

/**
 * Custom hook for creating persistent chat interfaces
 */
export function usePersistentChat(
  options: PersistentChatOptions = {}
): PersistentChatReturn {
  const {
    conversationId = 'default',
    systemMessage,
    expiry,
    maxMessages
  } = options;

  // Initialize state
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // Load saved messages or initialize with system message
    const savedMessages = loadChatHistory({ conversationId, expiry });
    
    if (savedMessages.length > 0) {
      return savedMessages;
    } else if (systemMessage) {
      return [{ role: 'system', content: systemMessage, timestamp: Date.now() }];
    } else {
      return [];
    }
  });

  const [input, setInputState] = useState<string>(() => {
    // Load saved input
    return loadChatInput({ conversationId, expiry });
  });

  const [isLoading, setIsLoading] = useState(false);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    saveChatHistory(messages, { conversationId, expiry, maxMessages });
  }, [messages, conversationId, expiry, maxMessages]);

  // Handler for input changes with persistence
  const setInput = useCallback((value: string) => {
    setInputState(value);
    saveChatInput(value, { conversationId, expiry });
  }, [conversationId, expiry]);

  // Handler to add a new message
  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => {
      const newMessages = [...prev, { ...message, timestamp: Date.now() }];
      
      // Limit number of messages if specified
      if (maxMessages && newMessages.length > maxMessages) {
        return newMessages.slice(newMessages.length - maxMessages);
      }
      
      return newMessages;
    });
  }, [maxMessages]);

  // Handler to send a user message
  const sendMessage = useCallback((message?: string) => {
    const messageText = message || input;
    
    if (!messageText.trim()) return;
    
    // Add user message
    const userMessage: ChatMessage = {
      role: 'user',
      content: messageText,
      timestamp: Date.now()
    };
    
    addMessage(userMessage);
    
    // Clear input after sending
    setInput('');
    
    // Could add auto-response logic here if needed
    // setIsLoading(true);
    // generateResponse().then(response => {
    //   addMessage(response);
    //   setIsLoading(false);
    // });
  }, [input, addMessage, setInput]);

  // Handler to clear all messages
  const clearMessages = useCallback(() => {
    setMessages(systemMessage 
      ? [{ role: 'system', content: systemMessage, timestamp: Date.now() }] 
      : []
    );
    setInput('');
    clearChatData({ conversationId });
  }, [systemMessage, conversationId, setInput]);

  return {
    messages,
    input,
    isLoading,
    setInput,
    sendMessage,
    addMessage,
    clearMessages
  };
}

/**
 * Simplified usage example:
 * 
 * function ChatComponent() {
 *   const {
 *     messages,
 *     input,
 *     isLoading,
 *     setInput,
 *     sendMessage,
 *     clearMessages
 *   } = usePersistentChat({
 *     conversationId: 'main-chat',
 *     systemMessage: 'How can I help you today?'
 *   });
 * 
 *   return (
 *     <div>
 *       <div className="messages">
 *         {messages.map((message, i) => (
 *           <div key={i} className={message.role}>
 *             {message.content}
 *           </div>
 *         ))}
 *         {isLoading && <div className="loading">...</div>}
 *       </div>
 *       
 *       <div className="input">
 *         <input
 *           value={input}
 *           onChange={(e) => setInput(e.target.value)}
 *           onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
 *         />
 *         <button onClick={() => sendMessage()}>Send</button>
 *         <button onClick={clearMessages}>Clear</button>
 *       </div>
 *     </div>
 *   );
 * }
 */