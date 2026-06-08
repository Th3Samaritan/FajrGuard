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
