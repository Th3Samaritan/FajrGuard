import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import jpeg from 'jpeg-js';
import { FaceBounds } from './faceDetector';

export interface DecodedImage {
  rgb: Uint8Array;
  width: number;
  height: number;
}

async function readFileAsBase64(uri: string): Promise<string> {
  const legacy: any = (FileSystem as any).readAsStringAsync;
  if (typeof legacy === 'function') {
    return legacy(uri, { encoding: 'base64' });
  }
  const FS: any = FileSystem as any;
  if (FS.File) {
    const file = new FS.File(uri);
    return file.base64();
  }
  throw new Error('expo-file-system: no base64 read API found');
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function rgbaToRgb(rgba: Uint8Array, width: number, height: number): Uint8Array {
  const out = new Uint8Array(width * height * 3);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) {
    out[j] = rgba[i];
    out[j + 1] = rgba[i + 1];
    out[j + 2] = rgba[i + 2];
  }
  return out;
}

export async function cropAndDecode(
  photoUri: string,
  photoWidth: number,
  photoHeight: number,
  faceBounds: FaceBounds,
  targetSize: number,
): Promise<DecodedImage | null> {
  const padX = faceBounds.width * 0.15;
  const padY = faceBounds.height * 0.15;
  const originX = Math.max(0, Math.floor(faceBounds.x - padX));
  const originY = Math.max(0, Math.floor(faceBounds.y - padY));
  const width = Math.min(photoWidth - originX, Math.floor(faceBounds.width + padX * 2));
  const height = Math.min(photoHeight - originY, Math.floor(faceBounds.height + padY * 2));

  if (width < 32 || height < 32) return null;

  let manipResult;
  try {
    manipResult = await ImageManipulator.manipulateAsync(
      photoUri,
      [
        { crop: { originX, originY, width, height } },
        { resize: { width: targetSize, height: targetSize } },
      ],
      { compress: 1, format: ImageManipulator.SaveFormat.JPEG, base64: true },
    );
  } catch (e) {
    console.error('[imageDecode] manipulateAsync failed:', e);
    return null;
  }

  let jpegBytes: Uint8Array;
  if (manipResult.base64) {
    jpegBytes = base64ToUint8(manipResult.base64);
  } else {
    try {
      const b64 = await readFileAsBase64(manipResult.uri);
      jpegBytes = base64ToUint8(b64);
    } catch (e) {
      console.error('[imageDecode] failed to read manipulated file:', e);
      return null;
    }
  }

  let decoded;
  try {
    decoded = jpeg.decode(jpegBytes, { useTArray: true, formatAsRGBA: true });
  } catch (e) {
    console.error('[imageDecode] jpeg.decode failed:', e);
    return null;
  }

  return {
    rgb: rgbaToRgb(decoded.data, decoded.width, decoded.height),
    width: decoded.width,
    height: decoded.height,
  };
}
