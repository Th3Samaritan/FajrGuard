declare function require(path: string): number;

import { FaceBounds } from './faceDetector';
import { cropAndDecode } from './imageDecode';

const FACENET_INPUT_SIZE = 112;

let tfliteAvailable = true;
let cachedModel: any = null;
let cachedModelPromise: Promise<any> | null = null;

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

    try {
      const model = await loader(require('../assets/models/facenet_mobile.tflite'));
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
      return model;
    } catch (e) {
      console.error('[faceNetModel] loadTensorflowModel threw:', e);
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

export async function extractFaceNetEmbedding(
  photoUri: string,
  photoWidth: number,
  photoHeight: number,
  faceBounds: FaceBounds,
): Promise<number[] | null> {
  const model = await loadFaceNetModel();
  if (!model) return null;

  const decoded = await cropAndDecode(photoUri, photoWidth, photoHeight, faceBounds, FACENET_INPUT_SIZE);
  if (!decoded) return null;

  const tensor = normalizeFaceNet(decoded.rgb, FACENET_INPUT_SIZE);
  const inputBuf = tensor.buffer.slice(tensor.byteOffset, tensor.byteOffset + tensor.byteLength) as ArrayBuffer;

  try {
    const outputs = model.runSync([inputBuf]);
    if (!outputs?.length) return null;
    return Array.from(new Float32Array(outputs[0]));
  } catch (e) {
    console.error('[faceNetModel] runSync threw:', e);
    return null;
  }
}

export function isTfliteAvailable(): boolean {
  return tfliteAvailable;
}
