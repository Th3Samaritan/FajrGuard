import { useRef, useCallback, useState, useEffect } from 'react';

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

function photometricWetnessScore(frameData: Uint8Array, width: number, height: number): number {
  if (!frameData || frameData.length === 0) return 0;
  let specularCount = 0;
  let totalPixels = 0;
  let totalSaturation = 0;

  for (let i = 0; i < frameData.length; i += 4) {
    const r = frameData[i];
    const g = frameData[i + 1];
    const b = frameData[i + 2];
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

function resizeAndNormalize(
  src: Uint8Array, srcWidth: number, srcHeight: number,
  dstSize: number, mean: number[], std: number[],
): Float32Array {
  const dst = new Float32Array(dstSize * dstSize * 3);
  const scaleX = srcWidth / dstSize;
  const scaleY = srcHeight / dstSize;
  const srcStride = srcWidth * 4;

  for (let dy = 0; dy < dstSize; dy++) {
    const srcY = Math.min(dy * scaleY, srcHeight - 1);
    const y0 = Math.floor(srcY);
    const y1 = Math.min(y0 + 1, srcHeight - 1);
    const fy = srcY - y0;
    const row0Off = y0 * srcStride;
    const row1Off = y1 * srcStride;

    for (let dx = 0; dx < dstSize; dx++) {
      const srcX = Math.min(dx * scaleX, srcWidth - 1);
      const x0 = Math.floor(srcX);
      const x1 = Math.min(x0 + 1, srcWidth - 1);
      const fx = srcX - x0;
      const dstOff = (dy * dstSize + dx) * 3;

      for (let c = 0; c < 3; c++) {
        const p00 = src[row0Off + x0 * 4 + c];
        const p10 = src[row0Off + x1 * 4 + c];
        const p01 = src[row1Off + x0 * 4 + c];
        const p11 = src[row1Off + x1 * 4 + c];
        const top = p00 + (p10 - p00) * fx;
        const bottom = p01 + (p11 - p01) * fx;
        const val = top + (bottom - top) * fy;
        const normalized = (val / 255.0 - mean[c]) / std[c];
        dst[dstOff + c] = normalized;
      }
    }
  }
  return dst;
}

export function useWuduDetector(threshold: number = DEFAULT_THRESHOLD) {
  const [confidence, setConfidence] = useState(0);
  const [modelState, setModelState] = useState<'loading' | 'ready' | 'fallback'>('loading');
  const modelRef = useRef<any>(null);
  const holdStartRef = useRef<number | null>(null);
  const lastFrameTime = useRef(0);
  const confidenceRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function loadModel() {
      try {
        const tflite = await import('react-native-fast-tflite');
        const model = await tflite.loadTensorflowModel(
          require('../assets/models/wudu_detector.tflite'),
          []
        );
        if (!cancelled) {
          modelRef.current = model;
          setModelState('ready');
        }
      } catch (e) {
        if (!cancelled) {
          console.warn('TFLite unavailable, using photometric fallback:', String(e));
          setModelState('fallback');
        }
      }
    }

    loadModel();
    return () => { cancelled = true; };
  }, []);

  const preprocessToBuffer = useCallback((frameData: Uint8Array, width: number, height: number): ArrayBuffer => {
    const tensor = resizeAndNormalize(frameData, width, height, MODEL_INPUT_SIZE, IMAGENET_MEAN, IMAGENET_STD);
    return (tensor.buffer.slice(tensor.byteOffset, tensor.byteOffset + tensor.byteLength) as ArrayBuffer);
  }, []);

  const processFrame = useCallback((frameData: Uint8Array, width: number, height: number): WuduResult => {
    const now = Date.now();
    const fpsInterval = 1000 / INFERENCE_FPS;

    if (now - lastFrameTime.current < fpsInterval) {
      return { isVerified: false, confidence: confidenceRef.current, stage: 'wetness' };
    }
    lastFrameTime.current = now;

    let score: number;

    if (modelRef.current && modelState === 'ready') {
      try {
        const inputBuf = preprocessToBuffer(frameData, width, height);
        const outputs = modelRef.current.runSync([inputBuf]);
        if (outputs.length > 0) {
          const outputData = new Float32Array(outputs[0]);
          score = Math.min(1, Math.max(0, outputData[1]));
        } else {
          score = photometricWetnessScore(frameData, width, height);
        }
      } catch {
        score = photometricWetnessScore(frameData, width, height);
      }
    } else {
      score = photometricWetnessScore(frameData, width, height);
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
  }, [threshold, modelState, preprocessToBuffer]);

  const reset = useCallback(() => {
    confidenceRef.current = 0;
    setConfidence(0);
    holdStartRef.current = null;
    lastFrameTime.current = 0;
  }, []);

  return { confidence, threshold, modelState, processFrame, reset };
}
