import { useRef, useCallback, useState } from 'react';
import {
  loadFacePacket,
  cosineSimilarity,
  DEFAULT_THRESHOLD,
  MAX_IDENTITY_THRESHOLD,
  FacePacket,
} from '../services/faceEmbedding';
import { loadFaceNetModel, isTfliteAvailable } from '../services/faceNetModel';

export function useFaceVerification() {
  const [isVerified, setIsVerified] = useState(false);
  const [similarity, setSimilarity] = useState(0);
  const packetRef = useRef<FacePacket | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [threshold, setThresholdState] = useState(DEFAULT_THRESHOLD);

  const init = useCallback(async () => {
    const packet = await loadFacePacket();
    if (packet) {
      // Cap at read time: packets enrolled before the burst-similarity fix
      // stored unreachable thresholds (clamped at 0.85).
      packet.threshold = Math.min(packet.threshold, MAX_IDENTITY_THRESHOLD);
      setThresholdState(packet.threshold);
    }
    packetRef.current = packet;
    const model = await loadFaceNetModel();
    setUsingFallback(model === null);
    setLoaded(true);
  }, []);

  const verify = useCallback(async (liveEmbedding: number[]): Promise<boolean> => {
    if (!packetRef.current) {
      await init();
    }
    const packet = packetRef.current;
    if (!packet) return false;

    if (!isTfliteAvailable() || usingFallback) {
      return false;
    }

    const sim = cosineSimilarity(liveEmbedding, packet.embedding);
    setSimilarity(sim);

    const matched = sim >= packet.threshold;
    console.log(`[identity] sim=${sim.toFixed(3)} threshold=${packet.threshold.toFixed(3)} matched=${matched}`);
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
    threshold,
    usingFallback,
    init,
    verify,
    reset,
  };
}
