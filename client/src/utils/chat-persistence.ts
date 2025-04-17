/**
 * Chat Persistence Utility
 * 
 * This utility helps preserve chat conversations and input states
 * across page reloads, which is particularly useful during development
 * with hot module replacement (HMR).
 */

// Storage key for chat history
const CHAT_HISTORY_KEY = 'app.chatHistory';
const CHAT_INPUT_KEY = 'app.chatInput';

// Chat message interface
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

/**
 * Chat history persistence options
 */
interface ChatPersistenceOptions {
  // Maximum number of conversations to keep
  maxConversations?: number;
  
  // Maximum number of messages per conversation
  maxMessages?: number;
  
  // How long to keep the data (in milliseconds, default 24 hours)
  expiry?: number;
  
  // Conversation identifier (to support multiple chat contexts)
  conversationId?: string;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: ChatPersistenceOptions = {
  maxConversations: 5,
  maxMessages: 100,
  expiry: 24 * 60 * 60 * 1000, // 24 hours
  conversationId: 'default'
};

/**
 * Saves chat messages to localStorage
 * 
 * @param messages - Current chat messages
 * @param options - Persistence options
 */
export function saveChatHistory(
  messages: ChatMessage[],
  options: ChatPersistenceOptions = {}
): void {
  try {
    const { conversationId = 'default', expiry } = { ...DEFAULT_OPTIONS, ...options };
    
    // Get existing chat history
    const existingDataStr = localStorage.getItem(CHAT_HISTORY_KEY);
    const existingData = existingDataStr ? JSON.parse(existingDataStr) : {};
    
    // Add expiration timestamp to messages
    const messagesToSave = messages.map(msg => ({
      ...msg,
      timestamp: msg.timestamp || Date.now()
    }));
    
    // Save conversation with expiry
    existingData[conversationId] = {
      messages: messagesToSave,
      expires: Date.now() + (expiry || DEFAULT_OPTIONS.expiry!)
    };
    
    // Store in localStorage
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(existingData));
  } catch (error) {
    console.error('Error saving chat history:', error);
  }
}

/**
 * Loads saved chat messages
 * 
 * @param options - Persistence options
 * @returns The stored chat messages or empty array if not found
 */
export function loadChatHistory(
  options: ChatPersistenceOptions = {}
): ChatMessage[] {
  try {
    const { conversationId = 'default' } = { ...DEFAULT_OPTIONS, ...options };
    
    // Get data from localStorage
    const data = localStorage.getItem(CHAT_HISTORY_KEY);
    if (!data) return [];
    
    // Parse and validate
    const allConversations = JSON.parse(data);
    const conversation = allConversations[conversationId];
    
    if (!conversation) return [];
    
    const now = Date.now();
    
    // Check expiration
    if (conversation.expires && conversation.expires < now) {
      // Clean up expired conversation but keep the object
      delete allConversations[conversationId];
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(allConversations));
      return [];
    }
    
    return conversation.messages;
  } catch (error) {
    console.error('Error loading chat history:', error);
    return [];
  }
}

/**
 * Saves current chat input
 * 
 * @param input - Current input text
 * @param options - Persistence options
 */
export function saveChatInput(
  input: string,
  options: ChatPersistenceOptions = {}
): void {
  try {
    const { conversationId = 'default', expiry } = { ...DEFAULT_OPTIONS, ...options };
    
    // Get existing inputs
    const existingDataStr = localStorage.getItem(CHAT_INPUT_KEY);
    const existingData = existingDataStr ? JSON.parse(existingDataStr) : {};
    
    // Save input with expiry
    existingData[conversationId] = {
      text: input,
      expires: Date.now() + (expiry || DEFAULT_OPTIONS.expiry!)
    };
    
    // Store in localStorage
    localStorage.setItem(CHAT_INPUT_KEY, JSON.stringify(existingData));
  } catch (error) {
    console.error('Error saving chat input:', error);
  }
}

/**
 * Loads saved chat input
 * 
 * @param options - Persistence options
 * @returns The stored input text or empty string if not found
 */
export function loadChatInput(
  options: ChatPersistenceOptions = {}
): string {
  try {
    const { conversationId = 'default' } = { ...DEFAULT_OPTIONS, ...options };
    
    // Get data from localStorage
    const data = localStorage.getItem(CHAT_INPUT_KEY);
    if (!data) return '';
    
    // Parse and validate
    const allInputs = JSON.parse(data);
    const inputData = allInputs[conversationId];
    
    if (!inputData) return '';
    
    const now = Date.now();
    
    // Check expiration
    if (inputData.expires && inputData.expires < now) {
      // Clean up expired input but keep the object
      delete allInputs[conversationId];
      localStorage.setItem(CHAT_INPUT_KEY, JSON.stringify(allInputs));
      return '';
    }
    
    return inputData.text || '';
  } catch (error) {
    console.error('Error loading chat input:', error);
    return '';
  }
}

/**
 * Clears chat history and input for a conversation
 * 
 * @param options - Persistence options
 */
export function clearChatData(
  options: ChatPersistenceOptions = {}
): void {
  try {
    const { conversationId = 'default' } = { ...DEFAULT_OPTIONS, ...options };
    
    // Clear history
    const historyData = localStorage.getItem(CHAT_HISTORY_KEY);
    if (historyData) {
      const allConversations = JSON.parse(historyData);
      delete allConversations[conversationId];
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(allConversations));
    }
    
    // Clear input
    const inputData = localStorage.getItem(CHAT_INPUT_KEY);
    if (inputData) {
      const allInputs = JSON.parse(inputData);
      delete allInputs[conversationId];
      localStorage.setItem(CHAT_INPUT_KEY, JSON.stringify(allInputs));
    }
  } catch (error) {
    console.error('Error clearing chat data:', error);
  }
}

/**
 * Cleans up all expired chat data
 */
export function cleanupExpiredChatData(): void {
  try {
    const now = Date.now();
    let hasChanges = false;
    
    // Clean up history
    const historyData = localStorage.getItem(CHAT_HISTORY_KEY);
    if (historyData) {
      const allConversations = JSON.parse(historyData);
      
      for (const id in allConversations) {
        const conversation = allConversations[id];
        if (conversation.expires && conversation.expires < now) {
          delete allConversations[id];
          hasChanges = true;
        }
      }
      
      if (hasChanges) {
        localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(allConversations));
      }
    }
    
    // Clean up inputs
    hasChanges = false;
    const inputData = localStorage.getItem(CHAT_INPUT_KEY);
    if (inputData) {
      const allInputs = JSON.parse(inputData);
      
      for (const id in allInputs) {
        const input = allInputs[id];
        if (input.expires && input.expires < now) {
          delete allInputs[id];
          hasChanges = true;
        }
      }
      
      if (hasChanges) {
        localStorage.setItem(CHAT_INPUT_KEY, JSON.stringify(allInputs));
      }
    }
  } catch (error) {
    console.error('Error cleaning up expired chat data:', error);
  }
}