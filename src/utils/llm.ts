import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

export function getLLMClient() {
  const provider = process.env.LLM_PROVIDER || 'ollama';

  if (provider === 'openai' || provider === 'custom') {
    return new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
      baseURL: process.env.OPENAI_BASE_URL, // optional
    });
  } else if (provider === 'ollama') {
    // Ollama supports OpenAI SDK compatibility
    return new OpenAI({
      apiKey: 'ollama', // Ollama doesn't require a real API key
      baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
    });
  }

  throw new Error(`Unsupported LLM_PROVIDER: ${provider}`);
}

export function getLLMModel(): string {
  return process.env.LLM_MODEL || 'gemma3:12b';
}
