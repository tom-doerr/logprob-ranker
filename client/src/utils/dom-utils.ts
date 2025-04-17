/**
 * DOM utility functions
 * Provides helper functions for DOM manipulation and event handling
 */

type EventHandler<K extends keyof WindowEventMap> = (this: Window, ev: WindowEventMap[K]) => any;
type DocumentEventHandler<K extends keyof DocumentEventMap> = (this: Document, ev: DocumentEventMap[K]) => any;

/**
 * Add event listener with automatic cleanup
 * Returns a cleanup function that can be called to remove the listener
 */
export function addEventListenerWithCleanup<K extends keyof WindowEventMap>(
  element: Window,
  type: K,
  listener: EventHandler<K>,
  options?: boolean | AddEventListenerOptions
): () => void {
  element.addEventListener(type, listener, options);
  
  // Return cleanup function
  return () => {
    element.removeEventListener(type, listener, options);
  };
}

/**
 * Add document event listener with automatic cleanup
 * Returns a cleanup function that can be called to remove the listener
 */
export function addDocumentEventListenerWithCleanup<K extends keyof DocumentEventMap>(
  element: Document,
  type: K,
  listener: DocumentEventHandler<K>,
  options?: boolean | AddEventListenerOptions
): () => void {
  element.addEventListener(type, listener, options);
  
  // Return cleanup function
  return () => {
    element.removeEventListener(type, listener, options);
  };
}

/**
 * Create element with attributes and children
 */
export function createElement<T extends HTMLElement>(
  tag: string,
  attributes?: Record<string, string>,
  children?: (string | HTMLElement)[]
): T {
  const element = document.createElement(tag) as T;
  
  // Add attributes
  if (attributes) {
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }
  
  // Add children
  if (children) {
    children.forEach(child => {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else {
        element.appendChild(child);
      }
    });
  }
  
  return element;
}

/**
 * Check if an element is visible in viewport
 */
export function isElementInViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

export default {
  addEventListenerWithCleanup,
  addDocumentEventListenerWithCleanup,
  createElement,
  isElementInViewport
};