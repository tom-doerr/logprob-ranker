/**
 * Hook for form persistence across page reloads
 * This hook integrates with react-hook-form to provide automatic persistence
 * of form values, which survives HMR reloads during development
 */

import { useEffect } from 'react';
import { useForm, UseFormProps, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { loadFormState, saveFormState } from '../utils/form-persistence';

// Configuration options for the hook
interface PersistentFormOptions<T extends z.ZodType<any, any>> {
  // Unique form identifier
  formId: string;
  
  // Zod schema for validation
  schema?: T;
  
  // Default form values
  defaultValues?: z.infer<T>;
  
  // Fields to exclude from persistence (e.g., passwords)
  excludeFields?: string[];
  
  // Whether to encrypt persisted data
  encrypt?: boolean;
  
  // How long to persist data (ms)
  expiry?: number;
  
  // Additional react-hook-form options
  formOptions?: Omit<UseFormProps<z.infer<T>>, 'resolver' | 'defaultValues'>;
}

/**
 * Custom hook for creating forms with persistence across reloads
 */
export function usePersistentForm<T extends z.ZodType<any, any>>(
  options: PersistentFormOptions<T>
): UseFormReturn<z.infer<T>> {
  const {
    formId,
    schema,
    defaultValues,
    excludeFields = [],
    encrypt = false,
    expiry = 3600000, // 1 hour default
    formOptions = {}
  } = options;

  // Load any previously saved form data
  const savedData = loadFormState<z.infer<T>>({
    formId,
    encrypt,
    expiry,
    excludeFields
  });

  // Create the form with react-hook-form
  const form = useForm<z.infer<T>>({
    ...formOptions,
    resolver: schema ? zodResolver(schema) : undefined,
    // Use saved values or defaults
    defaultValues: savedData || defaultValues
  });

  // Save form values whenever they change
  useEffect(() => {
    const subscription = form.watch((values) => {
      saveFormState(values as Record<string, any>, {
        formId,
        encrypt,
        expiry,
        excludeFields
      });
    });

    return () => subscription.unsubscribe();
  }, [form, formId, encrypt, expiry, excludeFields]);

  return form;
}

/**
 * Simplified usage example:
 * 
 * const loginSchema = z.object({
 *   email: z.string().email(),
 *   password: z.string().min(8),
 *   rememberMe: z.boolean().default(false)
 * });
 * 
 * function LoginForm() {
 *   const form = usePersistentForm({
 *     formId: 'login-form',
 *     schema: loginSchema,
 *     defaultValues: { email: '', password: '', rememberMe: false },
 *     excludeFields: ['password']  // Don't persist passwords
 *   });
 * 
 *   const onSubmit = form.handleSubmit((data) => {
 *     // Handle form submission
 *   });
 * 
 *   return (
 *     <form onSubmit={onSubmit}>
 *       <input {...form.register('email')} />
 *       <input type="password" {...form.register('password')} />
 *       <input type="checkbox" {...form.register('rememberMe')} />
 *       <button type="submit">Login</button>
 *     </form>
 *   );
 * }
 */