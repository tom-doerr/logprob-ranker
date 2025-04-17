import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name from the import.meta.url (ESM replacement for __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Middleware to replace placeholders in JavaScript files
 * with environment variables
 */
export function injectEnvironmentVariables(req: Request, res: Response, next: NextFunction) {
  // Only process requests for environment.js
  if (req.path !== '/environment.js') {
    return next();
  }

  try {
    // Read the template file
    const filePath = path.join(__dirname, '../client/public/environment.js');
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace all placeholders in the format {{ENV_VAR}} with actual environment variables
    content = content.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
      return process.env[varName] || '';
    });

    // Send the processed file
    res.type('application/javascript');
    res.send(content);
  } catch (error) {
    console.error('Error injecting environment variables:', error);
    next(error);
  }
}