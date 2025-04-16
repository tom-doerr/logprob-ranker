/**
 * Simplified state management with actions and reducers
 * This provides unidirectional data flow similar to Redux but lighter weight
 */

import { useReducer, useCallback } from 'react';

// Define action types as string literals for type safety
export type ActionType = 
  | 'SET_MODEL' 
  | 'SET_BROWSER_MODE' 
  | 'UPDATE_PARAMETERS'
  | 'RESET_PARAMETERS'
  | 'SET_AUTH'
  | 'CLEAR_AUTH'
  | 'SET_THEME'
  | 'SET_UI_MODE';

// Generic action interface
export interface Action<T = any> {
  type: ActionType;
  payload?: T;
}

/**
 * Creates a hook with type-safe dispatch and state
 */
export function createStateManager<State, A extends Action>(
  reducer: (state: State, action: A) => State,
  initialState: State
) {
  // Return a hook that components can use
  return () => {
    const [state, dispatch] = useReducer(reducer, initialState);
    
    // Create typed action creators
    const createAction = useCallback(
      <T>(type: A['type'], payload?: T) => dispatch({ type, payload } as A),
      [dispatch]
    );
    
    return {
      state,
      dispatch,
      createAction
    };
  };
}

/**
 * Example usage for model state:
 * 
 * // Define state type
 * interface ModelState {
 *   selectedModel: string;
 *   isBrowserMode: boolean;
 *   parameters: {
 *     temperature: number;
 *     topP: number;
 *     maxTokens: number;
 *   };
 * }
 * 
 * // Define action types
 * type ModelAction = 
 *   | { type: 'SET_MODEL', payload: string }
 *   | { type: 'SET_BROWSER_MODE', payload: boolean }
 *   | { type: 'UPDATE_PARAMETERS', payload: Partial<ModelState['parameters']> }
 *   | { type: 'RESET_PARAMETERS' };
 * 
 * // Create reducer
 * function modelReducer(state: ModelState, action: ModelAction): ModelState {
 *   switch (action.type) {
 *     case 'SET_MODEL':
 *       return { ...state, selectedModel: action.payload };
 *     case 'SET_BROWSER_MODE':
 *       return { ...state, isBrowserMode: action.payload };
 *     case 'UPDATE_PARAMETERS':
 *       return { 
 *         ...state, 
 *         parameters: { ...state.parameters, ...action.payload } 
 *       };
 *     case 'RESET_PARAMETERS':
 *       return { 
 *         ...state, 
 *         parameters: { temperature: 0.7, topP: 0.9, maxTokens: 1000 } 
 *       };
 *     default:
 *       return state;
 *   }
 * }
 * 
 * // Create the hook
 * export const useModelState = createStateManager(
 *   modelReducer,
 *   {
 *     selectedModel: '',
 *     isBrowserMode: false,
 *     parameters: {
 *       temperature: 0.7,
 *       topP: 0.9,
 *       maxTokens: 1000
 *     }
 *   }
 * );
 * 
 * // Usage in component:
 * const { state, createAction } = useModelState();
 * 
 * // Update state with action
 * createAction('SET_MODEL', 'gpt-4');
 * createAction('UPDATE_PARAMETERS', { temperature: 0.8 });
 */