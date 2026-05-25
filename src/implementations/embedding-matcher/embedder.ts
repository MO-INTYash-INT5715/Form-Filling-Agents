/*
 * Pluggable embedding provider (OpenAI if available, else deterministic local fallback)
 * Lightweight and self-contained so heavy deps are optional.
 */

export type EmbeddingProvider = 'auto' | 'openai' | 'local';

export interface EmbeddingProviderConfig {
  provider?: EmbeddingProvider;
  openaiModel?: string;
  localDim?: number;
}

let providerConfig: EmbeddingProviderConfig = {
  provider: 'auto',
  openaiModel: 'text-embedding-3-small',
  localDim: 16,
};

export function setEmbeddingConfig(cfg: EmbeddingProviderConfig) {
  providerConfig = { ...providerConfig, ...cfg };
}

/**
 * Embed an array of texts.
 * Tries OpenAI (dynamic import) when `OPENAI_API_KEY` is present and provider !== 'local'.
 * Falls back to a deterministic local embedding implementation otherwise.
 */
export async function embedTexts(texts: string[], cfg?: EmbeddingProviderConfig): Promise<number[][]> {
  const config = { ...providerConfig, ...cfg };

  const useOpenAI = config.provider !== 'local' && (config.provider === 'openai' || (config.provider === 'auto' && !!process.env.OPENAI_API_KEY));

  if (useOpenAI) {
    try {
      // Dynamic import so openai is optional at install time
      const OpenAI = (await import('openai')).OpenAI;
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const model = config.openaiModel || 'text-embedding-3-small';
      const resp: any = await client.embeddings.create({ model, input: texts });
      return resp.data.map((d: any) => d.embedding as number[]);
    } catch (err) {
      // Fall through to local embedding on any error
      // (network missing, package missing, API error, etc.)
      // eslint-disable-next-line no-console
      console.warn('[embedder] OpenAI embedding failed; falling back to local embedder.', String(err as any));
    }
  }

  const dim = config.localDim || 16;
  return texts.map(t => deterministicEmbedding(t, dim));
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error('Vectors must have same length');
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb) || 1;
  return dot / denom;
}

function deterministicEmbedding(text: string, dim = 16): number[] {
  const vec = new Array(dim).fill(0);
  for (let i = 0; i < dim; i++) {
    let s = 0;
    for (let j = 0; j < text.length; j++) {
      s += text.charCodeAt(j) * Math.sin((i + 1) * (j + 1));
    }
    vec[i] = s;
  }
  const norm = Math.sqrt(vec.reduce((acc, v) => acc + v * v, 0)) || 1;
  return vec.map(v => v / norm);
}

export default {
  setEmbeddingConfig,
  embedTexts,
  cosineSimilarity,
};
