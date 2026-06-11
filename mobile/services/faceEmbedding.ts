import * as SecureStore from 'expo-secure-store';
import { db } from '../db';
import { settings } from '../db/schema';
import { eq } from 'drizzle-orm';
import { WetnessMetrics } from './wetnessMetrics';

const EMBEDDING_KEY = 'face_embedding_v1';
const PACKET_KEY = 'face_packet_v2';

export const DEFAULT_THRESHOLD = 0.55;
// -3: wetness metrics recomputed over the face oval only; old baselines
// are not comparable, so older packets must re-enroll
export const CURRENT_MODEL_VERSION = 'mobilefacenet-3';

export interface FacePacket {
  embedding: number[];
  threshold: number;
  modelVersion: string;
  createdAt: number;
  dryBaseline?: WetnessMetrics;
}

function isAvailable(): boolean {
  return typeof (SecureStore as any).setItemAsync === 'function';
}

async function readPacket(): Promise<FacePacket | null> {
  if (!isAvailable()) return null;
  try {
    const json = await SecureStore.getItemAsync(PACKET_KEY);
    if (!json) return null;
    return JSON.parse(json) as FacePacket;
  } catch {
    return null;
  }
}

async function writePacket(packet: FacePacket): Promise<void> {
  if (!isAvailable()) return;
  await SecureStore.setItemAsync(PACKET_KEY, JSON.stringify(packet));
}

async function migrateLegacyEmbedding(): Promise<FacePacket | null> {
  let raw: string | null = null;
  if (isAvailable()) {
    try { raw = await SecureStore.getItemAsync(EMBEDDING_KEY); } catch {}
  }
  if (!raw) {
    try {
      const row = await db.select().from(settings).where(eq(settings.key, EMBEDDING_KEY)).limit(1);
      raw = row[0]?.value ?? null;
      if (raw) {
        await db.delete(settings).where(eq(settings.key, EMBEDDING_KEY));
      }
    } catch {
      raw = null;
    }
  }
  if (!raw) return null;

  try {
    const embedding = JSON.parse(raw) as number[];
    const packet: FacePacket = {
      embedding,
      threshold: DEFAULT_THRESHOLD,
      modelVersion: 'legacy',
      createdAt: Date.now(),
    };
    if (isAvailable()) {
      try { await SecureStore.deleteItemAsync(EMBEDDING_KEY); } catch {}
    }
    return packet;
  } catch {
    return null;
  }
}

export async function saveFaceEmbedding(
  embedding: number[],
  threshold = DEFAULT_THRESHOLD,
  dryBaseline?: WetnessMetrics,
): Promise<void> {
  const packet: FacePacket = {
    embedding,
    threshold,
    modelVersion: CURRENT_MODEL_VERSION,
    createdAt: Date.now(),
    dryBaseline,
  };
  if (isAvailable()) {
    await writePacket(packet);
    return;
  }
  await db.insert(settings).values({ key: PACKET_KEY, value: JSON.stringify(packet) })
    .onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(packet) } });
}

export async function loadFacePacket(): Promise<FacePacket | null> {
  const existing = await readPacket();
  if (existing) {
    if (existing.modelVersion !== CURRENT_MODEL_VERSION) {
      console.log(`[faceEmbedding] model version mismatch (stored=${existing.modelVersion}, current=${CURRENT_MODEL_VERSION}) — clearing for re-enrollment`);
      await clearFaceEmbedding();
      return null;
    }
    return existing;
  }
  const migrated = await migrateLegacyEmbedding();
  if (migrated && migrated.modelVersion !== CURRENT_MODEL_VERSION) {
    await clearFaceEmbedding();
    return null;
  }
  if (migrated) await writePacket(migrated);
  return migrated;
}

export async function loadFaceEmbedding(): Promise<number[] | null> {
  const packet = await loadFacePacket();
  return packet?.embedding ?? null;
}

export async function clearFaceEmbedding(): Promise<void> {
  if (isAvailable()) {
    try { await SecureStore.deleteItemAsync(EMBEDDING_KEY); } catch {}
    try { await SecureStore.deleteItemAsync(PACKET_KEY); } catch {}
  }
  try {
    await db.delete(settings).where(eq(settings.key, EMBEDDING_KEY));
    await db.delete(settings).where(eq(settings.key, PACKET_KEY));
  } catch {}
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

export function computePerUserThreshold(embeddings: number[][]): number {
  if (embeddings.length < 2) return DEFAULT_THRESHOLD;
  let minSim = 1;
  for (let i = 0; i < embeddings.length; i++) {
    for (let j = i + 1; j < embeddings.length; j++) {
      const sim = cosineSimilarity(embeddings[i], embeddings[j]);
      if (sim < minSim) minSim = sim;
    }
  }
  const threshold = minSim - 0.05;
  return Math.max(0.45, Math.min(0.85, threshold));
}
