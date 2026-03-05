import { getOpenAI } from "./provider";

const EMBEDDING_MODEL = "text-embedding-3-small";

/**
 * Chunk text for RAG: ~512 chars with 64 char overlap to keep context.
 */
export function chunkText(text: string, maxChunkSize = 512, overlap = 64): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const chunks: string[] = [];
  let start = 0;

  while (start < trimmed.length) {
    let end = start + maxChunkSize;
    if (end < trimmed.length) {
      const nextSpace = trimmed.lastIndexOf(" ", end);
      if (nextSpace > start) end = nextSpace + 1;
    }
    const chunk = trimmed.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    start = end - overlap;
    if (start < 0) start = end;
  }

  return chunks;
}

/**
 * Get embedding vector for a single text (OpenAI).
 */
export async function embedText(text: string): Promise<number[]> {
  const openai = getOpenAI();
  const res = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.slice(0, 8000),
  });
  const vec = res.data[0]?.embedding;
  if (!vec || !Array.isArray(vec)) throw new Error("No embedding returned");
  return vec;
}

/**
 * Cosine similarity between two vectors (same length).
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export type ChunkWithEmbedding = { id: string; content: string; embedding: number[] };

/**
 * Rank chunks by similarity to query embedding; return top-k contents.
 */
export function rankChunks(
  chunks: ChunkWithEmbedding[],
  queryEmbedding: number[],
  topK: number
): string[] {
  const withScore = chunks
    .filter((c) => c.embedding && Array.isArray(c.embedding))
    .map((c) => ({ content: c.content, score: cosineSimilarity(c.embedding, queryEmbedding) }));
  withScore.sort((a, b) => b.score - a.score);
  return withScore.slice(0, topK).map((x) => x.content);
}

/**
 * RAG retrieval: embed query, fetch chunks with embeddings for site, return top-k contents.
 * If no chunks have embeddings, returns empty (caller should fall back to non-RAG).
 */
export async function getRelevantChunks(
  siteId: string,
  query: string,
  topK: number
): Promise<string[]> {
  const { prisma } = await import("@/lib/prisma");
  const chunks = await prisma.knowledgeChunk.findMany({
    where: { siteId, embedding: { not: null } },
    select: { id: true, content: true, embedding: true },
  });
  if (chunks.length === 0) return [];

  const queryEmbedding = await embedText(query);
  const withEmbedding: ChunkWithEmbedding[] = chunks
    .filter((c) => c.embedding && Array.isArray(c.embedding))
    .map((c) => ({ id: c.id, content: c.content, embedding: c.embedding as number[] }));
  return rankChunks(withEmbedding, queryEmbedding, topK);
}
