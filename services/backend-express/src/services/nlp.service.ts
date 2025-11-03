import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
  // apiKey: "Your OpenAI key here"
}) : null;

export interface Intent {
  action: 'add_door' | 'remove_door' | 'change_material' | 'modify_grid' | 'add_shelf' | 'remove_shelf' | 'add_column' | 'remove_column' | 'set_dimensions' | 'unknown';
  confidence: number;
  parameters: {
    count?: number;
    material?: string;
    width?: number;
    height?: number;
    depth?: number;
  };
  clarification?: string;
}

const SYSTEM_PROMPT = `You are an AI assistant for a wardrobe configurator. Parse user commands into structured actions.

Available actions:
- add_door: Add doors to the wardrobe (optional count parameter, defaults to 1)
- remove_door: Remove doors from the wardrobe (optional count parameter, defaults to 1)
- change_material: Change wardrobe material (requires material name)
- modify_grid: Change wardrobe dimensions (requires width, height, or depth)
- add_shelf: Add shelves to the wardrobe (optional count parameter, defaults to 1)
- remove_shelf: Remove shelves from the wardrobe (optional count parameter, defaults to 1)
- add_column: Add columns to the wardrobe (optional count parameter, defaults to 1)
- remove_column: Remove columns from the wardrobe (optional count parameter, defaults to 1)
- set_dimensions: Set specific dimensions (requires width/height/depth in cm)

Materials available: oak, walnut, pine, birch, cherry

Respond ONLY with valid JSON in this exact format:
{
  "action": "action_name",
  "confidence": 0.0-1.0,
  "parameters": {},
  "clarification": "optional message if confidence < 0.7"
}

Examples:
- "add a door" → {"action": "add_door", "confidence": 0.95, "parameters": {"count": 1}}
- "add 2 doors" → {"action": "add_door", "confidence": 0.95, "parameters": {"count": 2}}
- "remove door" → {"action": "remove_door", "confidence": 0.95, "parameters": {"count": 1}}
- "delete door" → {"action": "remove_door", "confidence": 0.95, "parameters": {"count": 1}}
- "change material to oak" → {"action": "change_material", "confidence": 0.98, "parameters": {"material": "oak"}}
- "make it 200cm wide" → {"action": "set_dimensions", "confidence": 0.92, "parameters": {"width": 200}}
- "add a shelf" → {"action": "add_shelf", "confidence": 0.95, "parameters": {"count": 1}}
- "add 3 shelves" → {"action": "add_shelf", "confidence": 0.95, "parameters": {"count": 3}}
- "add a column" → {"action": "add_column", "confidence": 0.95, "parameters": {"count": 1}}
- "remove column" → {"action": "remove_column", "confidence": 0.95, "parameters": {"count": 1}}

If unclear, set confidence < 0.7 and provide clarification.`;

export async function parseIntent(userCommand: string): Promise<Intent> {
  if (!openai) {
    console.warn('OpenAI API key not configured, using fallback parser');
    return fallbackParser(userCommand);
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userCommand }
      ],
      temperature: 0.3,
      max_tokens: 200
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from LLM');
    }

    const parsed = JSON.parse(content) as Intent;

    if (parsed.confidence < 0.7 && !parsed.clarification) {
      parsed.clarification = 'I\'m not confident I understood that correctly. Could you rephrase?';
    }

    return parsed;
  } catch (error) {
    console.error('Intent parsing error:', error);
    return fallbackParser(userCommand);
  }
}

