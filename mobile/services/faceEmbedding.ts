import { db } from '../db';
import { settings } from '../db/schema';
import { eq } from 'drizzle-orm';

const EMBEDDING_KEY = 'face_embedding_v1';

export async function saveFaceEmbedding(embedding: number[]): Promise<void> {
  const json = JSON.stringify(embedding);
  await db.insert(settings).values({ key: EMBEDDING_KEY, value: json })
    .onConflictDoUpdate({ target: settings.key, set: { value: json } });
}

export async function loadFaceEmbedding(): Promise<number[] | null> {
  const result = await db.select().from(settings).where(eq(settings.key, EMBEDDING_KEY)).limit(1);
  if (!result[0]?.value) return null;
  try {
    return JSON.parse(result[0].value) as number[];
  } catch {
    return null;
  }
}

export async function clearFaceEmbedding(): Promise<void> {
  await db.delete(settings).where(eq(settings.key, EMBEDDING_KEY));
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;
  return dotProduct / denom;
}
