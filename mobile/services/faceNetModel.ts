declare function require(path: string): number;

import { Asset } from 'expo-asset';
import { FaceBounds } from './faceDetector';
import { cropAndDecode } from './imageDecode';

const FACENET_INPUT_SIZE = 112;

let tfliteAvailable = true;
let cachedModel: any = null;
let cachedModelPromise: Promise<any> | null = null;
let lastLoadError: string | null = null;

async function getFastTflite(): Promise<any> {
  try {
    return await import('react-native-fast-tflite');
  } catch (e) {
    console.error('[faceNetModel] failed to import react-native-fast-tflite:', e);
    tfliteAvailable = false;
    return null;
  }
}

export async function loadFaceNetModel(): Promise<any> {
  if (cachedModel) return cachedModel;
  if (cachedModelPromise) return cachedModelPromise;

  cachedModelPromise = (async () => {
    const tflite = await getFastTflite();
    if (!tflite) return null;

    const loader = tflite.loadTensorflowModel ?? tflite.default?.loadTensorflowModel;
    if (!loader) {
      console.error('[faceNetModel] loadTensorflowModel export not found on react-native-fast-tflite');
      return null;
    }

    let modelUri: string;
    try {
      const asset = Asset.fromModule(require('../assets/models/facenet_mobile.tflite'));
      if (!asset.localUri) {
        await asset.downloadAsync();
      }
      if (!asset.localUri) {
        const msg = 'expo-asset returned no localUri';
        console.error('[faceNetModel]', msg);
        lastLoadError = msg;
        return null;
      }
      modelUri = asset.localUri;
      console.log('[faceNetModel] resolved asset uri:', modelUri);
    } catch (e: any) {
      const msg = `asset resolution failed: ${String(e?.message ?? e)}`;
      console.error('[faceNetModel]', msg);
      lastLoadError = msg;
      return null;
    }

    try {
      // delegates array is required by the Nitro spec; [] = default CPU delegate
      const model = await loader({ url: modelUri }, []);
      try {
        const inputs = (model as any)?.inputs;
        const outputs = (model as any)?.outputs;
        if (inputs?.[0]?.shape) {
          console.log('[faceNetModel] input shape:', inputs[0].shape);
        }
        if (outputs?.[0]?.shape) {
          console.log('[faceNetModel] output shape:', outputs[0].shape);
        }
      } catch {}
      cachedModel = model;
      lastLoadError = null;
      return model;
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      console.error('[faceNetModel] loadTensorflowModel threw:', msg);
      lastLoadError = msg;
      return null;
    }
  })();

  const model = await cachedModelPromise;
  if (!model) cachedModelPromise = null;
  return model;
}

function normalizeFaceNet(rgb: Uint8Array, size: number): Float32Array {
  const tensor = new Float32Array(size * size * 3);
  for (let i = 0; i < rgb.length; i++) {
    tensor[i] = (rgb[i] - 127.5) / 128.0;
  }
  return tensor;
}

export type EmbeddingFailure =
  | { ok: false; reason: 'model_load_failed'; detail?: string }
  | { ok: false; reason: 'image_decode_failed'; detail?: string }
  | { ok: false; reason: 'inference_failed'; detail?: string };
export type EmbeddingResult =
  | { ok: true; embedding: number[] }
  | EmbeddingFailure;

export async function loadFaceNetModelDiag(): Promise<{ model: any; error: string | null }> {
  const model = await loadFaceNetModel();
  return { model, error: lastLoadError };
}

export async function extractFaceNetEmbeddingDetailed(
  photoUri: string,
  photoWidth: number,
  photoHeight: number,
  faceBounds: FaceBounds,
): Promise<EmbeddingResult> {
  const model = await loadFaceNetModel();
  if (!model) {
    return { ok: false, reason: 'model_load_failed', detail: lastLoadError ?? 'unknown' };
  }

  let decoded;
  try {
    decoded = await cropAndDecode(photoUri, photoWidth, photoHeight, faceBounds, FACENET_INPUT_SIZE);
  } catch (e: any) {
    return { ok: false, reason: 'image_decode_failed', detail: String(e?.message ?? e) };
  }
  if (!decoded) {
    return { ok: false, reason: 'image_decode_failed', detail: `bounds=${JSON.stringify(faceBounds)} photo=${photoWidth}x${photoHeight}` };
  }

  const tensor = normalizeFaceNet(decoded.rgb, FACENET_INPUT_SIZE);
  const inputBuf = tensor.buffer.slice(tensor.byteOffset, tensor.byteOffset + tensor.byteLength) as ArrayBuffer;

  try {
    const outputs = model.runSync([inputBuf]);
    if (!outputs?.length) {
      return { ok: false, reason: 'inference_failed', detail: 'no outputs returned' };
    }
    return { ok: true, embedding: Array.from(new Float32Array(outputs[0])) };
  } catch (e: any) {
    console.error('[faceNetModel] runSync threw:', e);
    return { ok: false, reason: 'inference_failed', detail: String(e?.message ?? e) };
  }
}

export async function extractFaceNetEmbedding(
  photoUri: string,
  photoWidth: number,
  photoHeight: number,
  faceBounds: FaceBounds,
): Promise<number[] | null> {
  const result = await extractFaceNetEmbeddingDetailed(photoUri, photoWidth, photoHeight, faceBounds);
  return result.ok ? result.embedding : null;
}

export function isTfliteAvailable(): boolean {
  return tfliteAvailable;
}
