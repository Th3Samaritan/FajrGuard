declare function require(path: string): number;

import { cropFaceRegion, FaceBounds } from './faceDetector';

const FACENET_INPUT_SIZE = 160;
const EMBEDDING_DIM = 512;

let tfliteAvailable = true;

async function getFastTflite(): Promise<any> {
  try {
    return await import('react-native-fast-tflite');
  } catch {
    tfliteAvailable = false;
    return null;
  }
}

export async function loadFaceNetModel(): Promise<any> {
  const tflite = await getFastTflite();
  if (!tflite) return null;

  try {
    return await tflite.loadTensorflowModel(
      require('../assets/models/facenet_mobile.tflite'),
      []
    );
  } catch {
    return null;
  }
}

function normalizeFaceNet(rgb: Uint8Array, size: number): Float32Array {
  const tensor = new Float32Array(size * size * 3);
  for (let i = 0; i < rgb.length; i++) {
    tensor[i] = (rgb[i] - 127.5) / 128.0;
  }
  return tensor;
}

export async function extractFaceNetEmbedding(
  frameData: Uint8Array,
  frameWidth: number,
  frameHeight: number,
  faceBounds: FaceBounds,
): Promise<number[] | null> {
  const model = await loadFaceNetModel();
  if (!model) return null;

  const faceCrop = cropFaceRegion(frameData, frameWidth, frameHeight, FACENET_INPUT_SIZE, faceBounds);
  if (!faceCrop) return null;

  const tensor = normalizeFaceNet(faceCrop, FACENET_INPUT_SIZE);
  const inputBuf = (tensor.buffer.slice(tensor.byteOffset, tensor.byteOffset + tensor.byteLength) as ArrayBuffer);
  const outputs = model.runSync([inputBuf]);
  if (outputs.length > 0) {
    return Array.from(new Float32Array(outputs[0])).slice(0, EMBEDDING_DIM);
  }

  return null;
}

export function getEmbeddingDimension(): number {
  return EMBEDDING_DIM;
}

export function isTfliteAvailable(): boolean {
  return tfliteAvailable;
}