function fallbackParser(command: string): Intent {
  const lower = command.toLowerCase();

  // Match "add X door(s)"
  if (lower.includes('add') && lower.includes('door')) {
    const countMatch = lower.match(/\d+/);
    return {
      action: 'add_door',
      confidence: 0.85,
      parameters: { count: countMatch ? parseInt(countMatch[0]) : 1 }
    };
  }

  // Match "remove/delete X door(s)"
  if ((lower.includes('remove') || lower.includes('delete')) && lower.includes('door')) {
    const countMatch = lower.match(/\d+/);
    return {
      action: 'remove_door',
      confidence: 0.85,
      parameters: { count: countMatch ? parseInt(countMatch[0]) : 1 }
    };
  }

  // Match "add X shelf/shelves"
  if (lower.includes('add') && (lower.includes('shelf') || lower.includes('shelves'))) {
    const countMatch = lower.match(/\d+/);
    return {
      action: 'add_shelf',
      confidence: 0.85,
      parameters: { count: countMatch ? parseInt(countMatch[0]) : 1 }
    };
  }

  // Match "remove X shelf/shelves"
  if ((lower.includes('remove') || lower.includes('delete')) && (lower.includes('shelf') || lower.includes('shelves'))) {
    const countMatch = lower.match(/\d+/);
    return {
      action: 'remove_shelf',
      confidence: 0.85,
      parameters: { count: countMatch ? parseInt(countMatch[0]) : 1 }
    };
  }

  // Match "add X column(s)"
  if (lower.includes('add') && lower.includes('column')) {
    const countMatch = lower.match(/\d+/);
    return {
      action: 'add_column',
      confidence: 0.85,
      parameters: { count: countMatch ? parseInt(countMatch[0]) : 1 }
    };
  }

  // Match "remove/delete X column(s)"
  if ((lower.includes('remove') || lower.includes('delete')) && lower.includes('column')) {
    const countMatch = lower.match(/\d+/);
    return {
      action: 'remove_column',
      confidence: 0.85,
      parameters: { count: countMatch ? parseInt(countMatch[0]) : 1 }
    };
  }

  // Match "change material to X" or "material X"
  if (lower.includes('material') || lower.includes('wood')) {
    const materials = ['oak', 'walnut', 'pine', 'birch', 'cherry'];
    for (const material of materials) {
      if (lower.includes(material)) {
        return {
          action: 'change_material',
          confidence: 0.9,
          parameters: { material }
        };
      }
    }
  }

  // Match dimensions: "200cm wide", "2.5m tall", etc.
  if (lower.includes('wide') || lower.includes('width')) {
    const match = lower.match(/(\d+(?:\.\d+)?)\s*(cm|m)/);
    if (match && match[1] && match[2]) {
      const value = parseFloat(match[1]);
      const width = match[2] === 'm' ? value * 100 : value;
      return {
        action: 'set_dimensions',
        confidence: 0.88,
        parameters: { width }
      };
    }
  }

  if (lower.includes('tall') || lower.includes('height')) {
    const match = lower.match(/(\d+(?:\.\d+)?)\s*(cm|m)/);
    if (match && match[1] && match[2]) {
      const value = parseFloat(match[1]);
      const height = match[2] === 'm' ? value * 100 : value;
      return {
        action: 'set_dimensions',
        confidence: 0.88,
        parameters: { height }
      };
    }
  }

  if (lower.includes('deep') || lower.includes('depth')) {
    const match = lower.match(/(\d+(?:\.\d+)?)\s*(cm|m)/);
    if (match && match[1] && match[2]) {
      const value = parseFloat(match[1]);
      const depth = match[2] === 'm' ? value * 100 : value;
      return {
        action: 'set_dimensions',
        confidence: 0.88,
        parameters: { depth }
      };
    }
  }

  return {
    action: 'unknown',
    confidence: 0,
    parameters: {},
    clarification: 'I couldn\'t understand that command. Try: "add a door", "remove door", "add 3 shelves", "add a column", "remove column", "make it 200cm wide", "change material to oak"'
  };
}

export function validateIntent(intent: Intent): { valid: boolean; error?: string } {
  if (intent.confidence < 0.5) {
    return { valid: false, error: 'Confidence too low' };
  }

  switch (intent.action) {
    case 'add_door':
    case 'remove_door':
    case 'add_shelf':
    case 'remove_shelf':
    case 'add_column':
    case 'remove_column':
      if (intent.parameters.count !== undefined && intent.parameters.count < 1) {
        return { valid: false, error: 'Count must be at least 1' };
      }
      break;

    case 'change_material':
      if (!intent.parameters.material) {
        return { valid: false, error: 'Material name required' };
      }
      const validMaterials = ['oak', 'walnut', 'pine', 'birch', 'cherry'];
      if (!validMaterials.includes(intent.parameters.material.toLowerCase())) {
        return { valid: false, error: `Material must be one of: ${validMaterials.join(', ')}` };
      }
      break;

    case 'set_dimensions':
    case 'modify_grid':
      const { width, height, depth } = intent.parameters;
      if (!width && !height && !depth) {
        return { valid: false, error: 'At least one dimension required' };
      }
      if (width && (width < 100 || width > 400)) {
        return { valid: false, error: 'Width must be 100-400cm' };
      }
      if (height && (height < 150 || height > 300)) {
        return { valid: false, error: 'Height must be 150-300cm' };
      }
      if (depth && (depth < 40 || depth > 80)) {
        return { valid: false, error: 'Depth must be 40-80cm' };
      }
      break;

    case 'unknown':
      return { valid: false, error: 'Unknown action' };
  }

  return { valid: true };
}
