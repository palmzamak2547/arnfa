/**
 * recommender.ts — Content-Based Filtering using TF-IDF and Cosine / Jaccard Similarity.
 * Inspired by the standard ML approach for travel recommendations.
 */

export function tokenize(text: string): string[] {
  // Simple tokenization for categories, vibes, and Thai keywords
  return text
    .toLowerCase()
    .replace(/[^\u0E00-\u0E7Fa-z0-9]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 0);
}

export function computeTermFrequencies(tokens: string[]): Record<string, number> {
  const tf: Record<string, number> = {};
  for (const t of tokens) tf[t] = (tf[t] || 0) + 1;
  const total = tokens.length;
  for (const t in tf) tf[t] = tf[t] / total; // normalize
  return tf;
}

export class TfIdfRecommender {
  private idf: Record<string, number> = {};
  private documentTfs: Array<{ id: string; tf: Record<string, number> }> = [];
  private numDocs = 0;

  addDocument(id: string, text: string) {
    const tokens = tokenize(text);
    if (tokens.length === 0) return;
    
    const tf = computeTermFrequencies(tokens);
    this.documentTfs.push({ id, tf });
    this.numDocs++;

    // Track document frequency for IDF
    const uniqueTokens = new Set(tokens);
    for (const t of uniqueTokens) {
      this.idf[t] = (this.idf[t] || 0) + 1;
    }
  }

  build() {
    // Calculate IDF: log(N / df)
    for (const t in this.idf) {
      this.idf[t] = Math.log(this.numDocs / (1 + this.idf[t])) + 1; 
    }
  }

  private getVector(tf: Record<string, number>): Record<string, number> {
    const vec: Record<string, number> = {};
    for (const t in tf) {
      if (this.idf[t]) {
        vec[t] = tf[t] * this.idf[t];
      }
    }
    return vec;
  }

  recommend(query: string, topK: number = 10): Array<{ id: string; score: number }> {
    const queryTokens = tokenize(query);
    const queryTf = computeTermFrequencies(queryTokens);
    const queryVec = this.getVector(queryTf);

    const scores = this.documentTfs.map(doc => {
      const docVec = this.getVector(doc.tf);
      return { id: doc.id, score: cosineSimilarityMap(queryVec, docVec) };
    });

    return scores.sort((a, b) => b.score - a.score).slice(0, topK);
  }
}

function cosineSimilarityMap(vecA: Record<string, number>, vecB: Record<string, number>): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const t in vecA) {
    normA += vecA[t] * vecA[t];
    if (vecB[t]) dotProduct += vecA[t] * vecB[t];
  }
  for (const t in vecB) {
    normB += vecB[t] * vecB[t];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Jaccard similarity fallback for sets of tags
export function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 1;
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}
