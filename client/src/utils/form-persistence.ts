/**
 * Form Persistence Utility
 * 
 * This utility helps preserve form inputs and states across page reloads,
 * which is particularly useful during development with HMR.
 */

// Storage key prefix for form data
const FORM_STORAGE_PREFIX = 'form_state_';

/**
 * Form state persistence options
 */
interface PersistenceOptions {
  // Form identifier (should be unique per form)
  formId: string;
  
  // Whether to encrypt the stored data (for sensitive forms)
  encrypt?: boolean;
  
  // How long to keep the data (in milliseconds, default 1 hour)
  expiry?: number;
  
  // Fields to exclude from persistence (e.g., passwords)
  excludeFields?: string[];
}

/**
 * Hook to save form data on change
 * 
 * @param formValues - Current form values
 * @param options - Persistence options
 */
export function saveFormState<T extends Record<string, any>>(
  formValues: T,
  options: PersistenceOptions
): void {
  try {
    const { formId, excludeFields = [], expiry = 3600000 } = options;
    
    // Filter out excluded fields
    const filteredValues = { ...formValues };
    excludeFields.forEach(field => {
      delete filteredValues[field];
    });
    
    // Add expiration timestamp
    const dataToStore = {
      values: filteredValues,
      expires: Date.now() + expiry
    };
    
    // Store in localStorage
    localStorage.setItem(
      `${FORM_STORAGE_PREFIX}${formId}`,
      JSON.stringify(dataToStore)
    );
  } catch (error) {
    console.error('Error saving form state:', error);
  }
}

/**
 * Hook to load saved form data
 * 
 * @param options - Persistence options
 * @returns The stored form values or null if not found
 */
export function loadFormState<T>(options: PersistenceOptions): T | null {
  try {
    const { formId } = options;
    const key = `${FORM_STORAGE_PREFIX}${formId}`;
    
    // Get data from localStorage
    const data = localStorage.getItem(key);
    if (!data) return null;
    
    // Parse and validate
    const parsed = JSON.parse(data);
    const now = Date.now();
    
    // Check expiration
    if (parsed.expires && parsed.expires < now) {
      // Expired data, clean up and return null
      localStorage.removeItem(key);
      return null;
    }
    
    return parsed.values as T;
  } catch (error) {
    console.error('Error loading form state:', error);
    return null;
  }
}

/**
 * Clears saved form state
 * 
 * @param formId - Form identifier
 */
export function clearFormState(formId: string): void {
  try {
    localStorage.removeItem(`${FORM_STORAGE_PREFIX}${formId}`);
  } catch (error) {
    console.error('Error clearing form state:', error);
  }
}

/**
 * Clears all expired form states
 */
export function cleanupExpiredFormStates(): void {
  try {
    const now = Date.now();
    
    // Get all localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      
      // Check if it's a form state
      if (key && key.startsWith(FORM_STORAGE_PREFIX)) {
        const data = localStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          
          // Remove if expired
          if (parsed.expires && parsed.expires < now) {
            localStorage.removeItem(key);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up expired form states:', error);
  }
}

/**
 * Returns a list of all persisted forms
 */
export function getPersistedForms(): string[] {
  const forms: string[] = [];
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      
      if (key && key.startsWith(FORM_STORAGE_PREFIX)) {
        // Extract form ID from key
        forms.push(key.substring(FORM_STORAGE_PREFIX.length));
      }
    }
  } catch (error) {
    console.error('Error getting persisted forms:', error);
  }
  
  return forms;
}