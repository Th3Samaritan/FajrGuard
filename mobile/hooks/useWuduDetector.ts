import { useRef, useCallback, useState } from 'react';
import { FaceBounds } from '../services/faceDetector';
import { cropAndDecode } from '../services/imageDecode';
import {
  computeWetnessMetrics,
  scoreWetness,
  FALLBACK_DRY_BASELINE,
  LOW_LIGHT_HARD,
  LOW_LIGHT_SOFT,
  WetnessMetrics,
} from '../services/wetnessMetrics';

interface WuduResult {
  isVerified: boolean;
  confidence: number;
  stage: 'identity' | 'wetness' | 'done';
  lowLight?: boolean;
}

const DEFAULT_THRESHOLD = 0.82;
const HOLD_DURATION_MS = 2500;
const INFERENCE_FPS = 5;
const CROP_SIZE = 224;

export function useWuduDetector(threshold: number = DEFAULT_THRESHOLD) {
  const [confidence, setConfidence] = useState(0);
  const [lowLight, setLowLight] = useState(false);
  const [lastMetrics, setLastMetrics] = useState<WetnessMetrics | null>(null);
  const holdStartRef = useRef<number | null>(null);
  const lastFrameTime = useRef(0);
  const confidenceRef = useRef(0);
  const faceBoundsRef = useRef<FaceBounds | null>(null);
  const dryBaselineRef = useRef<WetnessMetrics>(FALLBACK_DRY_BASELINE);
  const inflightRef = useRef(false);

  const setDryBaseline = useCallback((baseline: WetnessMetrics | null | undefined) => {
    dryBaselineRef.current = baseline ?? FALLBACK_DRY_BASELINE;
  }, []);

  const processFrame = useCallback(
    async (photoUri: string, photoWidth: number, photoHeight: number): Promise<WuduResult> => {
      const now = Date.now();
      const fpsInterval = 1000 / INFERENCE_FPS;
      if (now - lastFrameTime.current < fpsInterval || inflightRef.current) {
        return { isVerified: false, confidence: confidenceRef.current, stage: 'wetness' };
      }
      lastFrameTime.current = now;
      inflightRef.current = true;

      try {
        const bounds = faceBoundsRef.current;
        let score = 0;
        let dark = false;

        if (bounds) {
          const decoded = await cropAndDecode(photoUri, photoWidth, photoHeight, bounds, CROP_SIZE);
          if (decoded) {
            const metrics = computeWetnessMetrics(decoded.rgb, CROP_SIZE);
            setLastMetrics(metrics);
            dark = metrics.meanLuminance < LOW_LIGHT_SOFT;
            // only a truly unusable frame zeroes the score; dim-but-visible
            // frames are still scored while the UI asks for more light
            score = metrics.meanLuminance < LOW_LIGHT_HARD
              ? 0
              : scoreWetness(metrics, dryBaselineRef.current);
            console.log(
              `[wetness] score=${score.toFixed(3)} spec=${metrics.specularRatio.toFixed(4)} glints=${metrics.glintCount.toFixed(2)} desat=${metrics.highlightDesaturation.toFixed(3)} edge=${metrics.edgeEnergy.toFixed(3)} lum=${metrics.meanLuminance.toFixed(0)} skinSat=${metrics.skinSaturation.toFixed(3)} | dry spec=${dryBaselineRef.current.specularRatio.toFixed(4)} glints=${dryBaselineRef.current.glintCount.toFixed(2)}`
            );
          }
        } else {
          console.log('[wetness] no face in frame — score 0');
        }

        setLowLight(dark);
        confidenceRef.current = score;
        setConfidence(score);

        if (score >= threshold) {
          if (holdStartRef.current === null) {
            holdStartRef.current = now;
          } else if (now - holdStartRef.current >= HOLD_DURATION_MS) {
            return { isVerified: true, confidence: score, stage: 'done', lowLight: dark };
          }
        } else {
          holdStartRef.current = null;
        }

        return { isVerified: false, confidence: score, stage: 'wetness', lowLight: dark };
      } finally {
        inflightRef.current = false;
      }
    },
    [threshold],
  );

  const setFaceBounds = useCallback((bounds: FaceBounds | null) => {
    faceBoundsRef.current = bounds;
  }, []);

  const reset = useCallback(() => {
    confidenceRef.current = 0;
    setConfidence(0);
    setLowLight(false);
    setLastMetrics(null);
    holdStartRef.current = null;
    lastFrameTime.current = 0;
    faceBoundsRef.current = null;
  }, []);

  return {
    confidence,
    threshold,
    lowLight,
    lastMetrics,
    // wetness is now physics-based; no model to load
    modelState: 'ready' as const,
    processFrame,
    setFaceBounds,
    setDryBaseline,
    reset,
  };
}
