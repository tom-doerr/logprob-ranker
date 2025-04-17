/**
 * Configuration-driven parameter definitions
 * This approach allows for:
 * - Centralized parameter configuration
 * - Easy addition of new parameters
 * - Consistent validation and UI generation
 * - Self-documenting code
 */

import { Thermometer, Crosshair, Maximize, Zap, Cpu } from 'lucide-react';

// Parameter definition type
export interface ParameterDefinition {
  id: string;
  name: string;
  description: string;
  icon: any;  // Lucide icon component
  defaultValue: number;
  min: number;
  max: number;
  step: number;
  formatter: (value: number) => string;
}

// Model parameter definitions
export const MODEL_PARAMETERS: Record<string, ParameterDefinition> = {
  temperature: {
    id: 'temperature',
    name: 'TEMPERATURE',
    description: 'Controls randomness: Higher values produce more creative outputs, lower values are more deterministic.',
    icon: Thermometer,
    defaultValue: 0.7,
    min: 0,
    max: 1,
    step: 0.01,
    formatter: (value) => value.toFixed(2)
  },
  
  topP: {
    id: 'topP',
    name: 'TOP-P',
    description: 'Controls diversity: Only consider tokens with this cumulative probability. Lower values stay closer to high-confidence options.',
    icon: Crosshair,
    defaultValue: 0.9,
    min: 0,
    max: 1,
    step: 0.01,
    formatter: (value) => value.toFixed(2)
  },
  
  maxTokens: {
    id: 'maxTokens',
    name: 'MAX TOKENS',
    description: 'Maximum number of tokens to generate. One token is roughly 4 characters or 3/4 of a word.',
    icon: Maximize,
    defaultValue: 1000,
    min: 100,
    max: 2000,
    step: 100,
    formatter: (value) => value.toString()
  }
};

// Default values for easy reference
export const DEFAULT_PARAMETERS = {
  temperature: MODEL_PARAMETERS.temperature.defaultValue,
  topP: MODEL_PARAMETERS.topP.defaultValue,
  maxTokens: MODEL_PARAMETERS.maxTokens.defaultValue
};

// Model type definitions for UI
export interface ModelTypeDefinition {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  requiresAuth: boolean;
}

// Model type definitions
export const MODEL_TYPES: Record<string, ModelTypeDefinition> = {
  cloud: {
    id: 'cloud',
    name: 'CLOUD MODELS',
    description: 'Models running on OpenRouter API servers. Requires authentication.',
    icon: Zap,
    color: 'var(--eva-orange)',
    requiresAuth: true
  },
  
  local: {
    id: 'local',
    name: 'BROWSER MODELS',
    description: 'Models running directly in your browser. No authentication required.',
    icon: Cpu,
    color: 'var(--eva-blue)',
    requiresAuth: false
  }
};