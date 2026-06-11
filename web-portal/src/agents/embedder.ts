/**
 * Lightweight embedding utility with local fallback
 * Ported from extension/src/implementations/embedding-matcher/embedder.ts
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
  localDim: 32, // Increased from 16 for better accuracy
};

export function setEmbeddingConfig(cfg: EmbeddingProviderConfig) {
  providerConfig = { ...providerConfig, ...cfg };
}

/**
 * Embed texts using OpenAI (if available) or local deterministic embedder
 */
export async function embedTexts(
  texts: string[],
  cfg?: EmbeddingProviderConfig
): Promise<number[][]> {
  const config = { ...providerConfig, ...cfg };

  const useOpenAI =
    config.provider !== 'local' &&
    (config.provider === 'openai' ||
      (config.provider === 'auto' && !!process.env.OPENAI_API_KEY));

  if (useOpenAI) {
    try {
      const OpenAI = (await import('openai')).default;
      const clientOpts: Record<string, string> = { apiKey: process.env.OPENAI_API_KEY! };
      if (process.env.OPENAI_BASE_URL) clientOpts.baseURL = process.env.OPENAI_BASE_URL;
      const client = new OpenAI(clientOpts);
      const model = config.openaiModel || process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
      const resp: any = await client.embeddings.create({ model, input: texts });
      return resp.data.map((d: any) => d.embedding as number[]);
    } catch (err) {
      console.warn(
        '[embedder] OpenAI embedding failed; falling back to local',
        String(err)
      );
    }
  }

  const dim = config.localDim || 32;
  return texts.map((t) => deterministicEmbedding(t, dim));
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error('Vectors must have same length');
  let dot = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb) || 1;
  return dot / denom;
}

/**
 * Deterministic local embedding (trigonometric character hashing)
 * No external dependencies, works offline
 */
function deterministicEmbedding(text: string, dim = 32): number[] {
  const normalized = text.toLowerCase().trim();
  const vec = new Array(dim).fill(0);

  for (let i = 0; i < dim; i++) {
    let s = 0;
    for (let j = 0; j < normalized.length; j++) {
      const char = normalized.charCodeAt(j);
      // Multi-frequency mixing for better separation
      s += char * Math.sin((i + 1) * (j + 1) * 0.1);
      s += char * Math.cos((i + 1) * (j + 1) * 0.13);
    }
    vec[i] = s;
  }

  // L2 normalization
  const norm = Math.sqrt(vec.reduce((acc, v) => acc + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}
