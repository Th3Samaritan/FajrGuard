import FaceDetection, { Face, FaceDetectionOptions } from '@react-native-ml-kit/face-detection';

export interface FaceBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

let cachedBounds: FaceBounds | null = null;

const defaultOptions: FaceDetectionOptions = {
  performanceMode: 'fast',
  landmarkMode: 'none',
  contourMode: 'none',
  classificationMode: 'none',
  minFaceSize: 0.15,
};

export async function detectFaces(photoUri: string): Promise<FaceBounds | null> {
  try {
    const faces: Face[] = await FaceDetection.detect(photoUri, defaultOptions);
    if (faces && faces.length > 0) {
      const best = faces[0];
      cachedBounds = {
        x: best.frame.left,
        y: best.frame.top,
        width: best.frame.width,
        height: best.frame.height,
      };
      return cachedBounds;
    }
  } catch (e) {
    console.warn('ML Kit face detection failed:', String(e));
  }
  cachedBounds = null;
  return null;
}

export function getLastFaceBounds(): FaceBounds | null {
  return cachedBounds;
}

export function clearFaceBounds(): void {
  cachedBounds = null;
}

export function cropFaceRegion(
  frameData: Uint8Array,
  frameWidth: number,
  frameHeight: number,
  targetSize: number,
  faceBounds: FaceBounds,
): Uint8Array | null {
  const padX = faceBounds.width * 0.15;
  const padY = faceBounds.height * 0.15;

  let srcX = Math.floor(Math.max(0, faceBounds.x - padX));
  let srcY = Math.floor(Math.max(0, faceBounds.y - padY));
  let srcW = Math.floor(faceBounds.width + padX * 2);
  let srcH = Math.floor(faceBounds.height + padY * 2);

  srcX = Math.max(0, srcX);
  srcY = Math.max(0, srcY);
  srcW = Math.min(frameWidth - srcX, srcW);
  srcH = Math.min(frameHeight - srcY, srcH);

  if (srcW < 20 || srcH < 20) return null;

  const result = new Uint8Array(targetSize * targetSize * 3);
  const scaleX = srcW / targetSize;
  const scaleY = srcH / targetSize;

  for (let dy = 0; dy < targetSize; dy++) {
    const srcY2 = Math.min(srcY + Math.floor(dy * scaleY), frameHeight - 1);
    const srcRowOff = srcY2 * frameWidth * 4;
    const dstRowOff = dy * targetSize * 3;

    for (let dx = 0; dx < targetSize; dx++) {
      const srcX2 = Math.min(srcX + Math.floor(dx * scaleX), frameWidth - 1);
      const srcOff = srcRowOff + srcX2 * 4;
      const dstOff = dstRowOff + dx * 3;
      result[dstOff] = frameData[srcOff];
      result[dstOff + 1] = frameData[srcOff + 1];
      result[dstOff + 2] = frameData[srcOff + 2];
    }
  }

  return result;
}
