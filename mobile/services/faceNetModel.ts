declare function require(path: string): number;

const FACENET_INPUT_SIZE = 160;
const EMBEDDING_DIM = 512;
const FALLBACK_EMBEDDING_DIM = 4096;
const FALLBACK_SIZE = 64;

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

  if (model) {
    const faceCrop = cropCenterFace(frameData, frameWidth, frameHeight, FACENET_INPUT_SIZE);
    const tensor = normalizeFaceNet(faceCrop, FACENET_INPUT_SIZE);
    const inputBuf = (tensor.buffer.slice(tensor.byteOffset, tensor.byteOffset + tensor.byteLength) as ArrayBuffer);
    const outputs = model.runSync([inputBuf]);
    if (outputs.length > 0) {
      return Array.from(new Float32Array(outputs[0])).slice(0, EMBEDDING_DIM);
    }
  }

  return null;
}

function extractVisualFingerprint(
  frameData: Uint8Array, frameWidth: number, frameHeight: number
): number[] {
  const faceCrop = cropCenterFace(frameData, frameWidth, frameHeight, FALLBACK_SIZE);
  const pixelCount = FALLBACK_SIZE * FALLBACK_SIZE;
  const gray = new Float32Array(pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    const r = faceCrop[i * 3];
    const g = faceCrop[i * 3 + 1];
    const b = faceCrop[i * 3 + 2];
    gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  const sorted = Float32Array.from(gray).sort();
  const p2 = sorted[Math.floor(pixelCount * 0.02)];
  const p98 = sorted[Math.floor(pixelCount * 0.98)];
  const stretch = 255 / Math.max(p98 - p2, 1);
  for (let i = 0; i < pixelCount; i++) {
    gray[i] = Math.min(255, Math.max(0, (gray[i] - p2) * stretch));
  }

  const laplacian = new Float32Array(pixelCount);
  const KERNEL = [-1, -1, -1, -1, 8, -1, -1, -1, -1];
  for (let y = 1; y < FALLBACK_SIZE - 1; y++) {
    for (let x = 1; x < FALLBACK_SIZE - 1; x++) {
      let sum = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          sum += gray[(y + ky) * FALLBACK_SIZE + (x + kx)] * KERNEL[(ky + 1) * 3 + (kx + 1)];
        }
      }
      laplacian[y * FALLBACK_SIZE + x] = sum / 8;
    }
  }

  const features = new Float32Array(pixelCount * 2);
  for (let i = 0; i < pixelCount; i++) {
    features[i] = gray[i];
    features[pixelCount + i] = laplacian[i];
  }

  let mean = 0;
  for (let i = 0; i < features.length; i++) mean += features[i];
  mean /= features.length;

  let std = 0;
  for (let i = 0; i < features.length; i++) {
    const diff = features[i] - mean;
    std += diff * diff;
  }
  std = Math.sqrt(std / features.length) || 1;

  const norm = Array.from(features).map(v => (v - mean) / std);
  let sumSq = 0;
  for (const v of norm) sumSq += v * v;
  const scale = Math.sqrt(sumSq) || 1;
  return norm.map(v => v / scale);
}

export function getEmbeddingDimension(): number {
  return tfliteAvailable ? EMBEDDING_DIM : FALLBACK_EMBEDDING_DIM;
}

export function isTfliteAvailable(): boolean {
  return tfliteAvailable;
}
