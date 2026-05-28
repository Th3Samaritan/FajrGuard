import { useRef, useCallback, useState } from 'react';
import { loadFaceEmbedding, cosineSimilarity } from '../services/faceEmbedding';
import { loadFaceNetModel, isTfliteAvailable } from '../services/faceNetModel';

const FACE_MATCH_THRESHOLD_FACENET = 0.85;
const FACE_MATCH_THRESHOLD_FALLBACK = 0.95;

export function useFaceVerification() {
  const [isVerified, setIsVerified] = useState(false);
  const [similarity, setSimilarity] = useState(0);
  const registeredEmbedding = useRef<number[] | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);

  const init = useCallback(async () => {
    const emb = await loadFaceEmbedding();
    registeredEmbedding.current = emb;
    const model = await loadFaceNetModel();
    setUsingFallback(model === null);
    setLoaded(true);
  }, []);

  const verify = useCallback(async (liveEmbedding: number[]): Promise<boolean> => {
    if (!registeredEmbedding.current) {
      await init();
    }
    if (!registeredEmbedding.current) return false;

    if (!isTfliteAvailable() || usingFallback) {
      return false;
    }

    const sim = cosineSimilarity(liveEmbedding, registeredEmbedding.current);
    setSimilarity(sim);

    const matched = sim >= FACE_MATCH_THRESHOLD_FACENET;
    setIsVerified(matched);
    return matched;
  }, [init, usingFallback]);

  const reset = useCallback(() => {
    setIsVerified(false);
    setSimilarity(0);
  }, []);

  return {
    isVerified,
    similarity,
    loaded,
    threshold: usingFallback ? FACE_MATCH_THRESHOLD_FALLBACK : FACE_MATCH_THRESHOLD_FACENET,
    usingFallback,
    init,
    verify,
    reset,
  };
}
