import { useRef, useCallback, useState, useEffect } from 'react';
import { Asset } from 'expo-asset';
import { FaceBounds } from '../services/faceDetector';
import { cropAndDecode } from '../services/imageDecode';

declare function require(path: string): number;

interface WuduResult {
  isVerified: boolean;
  confidence: number;
  stage: 'identity' | 'wetness' | 'done';
}

const DEFAULT_THRESHOLD = 0.82;
const HOLD_DURATION_MS = 2500;
const INFERENCE_FPS = 5;
const MODEL_INPUT_SIZE = 224;

const IMAGENET_MEAN = [0.485, 0.456, 0.406];
const IMAGENET_STD = [0.229, 0.224, 0.225];

let cachedWuduModel: any = null;
let cachedWuduModelPromise: Promise<any> | null = null;

async function loadWuduModel(): Promise<any> {
  if (cachedWuduModel) return cachedWuduModel;
  if (cachedWuduModelPromise) return cachedWuduModelPromise;
  cachedWuduModelPromise = (async () => {
    try {
      const tflite = await import('react-native-fast-tflite');
      const loader = (tflite as any).loadTensorflowModel ?? (tflite as any).default?.loadTensorflowModel;
      if (!loader) {
        console.error('[wuduDetector] loadTensorflowModel export not found');
        return null;
      }
      const asset = Asset.fromModule(require('../assets/models/wudu_detector.tflite'));
      if (!asset.localUri) await asset.downloadAsync();
      if (!asset.localUri) {
        console.error('[wuduDetector] asset has no localUri');
        return null;
      }
      console.log('[wuduDetector] resolved asset uri:', asset.localUri);
      const model = await loader({ url: asset.localUri }, []);
      cachedWuduModel = model;
      return model;
    } catch (e) {
      console.error('[wuduDetector] failed to load model:', e);
      return null;
    }
  })();
  const m = await cachedWuduModelPromise;
  if (!m) cachedWuduModelPromise = null;
  return m;
}

function photometricWetnessScore(rgb: Uint8Array): number {
  if (!rgb || rgb.length === 0) return 0;
  let specularCount = 0;
  let totalPixels = 0;
  let totalSaturation = 0;

  for (let i = 0; i < rgb.length; i += 3) {
    const r = rgb[i];
    const g = rgb[i + 1];
    const b = rgb[i + 2];
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    if (gray > 220) specularCount++;
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const delta = maxC - minC;
    const saturation = maxC === 0 ? 0 : delta / maxC;
    totalSaturation += saturation;
    totalPixels++;
  }

  const specularRatio = specularCount / Math.max(totalPixels, 1);
  const avgSaturation = totalSaturation / Math.max(totalPixels, 1);
  return Math.min(1.0, specularRatio * 8.0 + avgSaturation * 0.3);
}

function preprocessCrop(rgb: Uint8Array, size: number): Float32Array {
  const tensor = new Float32Array(size * size * 3);
  for (let i = 0; i < rgb.length; i++) {
    const c = i % 3;
    tensor[i] = (rgb[i] / 255.0 - IMAGENET_MEAN[c]) / IMAGENET_STD[c];
  }
  return tensor;
}

export function useWuduDetector(threshold: number = DEFAULT_THRESHOLD) {
  const [confidence, setConfidence] = useState(0);
  const [modelState, setModelState] = useState<'loading' | 'ready' | 'fallback'>('loading');
  const modelRef = useRef<any>(null);
  const holdStartRef = useRef<number | null>(null);
  const lastFrameTime = useRef(0);
  const confidenceRef = useRef(0);
  const faceBoundsRef = useRef<FaceBounds | null>(null);
  const inflightRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    loadWuduModel().then((model) => {
      if (cancelled) return;
      if (model) {
        modelRef.current = model;
        setModelState('ready');
      } else {
        setModelState('fallback');
      }
    });
    return () => { cancelled = true; };
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

        if (bounds) {
          const decoded = await cropAndDecode(photoUri, photoWidth, photoHeight, bounds, MODEL_INPUT_SIZE);
          if (decoded) {
            if (modelRef.current && modelState === 'ready') {
              try {
                const tensor = preprocessCrop(decoded.rgb, MODEL_INPUT_SIZE);
                const inputBuf = tensor.buffer.slice(tensor.byteOffset, tensor.byteOffset + tensor.byteLength) as ArrayBuffer;
                const outputs = modelRef.current.runSync([inputBuf]);
                if (outputs?.length > 0) {
                  const outputData = new Float32Array(outputs[0]);
                  const wetIdx = outputData.length > 1 ? 1 : 0;
                  score = Math.min(1, Math.max(0, outputData[wetIdx]));
                } else {
                  score = photometricWetnessScore(decoded.rgb);
                }
              } catch (e) {
                console.warn('[wuduDetector] inference failed:', e);
                score = photometricWetnessScore(decoded.rgb);
              }
            } else {
              score = photometricWetnessScore(decoded.rgb);
            }
          }
        }

        confidenceRef.current = score;
        setConfidence(score);

        if (score >= threshold) {
          if (holdStartRef.current === null) {
            holdStartRef.current = now;
          } else if (now - holdStartRef.current >= HOLD_DURATION_MS) {
            return { isVerified: true, confidence: score, stage: 'done' };
          }
        } else {
          holdStartRef.current = null;
        }

        return { isVerified: false, confidence: score, stage: 'wetness' };
      } finally {
        inflightRef.current = false;
      }
    },
    [threshold, modelState],
  );

  const setFaceBounds = useCallback((bounds: FaceBounds | null) => {
    faceBoundsRef.current = bounds;
  }, []);

  const reset = useCallback(() => {
    confidenceRef.current = 0;
    setConfidence(0);
    holdStartRef.current = null;
    lastFrameTime.current = 0;
    faceBoundsRef.current = null;
  }, []);

  return { confidence, threshold, modelState, processFrame, setFaceBounds, reset };
}
