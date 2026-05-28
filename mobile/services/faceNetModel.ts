declare function require(path: string): number;

import { detectFaces, cropFaceRegion } from './faceDetector';

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

function cropCenterFace(
  frameData: Uint8Array, frameWidth: number, frameHeight: number, targetSize: number
): Uint8Array {
  const cropW = Math.min(frameWidth, frameHeight);
  const offsetX = Math.floor((frameWidth - cropW) / 2);
  const offsetY = Math.floor((frameHeight - cropW) / 2);
  const result = new Uint8Array(targetSize * targetSize * 3);
  const scaleX = cropW / targetSize;
  const scaleY = cropW / targetSize;

  for (let dy = 0; dy < targetSize; dy++) {
    const srcY = Math.min(offsetY + Math.floor(dy * scaleY), frameHeight - 1);
    const srcRowOff = srcY * frameWidth * 4;
    for (let dx = 0; dx < targetSize; dx++) {
      const srcX = Math.min(offsetX + Math.floor(dx * scaleX), frameWidth - 1);
      const srcOff = srcRowOff + srcX * 4;
      const dstOff = (dy * targetSize + dx) * 3;
      result[dstOff] = frameData[srcOff];
      result[dstOff + 1] = frameData[srcOff + 1];
      result[dstOff + 2] = frameData[srcOff + 2];
    }
  }
  return result;
}

function normalizeFaceNet(rgb: Uint8Array, size: number): Float32Array {
  const tensor = new Float32Array(size * size * 3);
  for (let i = 0; i < rgb.length; i++) {
    tensor[i] = (rgb[i] - 127.5) / 128.0;
  }
  return tensor;
}

export async function extractFaceNetEmbedding(
  frameData: Uint8Array, frameWidth: number, frameHeight: number
): Promise<number[] | null> {
  const model = await loadFaceNetModel();
  if (!model) return null;

  const faceBounds = await detectFaces(frameData, frameWidth, frameHeight);
  if (!faceBounds) return null;

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
