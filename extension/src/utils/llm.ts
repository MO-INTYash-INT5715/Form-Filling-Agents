import * as dotenv from 'dotenv';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';

dotenv.config();

export function getLLMClient() {
  const provider = process.env.LLM_PROVIDER || 'ollama';

  if (provider === 'gemini') {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not set in .env');
    return new GoogleGenerativeAI(apiKey);
  } else if (provider === 'cerebras') {
    const apiKey = process.env.CEREBRAS_API_KEY;
    if (!apiKey) throw new Error('CEREBRAS_API_KEY not set in .env');
    return new OpenAI({
      apiKey,
      baseURL: 'https://api.cerebras.ai/v1',
    });
  } else if (provider === 'openai' || provider === 'custom') {
    return new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
      baseURL: process.env.OPENAI_BASE_URL,
    });
  } else if (provider === 'ollama') {
    return new OpenAI({
      apiKey: 'ollama',
      baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
    });
  } else if (provider === 'bedrock') {
    const config: any = {
      region: process.env.AWS_REGION || 'ap-south-1',
    };
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      config.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      };
      if (process.env.AWS_SESSION_TOKEN) {
        config.credentials.sessionToken = process.env.AWS_SESSION_TOKEN;
      }
    }
    return new BedrockRuntimeClient(config);
  }

  throw new Error(`Unsupported LLM_PROVIDER: ${provider}`);
}

export function getLLMModel(): string {
  return process.env.LLM_MODEL || 'gemini-1.5-flash';
}

export function getLLMProvider(): string {
  return process.env.LLM_PROVIDER || 'ollama';
}
