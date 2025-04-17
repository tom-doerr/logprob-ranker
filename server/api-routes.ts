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

// Diagnostic endpoint to check API key configuration
router.get('/status', async (req: Request, res: Response) => {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      return res.status(200).json({
        status: 'error',
        message: 'API key not configured in environment variables',
        keyExists: false,
        keyMasked: null
      });
    }
    
    // Mask most of the key for security
    const maskedKey = apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 4);
    
    // Test the key with a simple request
    try {
      console.log('Testing API key with models endpoint...');
      
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://repl.it',
          'X-Title': 'NERV AI Interface - Diagnostic Test'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API key test failed:', errorText);
        
        return res.status(200).json({
          status: 'error',
          message: `API key test failed: ${response.status} ${response.statusText}`,
          keyExists: true,
          keyMasked: maskedKey,
          error: errorText
        });
      }
      
      // Type explicitly as any to handle OpenRouter API response format
      const data: any = await response.json();
      
      // Extract model information safely
      const modelData = data && typeof data === 'object' && data.data && Array.isArray(data.data) ? data.data : [];
      const modelCount = modelData.length;
      
      // Extract first 3 model IDs for quick display
      const modelIds = modelData.slice(0, 3).map((model: any) => model?.id || 'unknown').filter(Boolean);
      
      return res.status(200).json({
        status: 'success',
        message: 'API key configured and working',
        keyExists: true,
        keyMasked: maskedKey,
        modelCount,
        models: modelIds
      });
    } catch (apiError) {
      console.error('Error testing API key:', apiError);
      
      return res.status(200).json({
        status: 'error',
        message: 'API key testing failed with error',
        keyExists: true,
        keyMasked: maskedKey,
        error: apiError instanceof Error ? apiError.message : String(apiError)
      });
    }
  } catch (error) {
    console.error('Status check error:', error);
    
    return res.status(500).json({
      status: 'error',
      message: 'Failed to check API key status',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Export the router
export default router;