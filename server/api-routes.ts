import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';

// Initialize router
const router = Router();

// Proxy chat completions endpoint
router.post('/chat/completions', async (req: Request, res: Response) => {
  try {
    // Get environment API key
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      return res.status(401).json({ 
        error: 'API key is required but not configured in environment variables' 
      });
    }
    
    console.log('Proxying request to OpenRouter API with environment API key');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    // Forward the request to OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': Array.isArray(req.headers.referer) ? req.headers.referer[0] : (req.headers.referer || 'https://repl.it'),
        'X-Title': Array.isArray(req.headers['x-title']) ? req.headers['x-title'][0] : (req.headers['x-title'] || 'NERV AI Interface')
      },
      body: JSON.stringify(req.body)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenRouter API returned error: ${response.status}`, errorText);
      
      return res.status(response.status).json({
        error: `OpenRouter API returned ${response.status}`,
        details: errorText
      });
    }
    
    const data = await response.json();
    return res.json(data);
  } catch (error) {
    console.error('Error in chat completions proxy:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Proxy models endpoint
router.get('/models', async (req: Request, res: Response) => {
  try {
    // Get environment API key
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      return res.status(401).json({ 
        error: 'API key is required but not configured in environment variables' 
      });
    }
    
    console.log('Proxying models request to OpenRouter API');
    
    // Forward the request to OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': Array.isArray(req.headers.referer) ? req.headers.referer[0] : (req.headers.referer || 'https://repl.it'),
        'X-Title': Array.isArray(req.headers['x-title']) ? req.headers['x-title'][0] : (req.headers['x-title'] || 'NERV AI Interface')
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenRouter API returned error: ${response.status}`, errorText);
      
      return res.status(response.status).json({
        error: `OpenRouter API returned ${response.status}`,
        details: errorText
      });
    }
    
    const data = await response.json();
    return res.json(data);
  } catch (error) {
    console.error('Error in models proxy:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Export the router
export default router;