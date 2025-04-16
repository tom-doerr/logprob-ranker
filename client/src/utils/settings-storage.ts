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

/**
 * Default templates to provide for first-time users
 */
export const defaultTemplates: Omit<SavedTemplate, 'id' | 'createdAt'>[] = [
  {
    name: "General Quality Evaluation",
    prompt: "You are evaluating LLM outputs for general quality. Consider completeness, correctness, and coherence.",
    template: `Given the output, assess the following attributes on a scale of 1-10 where 10 is best:

1. Clarity: How clear and easy to understand is the response?
2. Completeness: How thoroughly does it address the prompt?
3. Accuracy: How factually accurate is the information provided?
4. Coherence: How logically structured and well-organized is the content?
5. Relevance: How focused and on-topic is the response?

For each attribute, provide a score and a brief explanation.
Then provide an overall assessment with strengths and weaknesses.`
  },
  {
    name: "Code Review Evaluation",
    prompt: "Review this code snippet for quality, best practices, and potential issues.",
    template: `Evaluate this code on the following criteria from 1-10 where 10 is best:

1. Functionality: Would this code work as intended?
2. Readability: Is the code easy to understand?
3. Efficiency: Is the code optimized appropriately?
4. Maintainability: Would this be easy to modify or extend?
5. Security: Are there any apparent security issues?

For each criterion, provide a score and brief reasoning.
End with specific suggestions for improvement.`
  },
  {
    name: "Style and Tone Analysis",
    prompt: "Analyze the writing style and tone of this text.",
    template: `Analyze the style and tone of this text based on:

1. Formality: Is it casual, neutral, or formal?
2. Voice: Is it active or passive voice? How consistent?
3. Emotion: What emotions does the text convey?
4. Vocabulary: How sophisticated is the word choice?
5. Sentence Structure: How varied and complex are the sentences?

For each aspect, provide specific examples from the text.
Conclude with an overall assessment of effectiveness for the intended purpose.`
  }
];

export function getTemplates(): SavedTemplate[] {
  const templatesJson = localStorage.getItem(TEMPLATE_STORAGE_KEY);
  
  // If no templates exist, create the default ones
  if (!templatesJson) {
    const initializedTemplates = defaultTemplates.map(template => {
      return {
        ...template,
        id: `template_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        createdAt: Date.now()
      };
    });
    
    // Save to localStorage
    localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(initializedTemplates));
    return initializedTemplates;
  }
  
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