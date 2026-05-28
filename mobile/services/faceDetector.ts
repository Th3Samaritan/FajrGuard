declare function require(path: string): number;

const INPUT_SIZE = 128;
const MIN_CONFIDENCE = 0.60;
const IOU_THRESHOLD = 0.3;

interface Anchor {
  cx: number;
  cy: number;
  w: number;
  h: number;
}

interface Detection {
  x: number;
  y: number;
  w: number;
  h: number;
  score: number;
}

let modelPromise: Promise<any> | null = null;
let anchors: Anchor[] | null = null;

export interface FaceBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

function generateAnchors(): Anchor[] {
  const result: Anchor[] = [];

  const stride8 = 8;
  const grid8 = INPUT_SIZE / stride8;
  for (let gy = 0; gy < grid8; gy++) {
    for (let gx = 0; gx < grid8; gx++) {
      const cx = (gx + 0.5) * stride8 / INPUT_SIZE;
      const cy = (gy + 0.5) * stride8 / INPUT_SIZE;
      const sizes = [1.0, Math.SQRT2];
      for (const s of sizes) {
        const w = s * stride8 / INPUT_SIZE;
        result.push({ cx, cy, w, h: w });
      }
    }
  }

  const stride16 = 16;
  const grid16 = INPUT_SIZE / stride16;
  for (let gy = 0; gy < grid16; gy++) {
    for (let gx = 0; gx < grid16; gx++) {
      const cx = (gx + 0.5) * stride16 / INPUT_SIZE;
      const cy = (gy + 0.5) * stride16 / INPUT_SIZE;
      const sizes = [1.0, Math.SQRT2, 1 / Math.SQRT2, 0.5, 2.0, 2 * Math.SQRT2];
      for (const s of sizes) {
        const w = s * stride16 / INPUT_SIZE;
        result.push({ cx, cy, w, h: w });
      }
    }
  }

  return result;
}

async function loadModel(): Promise<any> {
  if (modelPromise) return modelPromise;
  modelPromise = (async () => {
    try {
      const tflite = await import('react-native-fast-tflite');
      return await tflite.loadTensorflowModel(
        require('../assets/models/blazeface.tflite'),
        []
      );
    } catch {
      return null;
    }
  })();
  return modelPromise;
}

function cropResizeToInput(
  frameData: Uint8Array, frameWidth: number, frameHeight: number
): Uint8Array {
  const cropSize = Math.min(frameWidth, frameHeight);
  const offsetX = Math.floor((frameWidth - cropSize) / 2);
  const offsetY = Math.floor((frameHeight - cropSize) / 2);

  const result = new Uint8Array(INPUT_SIZE * INPUT_SIZE * 3);
  const scale = cropSize / INPUT_SIZE;
  const stride = frameWidth * 4;

  for (let dy = 0; dy < INPUT_SIZE; dy++) {
    const srcY = Math.min(offsetY + Math.floor(dy * scale), frameHeight - 1);
    const srcRow = srcY * stride;
    const dstRow = dy * INPUT_SIZE * 3;

    for (let dx = 0; dx < INPUT_SIZE; dx++) {
      const srcX = Math.min(offsetX + Math.floor(dx * scale), frameWidth - 1);
      const srcOff = srcRow + srcX * 4;
      const dstOff = dstRow + dx * 3;
      result[dstOff] = frameData[srcOff];
      result[dstOff + 1] = frameData[srcOff + 1];
      result[dstOff + 2] = frameData[srcOff + 2];
    }
  }
  return result;
}

function normalizeInput(rgb: Uint8Array): Float32Array {
  const out = new Float32Array(INPUT_SIZE * INPUT_SIZE * 3);
  for (let i = 0; i < rgb.length; i++) {
    out[i] = (rgb[i] - 127.5) / 128.0;
  }
  return out;
}

function decodeBox(
  regOffset: number, reg: Float32Array, anchor: Anchor
): Detection | null {
  const dx = reg[regOffset];
  const dy = reg[regOffset + 1];
  const dw = reg[regOffset + 2];
  const dh = reg[regOffset + 3];

  const cx = anchor.cx + dx * anchor.w;
  const cy = anchor.cy + dy * anchor.h;
  const w = anchor.w * Math.exp(dw);
  const h = anchor.h * Math.exp(dh);

  const x = cx - w / 2;
  const y = cy - h / 2;

  if (x < 0 || y < 0 || x + w > 1 || y + h > 1) return null;
  if (w <= 0.01 || h <= 0.01 || w >= 0.95 || h >= 0.95) return null;

  return { x, y, w, h, score: 0 };
}

function iou(a: Detection, b: Detection): number {
  const ax1 = a.x;
  const ay1 = a.y;
  const ax2 = a.x + a.w;
  const ay2 = a.y + a.h;
  const bx1 = b.x;
  const by1 = b.y;
  const bx2 = b.x + b.w;
  const by2 = b.y + b.h;

  const ix1 = Math.max(ax1, bx1);
  const iy1 = Math.max(ay1, by1);
  const ix2 = Math.min(ax2, bx2);
  const iy2 = Math.min(ay2, by2);
  const iw = Math.max(0, ix2 - ix1);
  const ih = Math.max(0, iy2 - iy1);
  const inter = iw * ih;
  if (inter <= 0) return 0;

  const areaA = a.w * a.h;
  const areaB = b.w * b.h;
  return inter / (areaA + areaB - inter);
}

function nms(detections: Detection[], iouThreshold: number): Detection[] {
  const sorted = [...detections].sort((a, b) => b.score - a.score);
  const kept: Detection[] = [];

  for (const det of sorted) {
    let overlaps = false;
    for (const k of kept) {
      if (iou(det, k) > iouThreshold) {
        overlaps = true;
        break;
      }
    }
    if (!overlaps) {
      kept.push(det);
    }
  }
  return kept;
}

export async function detectFaces(
  frameData: Uint8Array, frameWidth: number, frameHeight: number
): Promise<FaceBounds | null> {
  const model = await loadModel();
  if (!model) return null;

  if (!anchors) {
    anchors = generateAnchors();
  }

  const crop = cropResizeToInput(frameData, frameWidth, frameHeight);
  const tensor = normalizeInput(crop);
  const inputBuf = (tensor.buffer.slice(tensor.byteOffset, tensor.byteOffset + tensor.byteLength) as ArrayBuffer);

  let outputs: ArrayBuffer[];
  try {
    outputs = model.runSync([inputBuf]);
  } catch {
    return null;
  }

  if (outputs.length < 2) return null;

  const reg = new Float32Array(outputs[0]);
  const cls = new Float32Array(outputs[1]);

  const detections: Detection[] = [];
  for (let i = 0; i < anchors.length; i++) {
    const score = 1 / (1 + Math.exp(-cls[i]));
    if (score < MIN_CONFIDENCE) continue;

    const det = decodeBox(i * 16, reg, anchors[i]);
    if (det) {
      det.score = score;
      detections.push(det);
    }
  }

  const filtered = nms(detections, IOU_THRESHOLD);
  if (filtered.length === 0) return null;

  const best = filtered[0];
  return {
    x: best.x,
    y: best.y,
    width: best.w,
    height: best.h,
  };
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

  let srcX = Math.floor((faceBounds.x - padX) * frameWidth);
  let srcY = Math.floor((faceBounds.y - padY) * frameHeight);
  let srcW = Math.floor((faceBounds.width + padX * 2) * frameWidth);
  let srcH = Math.floor((faceBounds.height + padY * 2) * frameHeight);

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
