import { nimKeys } from "./nim";

export const EMBEDDING_MODEL = "nvidia/nv-embedqa-e5-v5";
const EMBED_URL = "https://integrate.api.nvidia.com/v1/embeddings";

export async function getNvidiaEmbedding(input: string | string[]): Promise<number[][] | null> {
  const keys = nimKeys();
  if (!keys.length) return null;
  
  const texts = Array.isArray(input) ? input : [input];
  if (texts.length === 0) return [];

  // Try each key for rate limiting fallback
  for (const key of keys) {
    try {
      const r = await fetch(EMBED_URL, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${key}`, 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({
          input: texts,
          model: EMBEDDING_MODEL,
          input_type: "query",
          encoding_format: "float",
          truncate: "NONE"
        }),
      });

      if (r.status === 429) continue; // rate-limited -> try next key

      if (!r.ok) {
        console.error(`Embed API error: ${r.status} ${r.statusText}`);
        return null;
      }

      const d = await r.json();
      if (!d?.data || !Array.isArray(d.data)) return null;

      // Sort results by index to ensure order matches input
      const sortedData = [...d.data].sort((a, b) => a.index - b.index);
      return sortedData.map(item => item.embedding);
    } catch (e) {
      console.error("Embedding request failed", e);
    }
  }

  return null;
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
