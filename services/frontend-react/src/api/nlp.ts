const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface NLPIntent {
  action: string;
  confidence: number;
  parameters: Record<string, any>;
  clarification?: string;
}

export interface NLPCommandRequest {
  command: string;
  stateId?: string;
  currentState?: any;
}

export interface NLPCommandResponse {
  success: boolean;
  intent: NLPIntent;
  message?: string;
  state?: any;
}

export async function sendNLPCommand(request: NLPCommandRequest): Promise<NLPCommandResponse> {
  const response = await fetch(`${API_URL}/api/nlp/command`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Failed to process command: ${response.statusText}`);
  }

  return response.json();
}
