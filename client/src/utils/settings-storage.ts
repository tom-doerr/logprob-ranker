/**
 * Utility functions for saving and retrieving user settings
 */

const STORAGE_PREFIX = 'nerv_magi_';

/**
 * Template storage
 */
const TEMPLATE_STORAGE_KEY = `${STORAGE_PREFIX}templates`;

export interface SavedTemplate {
  id: string;
  name: string;
  prompt: string;
  template: string;
  createdAt: number;
}

export function saveTemplate(template: Omit<SavedTemplate, 'id' | 'createdAt'>): SavedTemplate {
  const templates = getTemplates();
  
  // Create a new template with ID and timestamp
  const newTemplate: SavedTemplate = {
    ...template,
    id: `template_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    createdAt: Date.now()
  };
  
  // Add to existing templates
  templates.push(newTemplate);
  
  // Save to localStorage
  localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(templates));
  
  return newTemplate;
}

export function getTemplates(): SavedTemplate[] {
  const templatesJson = localStorage.getItem(TEMPLATE_STORAGE_KEY);
  if (!templatesJson) return [];
  
  try {
    return JSON.parse(templatesJson);
  } catch (error) {
    console.error('Failed to parse templates from storage:', error);
    return [];
  }
}

export function deleteTemplate(id: string): boolean {
  const templates = getTemplates();
  const newTemplates = templates.filter(t => t.id !== id);
  
  if (newTemplates.length === templates.length) {
    return false; // No template was deleted
  }
  
  localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(newTemplates));
  return true;
}

/**
 * Ranker settings storage
 */
const RANKER_SETTINGS_KEY = `${STORAGE_PREFIX}ranker_settings`;

export interface RankerSettings {
  numberOfVariants: number;
  useAutoStop: boolean;
  autoStopThreshold: number;
  threadCount: number;
  temperature: number;
  maxTokens: number;
  lastUsedModel: string;
  useLocalModels: boolean;
}

export const defaultRankerSettings: RankerSettings = {
  numberOfVariants: 5,
  useAutoStop: false,
  autoStopThreshold: 5,
  threadCount: 1,
  temperature: 0.7,
  maxTokens: 1024,
  lastUsedModel: '',
  useLocalModels: false
};

export function saveRankerSettings(settings: Partial<RankerSettings>): void {
  const currentSettings = getRankerSettings();
  const newSettings = { ...currentSettings, ...settings };
  localStorage.setItem(RANKER_SETTINGS_KEY, JSON.stringify(newSettings));
}

export function getRankerSettings(): RankerSettings {
  const settingsJson = localStorage.getItem(RANKER_SETTINGS_KEY);
  if (!settingsJson) return defaultRankerSettings;
  
  try {
    const storedSettings = JSON.parse(settingsJson);
    // Ensure we have all the default fields
    return { ...defaultRankerSettings, ...storedSettings };
  } catch (error) {
    console.error('Failed to parse ranker settings from storage:', error);
    return defaultRankerSettings;
  }
}